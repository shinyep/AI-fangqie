<template>
  <main class="page">
    <header class="topbar">
      <div>
        <h1 class="title">热门新闻</h1>
        <p class="subtitle">抖音、微博、头条、百度、B站热点聚合</p>
      </div>
      <van-button icon="replay" size="small" @click="loadNews" />
    </header>

    <section class="section">
      <div class="toolbar">
        <van-button
          v-for="source in sources"
          :key="source.value"
          :type="activeSource === source.value ? 'primary' : 'default'"
          size="small"
          @click="switchSource(source.value)"
        >
          {{ source.name }}
        </van-button>
      </div>
    </section>

    <section class="section">
      <div class="toolbar">
        <van-button
          v-for="item in dates"
          :key="item"
          :type="activeDate === item ? 'primary' : 'default'"
          size="small"
          @click="switchDate(item)"
        >
          {{ item.slice(5) }}
        </van-button>
      </div>
    </section>

    <section class="section news-list">
      <article v-for="item in news" :key="item.id" class="news-card">
        <span class="rank">#{{ item.rank }}</span>
        <div>
          <h3>{{ item.title }}</h3>
          <p>{{ item.source }} · 热度 {{ item.hot_index }}</p>
        </div>
      </article>
      <div v-if="!news.length" class="empty">暂无热点数据</div>
    </section>
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { fetchHotNews, fetchNewsDates, fetchNewsSources } from '../api/hotNews.js';

const sources = ref([]);
const dates = ref([]);
const news = ref([]);
const activeSource = ref('douyin');
const activeDate = ref('');

async function loadSources() {
  const data = await fetchNewsSources();
  sources.value = data.sources || [];
  activeSource.value = sources.value[0]?.value || 'douyin';
}

async function loadDates() {
  const data = await fetchNewsDates({ source: activeSource.value, limit: 7 });
  dates.value = data.dates || [];
  activeDate.value = data.latest_date || dates.value[0] || '';
}

async function loadNews() {
  const data = await fetchHotNews({ source: activeSource.value, date: activeDate.value, limit: 50 });
  news.value = data.items || [];
}

async function switchSource(source) {
  activeSource.value = source;
  await loadDates();
  await loadNews();
}

async function switchDate(date) {
  activeDate.value = date;
  await loadNews();
}

onMounted(async () => {
  await loadSources();
  await loadDates();
  await loadNews();
});
</script>

<style scoped>
.news-card {
  display: flex;
  gap: 10px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 12px;
}

.rank {
  flex: 0 0 38px;
  color: var(--accent);
  font-weight: 800;
}

h3 {
  margin: 0;
  font-size: 15px;
  line-height: 1.4;
}

p {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 13px;
}
</style>
