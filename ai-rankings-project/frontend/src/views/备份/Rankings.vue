<template>
  <main class="page">
    <section class="rank-type-bar">
      <van-search v-model="keyword" placeholder="搜索书名" shape="round" @search="doSearch" />
      <div class="rank-tabs">
        <button
          v-for="type in app.rankTypes"
          :key="type.type_key"
          class="rank-tab"
          :class="{ active: activeRankType === type.type_key }"
          @click="switchRankType(type.type_key)"
        >
          {{ type.label }}
        </button>
      </div>
      <van-button type="primary" icon="replay" :loading="crawling" @click="crawlFanqie">
        拉取番茄书库
      </van-button>
    </section>

    <section class="category-strip">
      <button class="category-cell" :class="{ active: activeCategory === '' }" @click="switchCategory('')">
        <strong>总榜</strong>
        <span>{{ totalReadText }}</span>
      </button>
      <button
        v-for="item in categories"
        :key="item.subcategory"
        class="category-cell"
        :class="{ active: activeCategory === item.subcategory }"
        @click="switchCategory(item.subcategory)"
      >
        <strong>{{ item.subcategory }}</strong>
        <span>{{ item.book_count }}本</span>
      </button>
    </section>

    <section class="section">
      <div class="daily-stats">
        <div class="stat-today">
          <span class="stat-label">今日写作</span>
          <span class="stat-value">{{ todayStats.calls }}次 · {{ todayStats.words.toLocaleString() }}字</span>
        </div>
        <div class="stat-chart">
          <div v-for="d in recentStats" :key="d.date" class="stat-bar-col" :title="`${d.date}: ${d.calls}次 ${d.words}字`">
            <div class="stat-bar-wrapper">
              <div class="stat-bar" :style="{ height: barHeight(d.words) }" />
            </div>
            <span class="stat-date">{{ d.date.slice(5) }}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="toolbar">
        <HotWordCloud :words="words" />
      </div>
    </section>

    <section class="section book-list">
      <BookCard v-for="book in books" :key="book.id" :book="book" />
      <div v-if="!books.length" class="empty">暂无榜单数据</div>
    </section>
  </main>
</template>

<script setup>
import { storeToRefs } from 'pinia';
import { computed, onMounted, ref } from 'vue';
import { searchRankings, fetchHotWords, fetchRankingCategories, fetchRankings } from '../api/aiRankings.js';
import { crawlFanqieLibrary } from '../api/fanqieLibrary.js';
import BookCard from '../components/BookCard.vue';
import HotWordCloud from '../components/HotWordCloud.vue';
import { useAppStore } from '../stores/app.js';
import { getTodayStats, getRecentStats } from '../utils/usageStats.js';

const app = useAppStore();
const { activeRankType } = storeToRefs(app);
const activeCategory = ref('');
const categories = ref([]);
const books = ref([]);
const words = ref([]);
const keyword = ref('');
const crawling = ref(false);
const todayStats = ref({ calls: 0, words: 0 });
const recentStats = ref([]);

function refreshStats() {
  todayStats.value = getTodayStats();
  recentStats.value = getRecentStats(7);
}

const maxWords = computed(() => Math.max(1, ...recentStats.value.map(d => d.words)));
function barHeight(words) {
  const pct = (words / (maxWords.value || 1)) * 100;
  return `${Math.max(2, pct)}%`;
}

const totalReadText = computed(() => `${(books.value.reduce((sum, book) => sum + (book.read_count || 0), 0) / 10000).toFixed(1)}万`);

async function loadCategories() {
  categories.value = await fetchRankingCategories({ rank_type: activeRankType.value, platform: 'fanqie' });
}

async function loadBooks() {
  const params = {
    rank_type: activeRankType.value,
    subcategory: activeCategory.value,
    limit: 50,
    platform: 'fanqie',
  };
  books.value = keyword.value.trim()
    ? await searchRankings({ ...params, keyword: keyword.value.trim() })
    : await fetchRankings(params);
  words.value = await fetchHotWords({
    rank_type: activeRankType.value,
    subcategory: activeCategory.value,
    limit: 20,
    platform: 'fanqie',
  });
}

async function loadData() {
  await loadCategories();
  await loadBooks();
}

async function switchRankType(rankType) {
  app.setRankType(rankType);
  activeCategory.value = '';
  keyword.value = '';
  await loadData();
}

async function switchCategory(category) {
  activeCategory.value = category;
  await loadBooks();
}

async function doSearch() {
  await loadBooks();
}

async function crawlFanqie() {
  crawling.value = true;
  try {
    await crawlFanqieLibrary({
      page_count: 20,
      page_index: 0,
      sort: 0,
      rank_type: activeRankType.value,
    });
    keyword.value = '';
    activeCategory.value = '';
    await loadData();
  } finally {
    crawling.value = false;
  }
}

onMounted(async () => {
  refreshStats();
  await app.loadRankTypes();
  await loadData();
});
</script>

<style scoped>
.daily-stats {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 8px 12px;
  display: flex;
  gap: 16px;
  align-items: flex-end;
  overflow: hidden;
}

.stat-today {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-shrink: 0;
}

.stat-label {
  font-size: 11px;
  color: var(--muted);
  font-weight: 600;
}

.stat-value {
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
}

.stat-chart {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  flex: 1;
  height: 36px;
  min-width: 0;
}

.stat-bar-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.stat-bar-wrapper {
  width: 100%;
  height: 28px;
  display: flex;
  align-items: flex-end;
}

.stat-bar {
  width: 100%;
  background: linear-gradient(180deg, var(--accent), #5b7fff);
  border-radius: 2px 2px 0 0;
  transition: height 0.3s;
  min-height: 2px;
}

.stat-date {
  font-size: 9px;
  color: var(--muted);
}
</style>
