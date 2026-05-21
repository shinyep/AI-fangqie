<template>
  <div class="quality-report-panel">
    <van-button
      size="small"
      plain
      :loading="loading"
      @click="loadReport"
    >
      加载质量报告
    </van-button>

    <van-loading v-if="loading" class="report-loading" size="20" />

    <!-- 总体评分 -->
    <div v-if="summary" class="summary-card">
      <h4>小说质量总览</h4>
      <div class="summary-scores">
        <div v-for="dim in dims" :key="dim.key" class="summary-item">
          <div class="summary-label">{{ dim.label }}</div>
          <div class="summary-value" :style="{ color: scoreColor(summary[dim.key]) }">
            {{ summary[dim.key] }}
          </div>
        </div>
      </div>
      <div class="overall-badge" :style="{ background: scoreColor(summary.overall) }">
        {{ summary.overall }}/100
      </div>
    </div>

    <!-- 各章节评分 -->
    <div v-if="chapters.length > 0" class="chapters-list">
      <h4>各章节评分 ({{ chapters.length }}章)</h4>
      <div
        v-for="ch in chapters"
        :key="ch.chapterId"
        class="chapter-score-row"
      >
        <div class="chapter-info">
          <span class="chapter-index">第{{ ch.chapterIndex }}章</span>
          <span class="chapter-title">{{ ch.chapterTitle }}</span>
        </div>
        <div class="chapter-score">
          <span :style="{ color: scoreColor(ch.score.overall) }">
            {{ ch.score.overall }}
          </span>
          <span v-if="ch.issues?.length" class="chapter-issues">
            {{ ch.issues.length }}问题
          </span>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!loading && !summary && !chapters.length" class="empty-state">
      暂无质量报告数据，请先执行审稿
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { showToast } from 'vant';
import { getQualityReport } from '../api/novelReview.js';

const props = defineProps({
  novelId: { type: [Number, String], default: 0 },
});

const dims = [
  { key: 'coherence', label: '连贯性' },
  { key: 'repetition', label: '重复率' },
  { key: 'pacing', label: '节奏' },
  { key: 'voice', label: '文风' },
  { key: 'engagement', label: '追读感' },
  { key: 'overall', label: '综合' },
];

const loading = ref(false);
const summary = ref(null);
const chapters = ref([]);

function scoreColor(v) {
  if (v == null) return '#999';
  if (v >= 80) return '#07c160';
  if (v >= 60) return '#ff976a';
  return '#ee0a24';
}

async function loadReport() {
  if (!props.novelId) {
    showToast('请先选择小说');
    return;
  }
  loading.value = true;
  try {
    const payload = await getQualityReport(props.novelId);
    const data = payload?.data || payload;
    summary.value = data.summary;
    chapters.value = data.chapters || [];
  } catch (err) {
    showToast('加载质量报告失败');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.quality-report-panel {
  padding: 12px 0;
}

.report-loading {
  display: block;
  margin: 16px auto;
}

.summary-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 20px;
  margin: 16px 0;
  color: #fff;
  position: relative;
}

.summary-card h4 {
  margin: 0 0 12px;
  font-size: 16px;
}

.summary-scores {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.summary-item {
  text-align: center;
}

.summary-label {
  font-size: 12px;
  opacity: 0.8;
  margin-bottom: 4px;
}

.summary-value {
  font-size: 22px;
  font-weight: 700;
}

.overall-badge {
  position: absolute;
  top: 16px;
  right: 16px;
  font-size: 18px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 20px;
}

.chapters-list {
  margin-top: 16px;
}

.chapters-list h4 {
  font-size: 15px;
  margin: 0 0 12px;
  color: #333;
}

.chapter-score-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #fff;
  border-radius: 8px;
  margin-bottom: 6px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

.chapter-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chapter-index {
  font-size: 12px;
  color: #999;
}

.chapter-title {
  font-size: 13px;
  color: #333;
}

.chapter-score {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chapter-score span {
  font-size: 18px;
  font-weight: 700;
}

.chapter-issues {
  font-size: 11px;
  color: #ee0a24;
  background: #fff0f0;
  padding: 2px 6px;
  border-radius: 8px;
}

.empty-state {
  text-align: center;
  color: #999;
  font-size: 14px;
  padding: 40px 0;
}
</style>
