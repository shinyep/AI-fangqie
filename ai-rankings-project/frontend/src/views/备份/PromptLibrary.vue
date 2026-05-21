<template>
  <main class="page">
    <header class="topbar">
      <div>
        <h1 class="title">提示词库</h1>
        <p class="subtitle">数万条专业网文提示词，覆盖创作全环节</p>
      </div>
      <van-button icon="plus" size="small" type="primary" @click="showCreate = true">新增</van-button>
    </header>

    <van-search v-model="keyword" placeholder="搜索提示词..." shape="round" @search="doSearch" />

    <section class="label-tree">
      <div class="label-filter-bar">
        <button class="label-chip" :class="{ active: !showFavorites && activeLabelId === 0 }" @click="showFavorites = false; activeLabelId = 0; loadPrompts()">全部</button>
        <template v-for="label in flatLabels" :key="label.id">
          <span v-if="label.isHeader" class="label-header">{{ label.name }}</span>
          <button
            v-else
            class="label-chip"
            :class="{ active: !showFavorites && activeLabelId === label.id }"
            @click="showFavorites = false; activeLabelId = label.id; loadPrompts()"
          >{{ label.name }}</button>
        </template>
        <button class="label-chip favorite-chip" :class="{ active: showFavorites }" @click="showFavorites = true; loadPrompts()">
          ❤ 我的收藏 ({{ favoriteIds.size }})
        </button>
      </div>
    </section>

    <section class="prompt-list">
      <div v-for="item in displayedPrompts" :key="item.id" class="prompt-card" @click="viewPrompt(item)">
        <div class="prompt-head">
          <strong>{{ item.title }}</strong>
          <div class="prompt-badges">
            <van-tag v-if="!item.is_public" size="mini" type="warning" plain>私有</van-tag>
            <van-tag size="mini" plain>{{ item.category }}</van-tag>
          </div>
        </div>
        <div class="prompt-content-box">
          <pre>{{ item.content }}</pre>
        </div>
        <div class="prompt-footer">
          <div class="footer-left">
            <span>{{ item.usage_count || 0 }}次使用</span>
            <span v-if="item.favorite_count" class="fav-count">❤ {{ item.favorite_count }}</span>
          </div>
          <button class="fav-btn" :class="{ faved: favoriteIds.has(item.id) }" @click.stop="toggleFav(item)">
            {{ favoriteIds.has(item.id) ? "❤" : "♡" }}
          </button>
        </div>
      </div>
      <div v-if="!displayedPrompts.length" class="empty">{{ showFavorites ? "还没有收藏提示词" : "暂无提示词" }}</div>
    </section>

    <van-overlay :show="!!selected" @click="selected = null">
      <div v-if="selected" class="detail-popup" @click.stop>
        <h2>{{ selected.title }}</h2>
        <div class="detail-meta">
          <van-tag v-if="!selected.is_public" size="mini" type="warning" plain>私有</van-tag>
          <van-tag size="mini" type="primary" plain>{{ selected.category }}</van-tag>
          <van-tag v-for="tag in selected.tags" :key="tag" size="mini" plain>{{ tag }}</van-tag>
          <span class="usage">已使用 {{ selected.usage_count || 0 }} 次 · ❤ {{ selected.favorite_count || 0 }}</span>
        </div>
        <pre class="detail-content">{{ selected.content }}</pre>
        <div class="detail-actions">
          <van-button size="small" icon="description-o" @click="copyPrompt(selected)">复制</van-button>
          <van-button size="small" :icon="favoriteIds.has(selected.id) ? 'good-job-o' : 'like-o'" @click="toggleFav(selected)">{{ favoriteIds.has(selected.id) ? '已收藏' : '收藏' }}</van-button>
          <van-button size="small" type="primary" @click="usePrompt(selected)">使用此提示词</van-button>
          <van-button size="small" icon="delete-o" v-if="selected.author !== '系统'" @click="deletePrompt(selected.id)">删除</van-button>
        </div>
        <van-button block class="close-btn" @click="selected = null">关闭</van-button>
      </div>
    </van-overlay>

    <van-overlay :show="showCreate" @click="showCreate = false">
      <div class="create-popup" @click.stop>
        <h2>新增提示词</h2>
        <van-field v-model="createForm.title" label="标题" placeholder="提示词名称" />
        <van-field v-model="createForm.content" label="内容" placeholder="提示词内容，用 {variable} 表示变量" type="textarea" rows="4" />
        <van-field v-model="createForm.category" label="分类" placeholder="选择使用场景" readonly clickable @click="showCategoryPicker = true" />
        <van-field v-model="createForm.tagsStr" label="标签" placeholder="逗号分隔，如：续写,开篇" />
        <div class="field-row">
          <span class="field-label">公开分享</span>
          <van-switch v-model="createForm.isPublic" size="20px" />
          <span class="field-hint">{{ createForm.isPublic ? '所有人可见' : '仅自己可见' }}</span>
        </div>
        <van-button type="primary" block :loading="creating" @click="doCreate">保存</van-button>
        <van-button block class="close-btn" @click="showCreate = false">取消</van-button>
      </div>
    </van-overlay>

    <van-action-sheet v-model:show="showCategoryPicker" title="选择使用场景" :actions="categoryOptions" @select="onCategorySelect" />
  </main>
</template>


<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { showToast, showSuccessToast, showConfirmDialog } from 'vant';
import { fetchCategories, fetchPrompts, fetchPromptDetail, createPrompt, deletePrompt as deletePromptApi, toggleFavorite, fetchLabels } from '../api/prompts.js';

const router = useRouter();

const categories = ref([]);
const labels = ref([]);
const activeLabelId = ref(0);
const activeCategory = ref('');
const keyword = ref('');
const prompts = ref([]);
const selected = ref(null);
const showCreate = ref(false);
const showFavorites = ref(false);
const showCategoryPicker = ref(false);
const creating = ref(false);
const favoriteIds = ref(new Set(JSON.parse(localStorage.getItem('favoritePrompts') || '[]')));
const createForm = reactive({ title: '', content: '', category: '通用工具', tagsStr: '', isPublic: true });

const flatLabels = computed(() => {
  const result = [];
  function walk(nodes, depth) {
    for (const node of nodes) {
      if (depth === 0 && node.children && node.children.length) {
        result.push({ id: -node.id, name: node.name, isHeader: true });
        walk(node.children, depth + 1);
      } else if (depth > 0) {
        result.push({ id: node.id, name: node.name, isHeader: false });
        if (node.children && node.children.length) walk(node.children, depth + 1);
      }
    }
  }
  if (labels.value && labels.value.length) walk(labels.value, 0);
  return result;
});

const categoryOptions = computed(() => categories.value.map(c => ({ name: c, value: c })));

const displayedPrompts = computed(() => {
  if (!showFavorites.value) return prompts.value;
  return prompts.value.filter(p => favoriteIds.value.has(p.id));
});

async function loadPrompts() {
  const params = {};
  if (activeCategory.value) params.category = activeCategory.value;
  if (activeLabelId.value) params.label_id = activeLabelId.value;
  if (keyword.value.trim()) params.keyword = keyword.value.trim();
  prompts.value = await fetchPrompts(params);
}

async function doSearch() {
  activeCategory.value = '';
  await loadPrompts();
}

async function viewPrompt(item) {
  try {
    selected.value = await fetchPromptDetail(item.id);
  } catch {
    selected.value = item;
  }
}

async function copyPrompt(item) {
  try {
    await navigator.clipboard.writeText(item.content);
    showSuccessToast('已复制提示词');
  } catch { showToast('复制失败'); }
}

async function toggleFav(item) {
  const id = item.id;
  const newSet = new Set(favoriteIds.value);
  if (newSet.has(id)) {
    newSet.delete(id);
  } else {
    newSet.add(id);
    try { await toggleFavorite(id); } catch { /* fire and forget */ }
  }
  favoriteIds.value = newSet;
  localStorage.setItem('favoritePrompts', JSON.stringify([...newSet]));
  // update item locally so the count refreshes
  const found = prompts.value.find(p => p.id === id);
  if (found) found.favorite_count = (found.favorite_count || 0) + (newSet.has(id) ? 1 : -1);
}

function usePrompt(item) {
  // 跳转到写作页面，携带提示词作为参考（存储到 localStorage 供写作页读取）
  localStorage.setItem('activePrompt', JSON.stringify({ title: item.title, content: item.content }));
  selected.value = null;
  router.push('/writing');
  showToast('提示词已加载到写作工作台');
}

async function deletePrompt(id) {
  try {
    await showConfirmDialog({ title: '确认删除', message: '确定删除此提示词吗？' });
    await deletePromptApi(id);
    selected.value = null;
    await loadPrompts();
    showSuccessToast('已删除');
  } catch { /* cancelled */ }
}

function onCategorySelect(action) {
  createForm.category = action.value;
  showCategoryPicker.value = false;
}

async function doCreate() {
  if (!createForm.title.trim() || !createForm.content.trim()) {
    showToast('标题和内容不能为空');
    return;
  }
  creating.value = true;
  try {
    await createPrompt({
      title: createForm.title.trim(),
      content: createForm.content.trim(),
      category: createForm.category.trim() || '通用',
      tags: createForm.tagsStr.split(',').map((s) => s.trim()).filter(Boolean),
      is_public: createForm.isPublic,
    });
    showSuccessToast('创建成功');
    showCreate.value = false;
    createForm.title = '';
    createForm.content = '';
    createForm.category = '通用工具';
    createForm.tagsStr = '';
    createForm.isPublic = true;
    await loadPrompts();
  } catch (e) {
    showToast('创建失败: ' + (e.message || '未知错误'));
  } finally {
    creating.value = false;
  }
}

onMounted(async () => {
  try { categories.value = await fetchCategories() } catch { categories.value = [] }
  try { labels.value = await fetchLabels(); } catch { labels.value = []; }
  await loadPrompts();
});
</script>

<style scoped>
.label-tree {
  margin: 4px 0 0;
}

.label-filter-bar {
  display: flex;
  gap: 6px;
  padding: 4px 0 0;
  overflow-x: auto;
  flex-wrap: nowrap;
  -webkit-overflow-scrolling: touch;
  align-items: center;
}

.label-chip {
  flex-shrink: 0;
  height: 30px;
  padding: 0 14px;
  border: 1px solid #dfe3eb;
  border-radius: 15px;
  background: #fff;
  color: #374151;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.label-chip.active {
  border-color: #16a05d;
  background: #e9fff3;
  color: #16a05d;
  font-weight: 600;
}

.label-header {
  flex-shrink: 0;
  height: 30px;
  padding: 0 6px;
  font-size: 11px;
  color: #999;
  font-weight: 600;
  display: flex;
  align-items: center;
  letter-spacing: 0.5px;
}

.label-header::before {
  content: '';
  display: inline-block;
  width: 3px;
  height: 14px;
  background: #dfe3eb;
  border-radius: 1px;
  margin-right: 6px;
}

.favorite-chip {
  margin-left: 8px;
  border-color: #ff8a00;
}

.category-strip {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 4px 0;
  flex-wrap: wrap;
}





.prompt-list {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.prompt-card {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.prompt-card:active { border-color: var(--accent); }

.prompt-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.prompt-head strong { font-size: 15px; }

.prompt-content-box {
  margin: 6px 0;
  padding: 8px 10px;
  max-height: 160px;
  overflow-y: auto;
  background: #fafafa;
  border: 1px solid #eee;
  border-radius: 6px;
}

.prompt-content-box pre {
  margin: 0;
  font-size: 12px;
  color: var(--ink);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
}



.prompt-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: 12px;
  color: var(--muted);
}

.use-btn { color: var(--accent); font-weight: 600; }

.empty { text-align: center; color: var(--muted); padding: 30px 0; font-size: 14px; }

/* 详情弹窗 */
.detail-popup, .create-popup {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: min(520px, calc(100vw - 32px));
  max-height: 80vh;
  overflow-y: auto;
  overflow-x: hidden;
  word-break: break-word;
  overflow-wrap: break-word;
  background: #fff;
  border-radius: 16px 16px 0 0;
  padding: 20px 16px;
}

.detail-popup h2, .create-popup h2 { margin: 0 0 10px; font-size: 17px; }

.detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-bottom: 12px;
}

.usage { font-size: 12px; color: var(--muted); margin-left: auto; }

.detail-content {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 12px;
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: break-word;
  font-family: inherit;
  margin: 0;
}

.detail-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.close-btn {
  margin-top: 8px;
}

.create-popup {
  display: grid;
  gap: 10px;
}

.prompt-badges {
  display: flex;
  gap: 4px;
  align-items: center;
}

.prompt-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-left {
  display: flex;
  gap: 8px;
  align-items: center;
}

.fav-count {
  font-size: 11px;
  color: #e74c3c;
}

.fav-btn {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
  transition: transform 0.15s;
  color: #ccc;
}

.fav-btn.faved {
  color: #e74c3c;
}

.fav-btn:active { transform: scale(1.2); }



.favorite-tab.active {
  background: #e74c3c;
  color: #fff;
  border-color: #e74c3c;
}

.field-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 4px;
}

.field-label {
  font-size: 13px;
  color: var(--ink);
  font-weight: 500;
}

.field-hint {
  font-size: 11px;
  color: var(--muted);
}

@media (max-width: 640px) {
  .detail-popup, .create-popup {
    left: 0;
    right: 0;
    transform: none;
    width: auto;
  }
}
</style>
