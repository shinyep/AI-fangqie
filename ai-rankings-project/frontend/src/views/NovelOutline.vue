<template>
  <main class="page">
    <header class="topbar">
      <div>
        <h1 class="title">章节细纲</h1>
        <p class="subtitle">粘贴章节文本，AI自动生成结构化拆解</p>
      </div>
    </header>

    <!-- 模式切换 -->
    <section class="section mode-tabs">
      <van-button
        :type="mode === 'paste' ? 'primary' : 'default'"
        size="small"
        @click="mode = 'paste'"
      >
        粘贴文本
      </van-button>
      <van-button
        :type="mode === 'url' ? 'primary' : 'default'"
        size="small"
        @click="mode = 'url'"
      >
        链接抓取
      </van-button>
    </section>

    <!-- 粘贴文本模式 -->
    <section v-if="mode === 'paste'" class="section form-panel">
      <van-field
        v-model="pasteNovelTitle"
        label="书名"
        placeholder="输入小说名称（可选）"
        clearable
      />

      <div class="chapters-editor">
        <div class="chapters-header">
          <span>章节列表（{{ chapterInputs.length }}章）</span>
          <van-button size="mini" icon="add-o" @click="addChapter">添加章节</van-button>
        </div>

        <div v-for="(ch, idx) in chapterInputs" :key="idx" class="chapter-input-block">
          <div class="chapter-input-head">
            <span>第{{ idx + 1 }}章</span>
            <van-icon
              v-if="chapterInputs.length > 1"
              name="delete-o"
              class="del-btn"
              @click="removeChapter(idx)"
            />
          </div>
          <input
            v-model="ch.title"
            class="chapter-title-input"
            placeholder="章节标题（可选）"
          />
          <textarea
            v-model="ch.content"
            class="chapter-content-input"
            :placeholder="'粘贴第' + (idx + 1) + '章正文内容...'"
            rows="8"
          />
          <div class="char-count" v-if="ch.content">
            {{ ch.content.length }} 字
          </div>
        </div>
      </div>

      <van-button
        type="primary"
        block
        :loading="loading"
        :disabled="!hasContent"
        @click="analyze"
      >
        AI分析生成细纲
      </van-button>
    </section>

    <!-- URL抓取模式 -->
    <section v-if="mode === 'url'" class="section form-panel">
      <van-field
        v-model="sourceUrl"
        label="URL"
        placeholder="输入小说目录页链接（抓取可能不稳定）"
        clearable
      />
      <van-stepper v-model="maxChapters" min="1" max="30" integer />
      <van-button type="primary" block :loading="loading" @click="crawlUrl">
        抓取并生成细纲
      </van-button>
    </section>

    <!-- 结果展示 -->
    <section v-if="result" class="section">
      <h2 class="section-title">{{ result.novel_title }}</h2>
      <div class="result-actions-bar">
        <van-button size="small" type="primary" icon="add-o" @click="goImport">
          导入为新作品
        </van-button>
        <van-button size="small" icon="notes-o" @click="$router.push('/saved-outlines')">
          查看已保存
        </van-button>
      </div>
      <div class="outline-list">
        <article v-for="chapter in result.chapters" :key="chapter.index" class="outline-card">
          <div class="outline-head">
            <span class="rank">#{{ chapter.index }}</span>
            <div>
              <h3>{{ chapter.title }}</h3>
              <p>{{ chapter.word_count }} 字 · {{ chapter.characters.length ? chapter.characters.join('、') : '角色待识别' }}</p>
            </div>
          </div>
          <p class="brief">{{ chapter.brief }}</p>
          <div v-if="chapter.key_events.length" class="detail-block">
            <strong>关键事件</strong>
            <ol>
              <li v-for="event in chapter.key_events" :key="event">{{ event }}</li>
            </ol>
          </div>
          <div v-if="chapter.conflict && chapter.conflict !== '无'" class="detail-block">
            <strong>冲突推进</strong>
            <p>{{ chapter.conflict }}</p>
          </div>
          <div v-if="chapter.hook && chapter.hook !== '无'" class="detail-block">
            <strong>章末钩子</strong>
            <p>{{ chapter.hook }}</p>
          </div>
        </article>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { showToast } from 'vant';
import { crawlNovelOutline, analyzeChapters } from '../api/novelOutline.js';
import { createProject } from '../api/books.js';

const route = useRoute();
const router = useRouter();

// 模式
const mode = ref('paste');

// 粘贴模式
const pasteNovelTitle = ref('');
const chapterInputs = ref([{ title: '', content: '' }]);

// URL模式
const sourceUrl = ref('');
const urlTitle = ref('');
const maxChapters = ref(5);

const loading = ref(false);
const result = ref(null);

const hasContent = computed(() =>
  chapterInputs.value.some((ch) => ch.content.trim().length > 0)
);

function addChapter() {
  chapterInputs.value.push({ title: '', content: '' });
}

function removeChapter(idx) {
  if (chapterInputs.value.length > 1) {
    chapterInputs.value.splice(idx, 1);
  }
}

async function analyze() {
  const chapters = chapterInputs.value
    .map((ch) => ({
      title: ch.title.trim(),
      content: ch.content.trim(),
    }))
    .filter((ch) => ch.content);

  if (!chapters.length) {
    showToast('请至少粘贴一个章节的内容');
    return;
  }

  loading.value = true;
  result.value = null;
  try {
    result.value = await analyzeChapters({
      novel_title: pasteNovelTitle.value.trim() || undefined,
      chapters,
    });
  } catch (e) {
    showToast('分析失败: ' + (e.message || '未知错误'));
  } finally {
    loading.value = false;
  }
}

async function crawlUrl() {
  if (!sourceUrl.value.trim()) {
    showToast('请输入小说链接');
    return;
  }
  loading.value = true;
  result.value = null;
  try {
    result.value = await crawlNovelOutline({
      url: sourceUrl.value.trim(),
      max_chapters: maxChapters.value,
      title: urlTitle.value || undefined,
    });
  } catch (e) {
    showToast('抓取失败: ' + (e.message || '未知错误'));
  } finally {
    loading.value = false;
  }
}

async function goImport() {
  if (!result.value) return;
  try {
    await createProject({
      title: result.value.novel_title,
      description: '',
      style: '玄幻',
      outline_job_id: result.value.job_id,
    });
    showToast('导入成功');
    router.push('/writing');
  } catch (e) {
    showToast('导入失败: ' + (e.message || '未知错误'));
  }
}

onMounted(() => {
  if (typeof route.query.url === 'string') {
    sourceUrl.value = route.query.url;
    urlTitle.value = typeof route.query.title === 'string' ? route.query.title : '';
    mode.value = 'url';
  }
});
</script>

<style scoped>
.mode-tabs {
  display: flex;
  gap: 8px;
}

.form-panel {
  display: grid;
  gap: 12px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 12px;
}

.chapters-editor {
  display: grid;
  gap: 8px;
}

.chapters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
}

.chapter-input-block {
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 10px;
  display: grid;
  gap: 6px;
}

.chapter-input-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: var(--accent);
  font-weight: 600;
}

.del-btn {
  color: #e74c3c;
  cursor: pointer;
  font-size: 16px;
}

.chapter-title-input {
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 13px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}

.chapter-title-input:focus {
  border-color: var(--accent);
}

.chapter-content-input {
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 8px;
  font-size: 13px;
  line-height: 1.7;
  outline: none;
  resize: vertical;
  width: 100%;
  box-sizing: border-box;
  font-family: inherit;
}

.chapter-content-input:focus {
  border-color: var(--accent);
}

.char-count {
  font-size: 11px;
  color: var(--muted);
  text-align: right;
}

.result-actions-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.outline-list {
  display: grid;
  gap: 12px;
}

.outline-card {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 12px;
}

.outline-head {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.rank {
  flex: 0 0 38px;
  color: var(--accent);
  font-size: 18px;
  font-weight: 800;
}

h3 {
  margin: 0;
  font-size: 16px;
  line-height: 1.35;
}

p {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
}

.brief {
  color: var(--ink);
}

.detail-block {
  margin-top: 10px;
}

.detail-block strong {
  display: block;
  margin-bottom: 4px;
  font-size: 13px;
}

ol {
  margin: 0;
  padding-left: 20px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
}
</style>
