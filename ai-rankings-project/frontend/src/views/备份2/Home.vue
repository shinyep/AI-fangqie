<template>
  <main class="page">
    <header class="topbar">
      <div>
        <h1 class="title">AI扫榜工作台</h1>
        <p class="subtitle">番茄榜单、热词、热点和创作灵感集中查看</p>
      </div>
      <van-button icon="search" size="small" to="/search" />
    </header>

    <section class="metric-grid">
      <div class="metric">
        <strong>{{ books.length }}</strong>
        <span>当前榜单</span>
      </div>
      <div class="metric">
        <strong>{{ words.length }}</strong>
        <span>榜单热词</span>
      </div>
      <div class="metric">
        <strong>{{ categories.length }}</strong>
        <span>题材分类</span>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">榜单类型</h2>
      <div class="toolbar">
        <van-button
          v-for="type in app.rankTypes"
          :key="type.type_key"
          :type="activeRankType === type.type_key ? 'primary' : 'default'"
          size="small"
          :icon="type.icon"
          @click="switchRankType(type.type_key)"
        >
          {{ type.label }}
        </van-button>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">热词趋势</h2>
      <div class="panel">
        <HotWordCloud :words="words" />
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">
        榜单预览
        <van-button size="mini" type="primary" plain to="/rankings">查看全部</van-button>
      </h2>
      <div class="book-list">
        <BookCard v-for="book in books.slice(0, 5)" :key="book.id" :book="book" />
      </div>
    </section>
  </main>
</template>

<script setup>
import { storeToRefs } from 'pinia';
import { onMounted, ref } from 'vue';
import { fetchLiveRankings } from '../api/fanqieLibrary.js';
import { fetchXingyueLiveData } from '../api/xingyueRankings.js';
import BookCard from '../components/BookCard.vue';
import HotWordCloud from '../components/HotWordCloud.vue';
import { useAppStore } from '../stores/app.js';

const app = useAppStore();
const { activeRankType } = storeToRefs(app);
const books = ref([]);
const words = ref([]);
const categories = ref([]);

async function loadData() {
  const rankType = activeRankType.value;
  const rankSource = app.rankTypes.find((item) => item.type_key === rankType)?.source;
  if (rankSource === 'xingyue') {
    const data = await fetchXingyueLiveData({ rank_type: rankType, limit: 20 });
    books.value = data.books || [];
    words.value = data.words || [];
    categories.value = data.categories || [];
  } else {
    const data = await fetchLiveRankings({ rank_type: rankType, limit: 20 });
    books.value = data.books || [];
    words.value = data.words || [];
    categories.value = data.categories || [];
  }
}

async function switchRankType(rankType) {
  app.setRankType(rankType);
  await loadData();
}

onMounted(async () => {
  await app.loadRankTypes();
  await loadData();
});
</script>
