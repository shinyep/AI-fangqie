<template>
  <main class="page">
    <header class="topbar">
      <div>
        <h1 class="title">创作灵感</h1>
        <p class="subtitle">基于榜单题材和热词生成方向</p>
      </div>
      <van-button icon="replay" size="small" @click="loadInspirations" />
    </header>

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

    <section class="section">
      <van-field v-model="subcategory" label="题材" placeholder="可输入都市、仙侠、科幻等" clearable @keyup.enter="loadInspirations" />
    </section>

    <section class="section inspiration-list">
      <article v-for="item in inspirations" :key="item.id || item.title" class="inspiration-card">
        <van-tag type="primary" plain>{{ item.subcategory || '综合' }}</van-tag>
        <h3>{{ item.title }}</h3>
        <p>{{ item.content }}</p>
      </article>
    </section>
  </main>
</template>

<script setup>
import { storeToRefs } from 'pinia';
import { onMounted, ref } from 'vue';
import { fetchInspirations } from '../api/aiRankings.js';
import { useAppStore } from '../stores/app.js';

const app = useAppStore();
const { activeRankType } = storeToRefs(app);
const subcategory = ref('');
const inspirations = ref([]);

async function loadInspirations() {
  inspirations.value = await fetchInspirations({
    rank_type: activeRankType.value,
    subcategory: subcategory.value,
  });
}

async function switchRankType(rankType) {
  app.setRankType(rankType);
  await loadInspirations();
}

onMounted(async () => {
  await app.loadRankTypes();
  await loadInspirations();
});
</script>

<style scoped>
.inspiration-card {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 14px;
}

h3 {
  margin: 10px 0 8px;
  font-size: 16px;
}

p {
  margin: 0;
  color: var(--muted);
  line-height: 1.6;
  font-size: 14px;
}
</style>
