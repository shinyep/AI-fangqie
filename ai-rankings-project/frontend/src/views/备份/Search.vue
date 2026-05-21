<template>
  <main class="page">
    <header class="topbar">
      <div>
        <h1 class="title">榜单搜索</h1>
        <p class="subtitle">按书名、作者、简介和题材检索</p>
      </div>
    </header>

    <van-search v-model="keyword" placeholder="输入修仙、系统、科幻等关键词" show-action @search="doSearch">
      <template #action>
        <span @click="doSearch">搜索</span>
      </template>
    </van-search>

    <section class="section">
      <div class="toolbar">
        <van-button
          v-for="type in app.rankTypes"
          :key="type.type_key"
          :type="activeRankType === type.type_key ? 'primary' : 'default'"
          size="small"
          @click="switchRankType(type.type_key)"
        >
          {{ type.label }}
        </van-button>
      </div>
    </section>

    <section class="section book-list">
      <BookCard v-for="book in results" :key="book.id" :book="book" />
      <div v-if="searched && !results.length" class="empty">没有匹配结果</div>
    </section>
  </main>
</template>

<script setup>
import { storeToRefs } from 'pinia';
import { onMounted, ref } from 'vue';
import { showToast } from 'vant';
import { searchRankings } from '../api/aiRankings.js';
import BookCard from '../components/BookCard.vue';
import { useAppStore } from '../stores/app.js';

const app = useAppStore();
const { activeRankType } = storeToRefs(app);
const keyword = ref('');
const results = ref([]);
const searched = ref(false);

async function doSearch() {
  if (!keyword.value.trim()) {
    showToast('请输入关键词');
    return;
  }
  results.value = await searchRankings({
    rank_type: activeRankType.value,
    keyword: keyword.value.trim(),
    limit: 50,
    platform: 'fanqie',
  });
  searched.value = true;
}

async function switchRankType(rankType) {
  app.setRankType(rankType);
  if (searched.value) {
    await doSearch();
  }
}

onMounted(async () => {
  await app.loadRankTypes();
});
</script>
