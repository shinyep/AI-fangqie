<template>
  <main class="page">
    <header class="topbar">
      <div>
        <h1 class="title">模型路由管理</h1>
        <p class="subtitle">为不同写作任务选择默认服务商和模型</p>
      </div>
      <van-button size="small" @click="$router.push('/ai-settings')">
        <van-icon name="arrow-left" /> 返回
      </van-button>
    </header>

    <div v-if="loading" class="loading-wrap">
      <van-loading size="24" color="var(--brand)" />
      <span>加载路由配置...</span>
    </div>

    <template v-else>
      <!-- 快速套用 -->
      <section class="section">
        <div class="panel bulk-panel">
          <h3 class="panel-title">快速套用模型</h3>
          <p class="panel-desc">将选定模型一次性应用到所有任务，然后保存</p>
          <div class="bulk-form">
            <van-field
              v-model="bulk.provider"
              label="厂商"
              placeholder="deepseek"
              clearable
            />
            <van-field
              v-model="bulk.model"
              label="模型"
              placeholder="deepseek-v4-flash"
              clearable
            />
          </div>
          <div class="bulk-actions">
            <van-button size="small" type="primary" @click="applyBulk">套用到全部任务</van-button>
            <van-button size="small" plain :loading="savingAll" @click="saveAllRoutes">保存全部修改 ({{ dirtyCount }})</van-button>
          </div>
        </div>
      </section>

      <!-- 任务路由列表 -->
      <section class="section">
        <h2 class="section-title">
          任务路由
          <span class="count-badge">{{ taskRoutes.length }}</span>
        </h2>

        <div class="route-cards">
          <article
            v-for="r in taskRoutes"
            :key="r.taskType"
            class="route-card"
            :class="{ 'is-dirty': isDirty(r.taskType) }"
          >
            <header class="route-card-header">
              <div class="route-task-info">
                <strong>{{ taskLabels[r.taskType] || r.taskType }}</strong>
                <p>{{ taskDescs[r.taskType] || '' }}</p>
              </div>
              <van-tag v-if="isDirty(r.taskType)" type="warning" size="small">待保存</van-tag>
            </header>

            <div class="route-card-body">
              <div class="route-form-row">
                <van-field
                  v-model="getDraft(r.taskType).provider"
                  label="厂商"
                  placeholder="deepseek"
                  clearable
                  class="compact-field"
                />
                <van-field
                  v-model="getDraft(r.taskType).model"
                  label="模型"
                  placeholder="deepseek-v4-flash"
                  clearable
                  class="compact-field"
                />
              </div>
              <div class="route-form-row">
                <van-field
                  v-model.number="getDraft(r.taskType).temperature"
                  label="温度"
                  placeholder="0.7"
                  type="number"
                  class="compact-field"
                />
                <van-field
                  v-model.number="getDraft(r.taskType).maxTokens"
                  label="最大Token"
                  placeholder="4096"
                  type="number"
                  class="compact-field"
                />
              </div>
            </div>

            <footer class="route-card-footer">
              <van-button size="small" type="primary" @click="saveRoute(r.taskType)">
                保存路由
              </van-button>
            </footer>
          </article>
        </div>
      </section>
    </template>
  </main>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { showToast, showSuccessToast } from 'vant';
import { fetchModelRoutes, updateModelRoute } from '../api/aiSettings.js';

const taskLabels = {
  chapter_analysis: '章节内容分析',
  title_analysis: '标题推测分析',
  writing_generate: '文本生成',
  writing_continue: '续写',
  writing_expand: '扩写/润色/缩写',
  chapter_summary: '章节摘要',
  chat: '通用对话',
  default: '默认',
};

const taskDescs = {
  chapter_analysis: '分析章节关键事件、角色、冲突和钩子',
  title_analysis: '根据标题推测章节内容和结构',
  writing_generate: '根据设定生成小说正文',
  writing_continue: '根据前文无缝续写',
  writing_expand: '扩写丰富、润色优化或精简提炼',
  chapter_summary: '生成章节核心概要',
  chat: '通用AI对话',
  default: '未指定任务类型的回退路由',
};

// ========== 状态 ==========

const loading = ref(true);
const savingAll = ref(false);
const taskRoutes = ref([]);
const drafts = reactive({});
const savedRoutes = reactive({});

const bulk = reactive({ provider: '', model: '' });

// ========== 计算 ==========

const dirtyCount = ref(0);

function isDirty(taskType) {
  const draft = drafts[taskType];
  const saved = savedRoutes[taskType];
  if (!draft || !saved) return false;
  return (
    draft.provider !== saved.provider ||
    draft.model !== saved.model ||
    draft.temperature !== saved.temperature ||
    draft.maxTokens !== saved.maxTokens
  );
}

function updateDirtyCount() {
  let count = 0;
  for (const r of taskRoutes.value) {
    if (isDirty(r.taskType)) count++;
  }
  dirtyCount.value = count;
}

// ========== 草稿管理 ==========

function initDraft(r) {
  const d = {
    provider: r.provider || '',
    model: r.model || '',
    temperature: r.temperature ?? 0.7,
    maxTokens: r.maxTokens ?? 4096,
  };
  drafts[r.taskType] = reactive(d);
  savedRoutes[r.taskType] = { ...d };
}

function getDraft(taskType) {
  if (!drafts[taskType]) {
    drafts[taskType] = reactive({ provider: '', model: '', temperature: 0.7, maxTokens: 4096 });
    savedRoutes[taskType] = { ...drafts[taskType] };
  }
  return drafts[taskType];
}

// ========== 数据加载 ==========

onMounted(async () => {
  try {
    const data = await fetchModelRoutes();
    const routes = data?.routes || data || [];
    taskRoutes.value = routes;
    routes.forEach(r => initDraft(r));
  } catch (e) {
    showToast('加载失败: ' + (e.message || '未知错误'));
  } finally {
    loading.value = false;
  }
});

// ========== 操作 ==========

function applyBulk() {
  if (!bulk.provider && !bulk.model) {
    showToast('请至少填写厂商或模型');
    return;
  }
  for (const r of taskRoutes.value) {
    const d = getDraft(r.taskType);
    if (bulk.provider) d.provider = bulk.provider;
    if (bulk.model) d.model = bulk.model;
  }
  updateDirtyCount();
  showSuccessToast('已套用到全部任务');
}

async function saveRoute(taskType) {
  const d = getDraft(taskType);
  try {
    await updateModelRoute({
      taskType,
      provider: d.provider || undefined,
      model: d.model || undefined,
      temperature: d.temperature ?? undefined,
      maxTokens: d.maxTokens ?? undefined,
    });
    savedRoutes[taskType] = { ...d };
    updateDirtyCount();
    showSuccessToast('保存成功');
  } catch (e) {
    showToast('保存失败: ' + (e.message || '未知错误'));
  }
}

async function saveAllRoutes() {
  savingAll.value = true;
  let saved = 0;
  let failed = 0;
  for (const r of taskRoutes.value) {
    if (!isDirty(r.taskType)) continue;
    try {
      const d = getDraft(r.taskType);
      await updateModelRoute({
        taskType: r.taskType,
        provider: d.provider || undefined,
        model: d.model || undefined,
        temperature: d.temperature ?? undefined,
        maxTokens: d.maxTokens ?? undefined,
      });
      savedRoutes[r.taskType] = { ...d };
      saved++;
    } catch {
      failed++;
    }
  }
  updateDirtyCount();
  savingAll.value = false;
  if (failed === 0) {
    showSuccessToast(`已保存 ${saved} 条路由`);
  } else {
    showToast(`已保存 ${saved} 条，${failed} 条失败`);
  }
}
</script>

<style scoped>
.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 60px 0;
  color: var(--muted);
  font-size: 14px;
}

.count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 11px;
  background: var(--brand-soft);
  color: var(--brand);
  font-size: 12px;
  font-weight: 700;
  margin-left: 6px;
}

/* 面板 */
.panel {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 16px;
}

.bulk-panel {
  display: grid;
  gap: 12px;
}

.panel-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
}

.panel-desc {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}

.bulk-form {
  display: grid;
  gap: 4px;
}

.bulk-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* 路由卡片 */
.route-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 12px;
}

@media (max-width: 740px) {
  .route-cards {
    grid-template-columns: 1fr;
  }
}

.route-card {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: box-shadow 0.15s;
}

.route-card:hover {
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}

.route-card.is-dirty {
  border-color: var(--warning);
  background: #fffdf5;
}

.route-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.route-task-info strong {
  display: block;
  font-size: 14px;
  font-weight: 700;
}

.route-task-info p {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--muted);
}

.route-card-body {
  display: grid;
  gap: 4px;
}

.route-form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
}

.route-card-footer {
  display: flex;
  gap: 8px;
}
</style>
