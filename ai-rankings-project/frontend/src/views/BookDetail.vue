<template>
  <main class="page">
    <header class="topbar">
      <div>
        <h1 class="title">书籍详情</h1>
        <p class="subtitle">AI分析报告</p>
      </div>
      <van-button icon="arrow-left" size="small" @click="$router.back()">返回</van-button>
    </header>

    <section v-if="!book" class="section empty-state">
      <p>未选择书籍，请从榜单页面进入。</p>
    </section>

    <template v-else>
      <!-- 基础信息 -->
      <section class="section book-info">
        <div class="info-head">
          <img v-if="book.cover_url" class="cover" :src="book.cover_url" :alt="book.title" />
          <div v-else class="cover cover-fallback">{{ (book.title || '').slice(0, 4) }}</div>
          <div class="meta">
            <h2>{{ book.title }}</h2>
            <p class="author">{{ book.author }}</p>
            <van-tag plain :type="book.status === 'finished' ? 'success' : 'warning'" size="small">
              {{ book.status === 'finished' ? '已完结' : '连载中' }}
            </van-tag>
            <span class="category">{{ book.subcategory }}</span>
            <div class="metrics">
              <span><van-icon name="friends-o" /> {{ formatNum(book.read_count) }}人在读</span>
              <span><van-icon name="notes-o" /> {{ formatWords(book.word_count) }}字</span>
              <span v-if="book.chapters_collected"><van-icon name="bookmark-o" /> {{ book.chapters_collected }}章已采集</span>
            </div>
          </div>
        </div>
        <p class="intro">{{ book.intro }}</p>
        <div class="tags">
          <van-tag v-for="tag in book.tags" :key="tag" color="#eef7f2" text-color="#169b62" size="small">
            {{ tag }}
          </van-tag>
        </div>
        <div class="actions">
          <a v-if="book.book_url" :href="book.book_url" target="_blank" rel="noreferrer">阅读原文</a>
          <van-button size="small" type="primary" :to="{ path: '/novel-outline', query: { url: book.book_url || '', title: book.title || '' } }">
            AI拆书
          </van-button>
        </div>
      </section>

      <!-- AI分析 -->
      <section v-if="hasAnalysis" class="section analysis-section">
        <h2 class="section-title">AI拆书分析</h2>

        <div v-for="section in analysisSections" :key="section.title" class="analysis-block">
          <h3>
            <van-icon :name="sectionIcon(section.title)" />
            {{ section.title }}
          </h3>
          <p>{{ section.content }}</p>
        </div>

        <div v-if="!analysisSections.length && rawAnalysis" class="analysis-block">
          <h3>AI分析</h3>
          <p class="raw-text">{{ rawAnalysis }}</p>
        </div>
      </section>

      <section v-else class="section empty-state">
        <p>该书籍暂无AI分析数据</p>
      </section>
    </template>
  </main>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAppStore } from '../stores/app.js';

const route = useRoute();
const router = useRouter();
const app = useAppStore();

const book = computed(() => app.currentBook);

const rawAnalysis = computed(() => {
  const a = book.value?.analysis;
  if (!a) return '';
  if (typeof a === 'string') return a;
  // may be an object with ai_analysis field
  return a.ai_analysis || a.analysis || JSON.stringify(a);
});

const analysisSections = computed(() => {
  const text = rawAnalysis.value;
  if (!text) return [];
  const sections = [];
  const re = /###\s*\d*\.?\s*(.+?)\s*\n([\s\S]*?)(?=###\s*\d*\.|$)/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    const title = match[1].trim();
    const content = match[2].trim();
    if (title && content) sections.push({ title, content });
  }
  return sections;
});

const hasAnalysis = computed(() => analysisSections.value.length > 0);

const iconMap = {
  金手指: 'gem-o', 核心: 'fire-o', 人设: 'user-o', 冲突: 'warning-o',
  创新: 'flower-o', 世界观: 'earth', 期待: 'star-o', 钩子: 'aim',
  看点: 'eye-o', 梗: 'smile-o', 爽点: 'fire-o',
};
function sectionIcon(title) {
  for (const [key, icon] of Object.entries(iconMap)) {
    if (title.includes(key)) return icon;
  }
  return 'label-o';
}

function formatNum(n) {
  if (!n) return '0';
  n = Number(n);
  if (n >= 10000) return (n / 10000).toFixed(1) + '万';
  return String(n);
}

function formatWords(n) {
  if (!n) return '0';
  return Math.round(Number(n) / 10000) + '万';
}

onMounted(() => {
  if (!book.value) {
    // Try to restore from localStorage as fallback
    try {
      const cached = localStorage.getItem('currentBook');
      if (cached) app.setCurrentBook(JSON.parse(cached));
    } catch { /* ignore */ }
  }
});
</script>

<style scoped>
.empty-state {
  text-align: center;
  color: var(--muted);
  padding: 40px 0;
  font-size: 14px;
}

.book-info {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 12px;
}

.info-head {
  display: flex;
  gap: 12px;
}

.cover {
  flex: 0 0 72px;
  width: 72px;
  height: 102px;
  object-fit: cover;
  border-radius: 6px;
  box-shadow: 0 6px 14px rgba(0,0,0,0.14);
}

.cover-fallback {
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 800;
  font-size: 14px;
  background: linear-gradient(145deg, #7c2d12, #d97706 45%, #111827);
}

.meta {
  min-width: 0;
  flex: 1;
}

.meta h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 750;
  line-height: 1.3;
}

.author {
  margin: 4px 0;
  color: var(--muted);
  font-size: 13px;
}

.category {
  margin-left: 6px;
  color: var(--accent);
  font-size: 12px;
}

.metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  margin-top: 6px;
  color: #2f3b4a;
  font-size: 12px;
}

.metrics span {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.intro {
  margin: 10px 0 0;
  color: var(--ink);
  font-size: 14px;
  line-height: 1.7;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 8px;
}

.actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
}

.actions a {
  color: #303a47;
  font-size: 13px;
}

.analysis-section {
  display: grid;
  gap: 10px;
}

.analysis-block {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 12px;
}

.analysis-block h3 {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 5px;
}

.analysis-block p {
  margin: 0;
  color: var(--ink);
  font-size: 14px;
  line-height: 1.75;
  white-space: pre-wrap;
}

.raw-text {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
