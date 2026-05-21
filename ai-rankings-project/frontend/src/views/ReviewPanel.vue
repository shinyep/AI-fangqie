<template>
  <div class="review-panel">
    <!-- 审稿类型选择 -->
    <div class="review-section">
      <div class="section-label">审稿类型</div>
      <div class="review-tabs">
        <button
          v-for="v in variants"
          :key="v.key"
          :class="['review-tab', { active: activeVariant === v.key }]"
          @click="activeVariant = v.key"
        >
          {{ v.label }}
        </button>
      </div>
    </div>

    <!-- 审稿操作 -->
    <div class="review-section">
      <div class="section-label">综合审稿</div>
      <van-button
        type="primary"
        size="small"
        block
        :loading="reviewLoading"
        @click="runReview"
      >
        执行审稿
      </van-button>
    </div>

    <!-- 专项审计 -->
    <div class="review-section">
      <div class="section-label">专项审计</div>
      <div class="audit-actions">
        <van-button
          v-for="audit in auditTypes"
          :key="audit.value"
          plain
          size="small"
          :loading="auditLoading === audit.value"
          @click="runAudit(audit.value)"
        >
          {{ audit.label }}
        </van-button>
      </div>
    </div>

    <!-- 加载状态 -->
    <van-loading v-if="reviewLoading" class="review-loading" size="24" text-size="14">
      正在审稿，AI 仔细阅读中...
    </van-loading>

    <!-- 6维评分卡片 -->
    <div v-if="score" class="score-card">
      <h4 class="score-title">审稿评分</h4>
      <div class="score-grid">
        <div v-for="dim in dimensions" :key="dim.key" class="score-item">
          <div class="score-header">
            <span class="score-label">{{ dim.label }}</span>
            <span class="score-value" :style="{ color: scoreColor(score[dim.key]) }">
              {{ score[dim.key] ?? '-' }}
            </span>
          </div>
          <div class="score-bar track">
            <div
              class="score-bar fill"
              :style="{ width: (score[dim.key] || 0) + '%', background: scoreColor(score[dim.key]) }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 审稿问题列表 -->
    <div v-if="issues.length > 0" class="issues-section">
      <div class="issues-title-row">
        <h4 class="issues-title">
          审稿问题
          <span class="issues-badge">{{ issues.length }}</span>
        </h4>
        <button class="expand-all-btn" @click="toggleAllIssues">
          {{ allExpanded ? '收起全部' : '展开全部' }}
        </button>
      </div>
      <div
        v-for="(issue, idx) in issues"
        :key="idx"
        :class="['issue-card', 'severity-' + issue.severity, { expanded: expandedIssues.has(idx) }]"
      >
        <div class="issue-header" @click="toggleIssue(idx)">
          <span :class="['severity-tag', issue.severity]">{{ severityLabel(issue.severity) }}</span>
          <span class="issue-category">{{ categoryLabel(issue.category) }}</span>
          <span class="issue-desc">{{ issue.evidence }}</span>
          <van-icon
            :name="expandedIssues.has(idx) ? 'arrow-up' : 'arrow-down'"
            class="issue-toggle"
          />
        </div>
        <div v-if="expandedIssues.has(idx)" class="issue-detail">
          <div class="issue-evidence">
            <strong>问题描述：</strong>{{ issue.evidence }}
          </div>
          <div v-if="issue.fixSuggestion" class="issue-fix">
            <strong>修改建议：</strong>{{ issue.fixSuggestion }}
          </div>
        </div>
      </div>
    </div>

    <!-- 审计结果摘要 -->
    <div v-if="auditResults.length > 0" class="audit-summary">
      <h4 class="issues-title">审计结果</h4>
      <div v-for="(r, i) in auditResults" :key="i" class="audit-item">
        <div class="audit-type">{{ r.auditType || '审计' }}</div>
        <div class="audit-score" :style="{ color: scoreColor(r.overallScore) }">
          {{ r.overallScore }}分
        </div>
        <div v-if="r.summary" class="audit-text">{{ r.summary }}</div>
        <div v-if="r.issues?.length" class="audit-issue-count">
          {{ r.issues.length }}个问题
        </div>
      </div>
    </div>

    <!-- 操作栏 -->
    <div v-if="hasResults" class="review-footer">
      <van-button
        type="default"
        size="small"
        :loading="repairLoading"
        @click="$emit('repair', { issues: allIssues })"
      >
        一键修复
      </van-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { showToast } from 'vant';
import { reviewChapter, auditChapter } from '../api/novelReview.js';

const props = defineProps({
  novelId: { type: [Number, String], default: 0 },
  chapterId: { type: [Number, String], default: 0 },
  content: { type: String, default: '' },
  provider: { type: String, default: '' },
  model: { type: String, default: '' },
  repairLoading: { type: Boolean, default: false },
});

const emit = defineEmits(['repair', 'review-done']);

// 审稿变体（从原 Writing.vue 迁移）
const activeVariant = ref('full');
const variants = [
  { key: 'full', label: '综合审稿' },
  { key: 'poison', label: '毒点排查' },
  { key: 'logic', label: '逻辑设定' },
  { key: 'rhythm-score', label: '爽点节奏' },
];

// 审计类型
const auditTypes = [
  { value: 'continuity', label: '连续性' },
  { value: 'character', label: '人设' },
  { value: 'plot', label: '情节' },
  { value: 'full', label: '完整审计' },
];

// 评分维度
const dimensions = [
  { key: 'coherence', label: '连贯性' },
  { key: 'repetition', label: '重复率' },
  { key: 'pacing', label: '节奏' },
  { key: 'voice', label: '文风' },
  { key: 'engagement', label: '追读感' },
  { key: 'overall', label: '综合' },
];

const reviewLoading = ref(false);
const auditLoading = ref(null);
const score = ref(null);
const issues = ref([]);
const auditResults = ref([]);
const expandedIssues = ref(new Set());

const hasResults = computed(() => score.value || issues.value.length > 0 || auditResults.value.length > 0);
const allIssues = computed(() => {
  const auditIssues = auditResults.value.flatMap(r => (r.issues || []).map(i => ({ ...i, auditType: r.auditType })));
  return [...issues.value, ...auditIssues];
});

function scoreColor(v) {
  if (v == null) return '#999';
  if (v >= 80) return '#07c160';
  if (v >= 60) return '#ff976a';
  return '#ee0a24';
}

function severityLabel(s) {
  return { low: '低', medium: '中', high: '高', critical: '严重' }[s] || s;
}

function categoryLabel(c) {
  return {
    coherence: '连贯性', repetition: '重复率', pacing: '节奏',
    voice: '文风', engagement: '追读感', logic: '逻辑',
  }[c] || c;
}

const allExpanded = ref(false);

function toggleIssue(idx) {
  if (expandedIssues.value.has(idx)) {
    expandedIssues.value.delete(idx);
  } else {
    expandedIssues.value.add(idx);
  }
  // 同步全部展开/收起按钮状态
  allExpanded.value = expandedIssues.value.size === issues.value.length;
}

function toggleAllIssues() {
  if (allExpanded.value) {
    expandedIssues.value = new Set();
  } else {
    expandedIssues.value = new Set(issues.value.map((_, i) => i));
  }
  allExpanded.value = !allExpanded.value;
}

// 自动展开严重和高优先级问题
function autoExpandImportant() {
  const toExpand = new Set();
  issues.value.forEach((issue, idx) => {
    if (issue.severity === 'high' || issue.severity === 'critical') {
      toExpand.add(idx);
    }
  });
  expandedIssues.value = toExpand;
}

async function runReview() {
  if (!props.novelId || !props.chapterId) {
    showToast('请先选择小说和章节');
    return;
  }
  reviewLoading.value = true;
  score.value = null;
  issues.value = [];
  try {
    const payload = await reviewChapter(props.novelId, props.chapterId, {
      provider: props.provider || undefined,
      model: props.model || undefined,
    });
    const data = payload?.data || payload;
    score.value = data.score;
    issues.value = data.issues || [];
    autoExpandImportant();
    emit('review-done', data);
    showToast('审稿完成');
  } catch (err) {
    showToast(err?.response?.data?.message || '审稿失败');
  } finally {
    reviewLoading.value = false;
  }
}

async function runAudit(scope) {
  if (!props.novelId || !props.chapterId) {
    showToast('请先选择小说和章节');
    return;
  }
  auditLoading.value = scope;
  try {
    const payload = await auditChapter(props.novelId, props.chapterId, scope, {
      provider: props.provider || undefined,
      model: props.model || undefined,
    });
    const data = payload?.data || payload;
    // 如果是完整审计返回数组
    if (Array.isArray(data)) {
      auditResults.value = [...auditResults.value, ...data];
    } else {
      const existingIdx = auditResults.value.findIndex(r => r.auditType === data.auditType);
      if (existingIdx >= 0) {
        auditResults.value[existingIdx] = data;
      } else {
        auditResults.value.push(data);
      }
    }
    showToast(`${scope === 'full' ? '完整' : scope}审计完成`);
  } catch (err) {
    showToast(err?.response?.data?.message || '审计失败');
  } finally {
    auditLoading.value = null;
  }
}
</script>

<style scoped>
.review-panel {
  padding: 12px 0;
}

.review-section {
  margin-bottom: 16px;
}

.section-label {
  font-size: 12px;
  color: #999;
  margin-bottom: 8px;
  padding-left: 2px;
}

.review-tabs {
  display: flex;
  gap: 0;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e5e5e5;
}

.review-tab {
  flex: 1;
  padding: 7px 0;
  border: none;
  background: #fff;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s;
  position: relative;
}

.review-tab + .review-tab {
  border-left: 1px solid #e5e5e5;
}

.review-tab:hover {
  background: #f7f8fa;
}

.review-tab.active {
  background: #1989fa;
  color: #fff;
}

.audit-actions {
  display: flex;
  gap: 8px;
}

.audit-actions .van-button {
  flex: 1;
}

.review-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 0;
}

.score-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.score-title,
.issues-title {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 12px;
  color: #333;
}

.score-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.score-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.score-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.score-label {
  font-size: 13px;
  color: #666;
}

.score-value {
  font-size: 18px;
  font-weight: 700;
}

.score-bar.track {
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
}

.score-bar.fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}

.issues-section {
  margin-bottom: 16px;
}

.issues-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.issues-title {
  margin: 0;
}

.expand-all-btn {
  font-size: 12px;
  color: #1989fa;
  background: none;
  border: 1px solid #1989fa;
  border-radius: 12px;
  padding: 2px 10px;
  cursor: pointer;
}

.issues-badge {
  display: inline-block;
  background: #ee0a24;
  color: #fff;
  font-size: 12px;
  padding: 1px 7px;
  border-radius: 10px;
  margin-left: 6px;
  vertical-align: middle;
}

.issue-card {
  background: #fff;
  border-radius: 8px;
  padding: 0;
  margin-bottom: 8px;
  border-left: 3px solid #ff976a;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  overflow: hidden;
}

.issue-card.severity-high,
.issue-card.severity-critical {
  border-left-color: #ee0a24;
}

.issue-card.severity-low {
  border-left-color: #07c160;
}

.issue-card.expanded {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.issue-header {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  cursor: pointer;
  user-select: none;
}

.issue-header:hover {
  background: #f7f8fa;
}

.severity-tag {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  color: #fff;
  background: #ff976a;
  flex-shrink: 0;
  margin-top: 2px;
}

.severity-tag.high,
.severity-tag.critical {
  background: #ee0a24;
}

.severity-tag.low {
  background: #07c160;
}

.issue-category {
  font-size: 11px;
  color: #999;
  flex-shrink: 0;
  margin-top: 2px;
}

.issue-desc {
  flex: 1;
  font-size: 13px;
  color: #333;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.issue-toggle {
  flex-shrink: 0;
  color: #999;
  margin-top: 4px;
}

.issue-detail {
  padding: 0 12px 12px;
  border-top: 1px solid #f0f0f0;
  margin-top: 0;
  padding-top: 10px;
}

.issue-evidence {
  font-size: 13px;
  color: #555;
  line-height: 1.7;
  margin-bottom: 8px;
}

.issue-fix {
  font-size: 13px;
  color: #1989fa;
  line-height: 1.7;
  background: #f5f8ff;
  padding: 10px;
  border-radius: 6px;
  border-left: 3px solid #1989fa;
}

.audit-summary {
  margin-bottom: 16px;
}

.audit-item {
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

.audit-type {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.audit-score {
  font-size: 20px;
  font-weight: 700;
  margin: 4px 0;
}

.audit-text {
  font-size: 13px;
  color: #666;
  line-height: 1.5;
}

.audit-issue-count {
  margin-top: 4px;
  font-size: 12px;
  color: #ee0a24;
}

.review-footer {
  display: flex;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}
</style>
