<template>
  <article class="book-card">
    <div class="cover-wrap">
      <img v-if="book.cover_url" class="cover" :src="book.cover_url" :alt="book.title" />
      <div v-else class="cover cover-fallback">
        <span>{{ coverText }}</span>
      </div>
      <span class="category-chip">{{ book.subcategory }}</span>
    </div>
    <div class="body">
      <div class="head">
        <h3>{{ book.title }}</h3>
        <van-tag plain :type="book.status === 'finished' ? 'success' : 'warning'">{{ statusText }}</van-tag>
      </div>
      <p class="author">{{ book.author }}</p>
      <div class="metrics">
        <span><van-icon name="friends-o" /> {{ formatReaders(book.read_count) }}人在读</span>
        <span><van-icon name="notes-o" /> {{ formatWords(book.word_count) }}字</span>
      </div>
      <p class="intro">{{ book.intro }}</p>
      <div class="selling">
        <van-tag v-for="point in book.selling_points.slice(0, 3)" :key="point" color="#eef7f2" text-color="#169b62">
          {{ point }}
        </van-tag>
      </div>
      <p class="hook">{{ book.core_hook }}</p>
      <div class="actions">
        <a v-if="book.book_url" :href="book.book_url" target="_blank" rel="noreferrer">阅读原文</a>
        <span v-else>阅读原文</span>
        <van-button size="mini" type="primary" icon="smile-o" @click="goDetail">
          AI拆书
        </van-button>
      </div>
    </div>
    <span class="rank">{{ book.rank_position }}</span>
  </article>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '../stores/app.js';

const props = defineProps({
  book: {
    type: Object,
    required: true,
  },
});

const router = useRouter();
const app = useAppStore();

const coverText = computed(() => props.book.title?.slice(0, 4) || 'AI扫榜');
const statusText = computed(() => (props.book.status === 'finished' ? '已完结' : '连载中'));

function goDetail() {
  app.setCurrentBook(props.book);
  router.push({ path: `/book/${props.book.id}` });
}

function formatWords(value) {
  if (!value) return '0';
  return `${Math.round(value / 10000)}万`;
}

function formatReaders(value) {
  if (!value) return '0';
  return `${(value / 10000).toFixed(1)}万`;
}
</script>

<style scoped>
.book-card {
  position: relative;
  display: flex;
  gap: 12px;
  min-height: 196px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 22px 16px 14px;
  box-shadow: 0 8px 22px rgba(16, 38, 64, 0.06);
}

.rank {
  position: absolute;
  right: 6px;
  top: 6px;
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  background: #ffb800;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}

.cover-wrap {
  flex: 0 0 78px;
  min-width: 78px;
}

.cover {
  display: block;
  width: 78px;
  height: 112px;
  object-fit: cover;
  border-radius: 6px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.16);
}

.cover-fallback {
  display: grid;
  place-items: center;
  padding: 8px;
  color: #fff;
  text-align: center;
  font-weight: 800;
  line-height: 1.25;
  background:
    linear-gradient(135deg, rgba(0, 0, 0, 0.15), transparent 45%),
    linear-gradient(145deg, #7c2d12, #d97706 45%, #111827);
}

.category-chip {
  display: inline-block;
  margin-top: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f4f6f8;
  color: #384252;
  font-size: 12px;
}

.body {
  min-width: 0;
  flex: 1;
}

.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

h3 {
  margin: 0;
  font-size: 15px;
  line-height: 1.3;
  font-weight: 750;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.author,
.intro {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.45;
}

.metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  margin-top: 8px;
  color: #2f3b4a;
  font-size: 12px;
}

.metrics span {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.intro,
.hook {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.intro {
  -webkit-line-clamp: 2;
}

.selling {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 8px;
}

.hook {
  margin: 7px 0 0;
  color: #536171;
  font-size: 12px;
  line-height: 1.45;
  -webkit-line-clamp: 2;
}

.actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
}

.actions a,
.actions span {
  color: #303a47;
  font-size: 12px;
  text-decoration: underline;
}
</style>
