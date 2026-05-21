<template>
  <div class="repair-panel">
    <!-- 修复模式选择 -->
    <div class="repair-modes">
      <label class="mode-label">修复模式：</label>
      <div class="mode-options">
        <button
          :class="['mode-btn', { active: repairMode === 'light' }]"
          @click="repairMode = 'light'"
        >
          轻量修复
        </button>
        <button
          :class="['mode-btn', { active: repairMode === 'heavy' }]"
          @click="repairMode = 'heavy'"
        >
          重度修复
        </button>
      </div>
    </div>

    <!-- 问题汇总 -->
    <div v-if="issues.length > 0" class="issues-summary">
      <h5>{{ issues.length }} 个待修复问题</h5>
      <ul>
        <li v-for="(issue, idx) in issues.slice(0, 5)" :key="idx" class="issue-line">
          <span :class="['dot', issue.severity || 'medium']"></span>
          {{ issue.evidence || issue.description || issue.fixSuggestion || '未描述' }}
        </li>
      </ul>
      <div v-if="issues.length > 5" class="more-issues">
        ...还有 {{ issues.length - 5 }} 个问题
      </div>
    </div>

    <!-- 执行修复按钮 -->
    <van-button
      type="primary"
      size="small"
      :loading="streaming"
      :disabled="streaming"
      @click="startRepair"
    >
      {{ streaming ? '修复中...' : '执行修复' }}
    </van-button>

    <!-- SSE 流式输出区域（修复完成后可折叠） -->
    <div v-if="streamOutput.length > 0 || streaming" class="stream-view">
      <div class="stream-header" @click="streamCollapsed = !streamCollapsed">
        <span>修复输出{{ streaming ? '' : '（点击展开/收起）' }}</span>
        <div class="stream-header-right">
          <van-loading v-if="streaming" size="14" />
          <van-icon :name="streamCollapsed ? 'arrow-down' : 'arrow-up'" size="16" />
        </div>
      </div>
      <div v-if="!streamCollapsed || streaming" class="stream-content">
        <pre>{{ streamOutput }}</pre>
        <span v-if="streaming" class="cursor-blink">|</span>
      </div>
    </div>

    <!-- 修复完成后：差异对比 -->
    <div v-if="repairDone && repairedContent && diffParagraphs.length > 0" class="diff-section">
      <!-- 差异统计 -->
      <div class="diff-stats">
        <div class="stat-item added">
          <span class="stat-num">{{ diffStats.added }}</span>
          <span class="stat-label">新增段落</span>
        </div>
        <div class="stat-item removed">
          <span class="stat-num">{{ diffStats.removed }}</span>
          <span class="stat-label">删除段落</span>
        </div>
        <div class="stat-item modified">
          <span class="stat-num">{{ diffStats.modified }}</span>
          <span class="stat-label">修改段落</span>
        </div>
        <div class="stat-item unchanged">
          <span class="stat-num">{{ diffStats.unchanged }}</span>
          <span class="stat-label">不变段落</span>
        </div>
      </div>

      <!-- 视图切换 -->
      <div class="diff-tabs">
        <button
          :class="['diff-tab', { active: diffViewMode === 'inline' }]"
          @click="diffViewMode = 'inline'"
        >
          修改对比
        </button>
        <button
          :class="['diff-tab', { active: diffViewMode === 'full' }]"
          @click="diffViewMode = 'full'"
        >
          修复后全文
        </button>
      </div>

      <!-- 行内对比视图 -->
      <div v-if="diffViewMode === 'inline'" class="diff-inline">
        <div
          v-for="(p, idx) in visibleDiffParagraphs"
          :key="idx"
          :class="['diff-para', 'diff-para-' + p.type]"
        >
          <!-- 未修改段落 -->
          <template v-if="p.type === 'equal'">
            <p class="diff-text equal-text">{{ p.text }}</p>
          </template>

          <!-- 删除的段落 -->
          <template v-else-if="p.type === 'delete'">
            <div class="diff-label delete-label">删除</div>
            <p class="diff-text delete-text">{{ p.text }}</p>
          </template>

          <!-- 新增的段落 -->
          <template v-else-if="p.type === 'insert'">
            <div class="diff-label insert-label">新增</div>
            <p class="diff-text insert-text">{{ p.text }}</p>
          </template>

          <!-- 修改的段落（句子级 inline diff） -->
          <template v-else-if="p.type === 'modified'">
            <div class="diff-label modified-label">修改</div>
            <p class="diff-text">
              <span
                v-for="(chunk, ci) in p.chunks"
                :key="ci"
                :class="['diff-chunk', 'chunk-' + chunk.type]"
              >{{ chunk.text }}</span>
            </p>
          </template>
        </div>

        <!-- 展示更多 -->
        <div v-if="visibleDiffCount < diffParagraphs.length" class="diff-more">
          <van-button size="small" plain @click="showAllDiff">
            展示全部（{{ diffParagraphs.length - visibleDiffCount }} 段更多）
          </van-button>
        </div>
      </div>

      <!-- 修复后全文视图 -->
      <div v-else class="diff-full">
        <pre class="full-repaired-text">{{ repairedContent }}</pre>
      </div>
    </div>

    <!-- 修复完成后的操作 -->
    <div v-if="repairDone && repairedContent" class="repair-result-actions">
      <van-button type="primary" size="small" @click="$emit('apply', repairedContent)">
        应用修复并替换章节
      </van-button>
      <van-button plain size="small" @click="resetRepair">
        丢弃，重新修复
      </van-button>
    </div>

    <!-- 修复后自动重审结果 -->
    <div v-if="reReviewResult" class="re-review">
      <h5>修复后自动审稿评分</h5>
      <div v-if="reReviewResult.score" class="mini-scores">
        <span v-for="dim in dims" :key="dim" class="mini-score">
          {{ dimLabels[dim] }}: <b :style="{ color: scoreColor(reReviewResult.score[dim]) }">{{ reReviewResult.score[dim] }}</b>
        </span>
      </div>
      <div v-if="reReviewResult.error" class="re-review-error">
        重审失败: {{ reReviewResult.error }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { showToast } from 'vant';
import { repairChapterStream } from '../api/novelReview.js';
import { computeTextDiff } from '../utils/diff.js';

const props = defineProps({
  novelId: { type: [Number, String], default: 0 },
  chapterId: { type: [Number, String], default: 0 },
  content: { type: String, default: '' },
  issues: { type: Array, default: () => [] },
  provider: { type: String, default: '' },
  model: { type: String, default: '' },
});

const emit = defineEmits(['apply', 'done', 'diff-ready']);

const repairMode = ref('light');
const streaming = ref(false);
const streamOutput = ref('');
const streamCollapsed = ref(true);
const repairDone = ref(false);
const repairedContent = ref('');
const reReviewResult = ref(null);

const diffViewMode = ref('inline');
const visibleDiffCount = ref(30); // 初始展示30个段落

const dims = ['coherence', 'repetition', 'pacing', 'voice', 'engagement', 'overall'];
const dimLabels = {
  coherence: '连贯性', repetition: '重复率', pacing: '节奏',
  voice: '文风', engagement: '追读感', overall: '综合',
};

// 计算差异
const diffResult = computed(() => {
  if (!props.content || !repairedContent.value) return { paragraphs: [], stats: { added: 0, removed: 0, modified: 0, unchanged: 0 } };
  return computeTextDiff(props.content, repairedContent.value);
});

const diffParagraphs = computed(() => diffResult.value.paragraphs);
const diffStats = computed(() => diffResult.value.stats);
const visibleDiffParagraphs = computed(() => diffParagraphs.value.slice(0, visibleDiffCount.value));

function showAllDiff() {
  visibleDiffCount.value = diffParagraphs.value.length;
}

function scoreColor(v) {
  if (v == null) return '#999';
  if (v >= 80) return '#07c160';
  if (v >= 60) return '#ff976a';
  return '#ee0a24';
}

async function startRepair() {
  if (!props.novelId || !props.chapterId) {
    showToast('请先选择小说和章节');
    return;
  }

  streaming.value = true;
  streamOutput.value = '';
  streamCollapsed.value = false;
  repairDone.value = false;
  repairedContent.value = '';
  reReviewResult.value = null;
  diffViewMode.value = 'inline';
  visibleDiffCount.value = 30;
  diffEmitted = false;

  try {
    const response = await repairChapterStream(props.novelId, props.chapterId, {
      mode: repairMode.value,
      issues: props.issues,
      provider: props.provider || undefined,
      model: props.model || undefined,
      autoApply: true,
      autoReview: true,
    });

    if (!response.ok) {
      throw new Error(`请求失败 (${response.status})`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            handleSSEEvent(data);
          } catch { /* 跳过解析失败的帧 */ }
        }
      }
    }

    if (buffer.startsWith('data: ')) {
      try {
        const data = JSON.parse(buffer.slice(6));
        handleSSEEvent(data);
      } catch { /* ignore */ }
    }
  } catch (err) {
    showToast('修复请求失败: ' + err.message);
  } finally {
    streaming.value = false;
    streamCollapsed.value = true;
  }
}

function handleSSEEvent(data) {
  switch (data.type) {
    case 'status':
      if (data.status === 'succeeded' && data.repairedContent) {
        repairedContent.value = data.repairedContent;
        repairDone.value = true;
        // 异步计算 diff 并通知父组件
        emitDiffReady();
      } else if (data.status === 'failed') {
        showToast('修复失败: ' + (data.message || '未知错误'));
      }
      break;
    case 'token':
      streamOutput.value += data.content || '';
      break;
    case 'finalize':
      if (data.result?.reReviewed) {
        reReviewResult.value = data.result.reReviewed;
      }
      if (data.result?.saved) {
        showToast('修复已应用');
      }
      emit('done', data.result);
      // 确保 diff 数据已发送（finalize可能晚于succeeded）
      emitDiffReady();
      break;
    case 'error':
      showToast('修复出错: ' + (data.message || ''));
      break;
  }
}

let diffEmitted = false;
function emitDiffReady() {
  if (diffEmitted || !props.content || !repairedContent.value) return;
  diffEmitted = true;
  const result = computeTextDiff(props.content, repairedContent.value);
  emit('diff-ready', {
    repairedContent: repairedContent.value,
    paragraphs: result.paragraphs,
    stats: result.stats,
  });
}

function resetRepair() {
  streamOutput.value = '';
  streamCollapsed.value = true;
  repairDone.value = false;
  repairedContent.value = '';
  reReviewResult.value = null;
  diffEmitted = false;
}
</script>

<style scoped>
.repair-panel {
  padding: 12px 0;
}

.repair-modes {
  margin-bottom: 12px;
}

.mode-label {
  font-size: 13px;
  color: #666;
  margin-bottom: 6px;
  display: block;
}

.mode-options {
  display: flex;
  gap: 8px;
}

.mode-btn {
  padding: 4px 14px;
  border: 1px solid #ddd;
  border-radius: 14px;
  background: #fff;
  font-size: 13px;
  color: #666;
  cursor: pointer;
}

.mode-btn.active {
  background: #1989fa;
  border-color: #1989fa;
  color: #fff;
}

.issues-summary {
  margin-bottom: 16px;
}

.issues-summary h5 {
  font-size: 14px;
  margin: 0 0 8px;
  color: #333;
}

.issue-line {
  font-size: 13px;
  color: #555;
  margin-bottom: 4px;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  line-height: 1.5;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-top: 5px;
  flex-shrink: 0;
  background: #ff976a;
}

.dot.high, .dot.critical { background: #ee0a24; }
.dot.low { background: #07c160; }

.more-issues {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

/* 流式输出 */
.stream-view {
  margin-top: 16px;
  background: #1e1e1e;
  border-radius: 8px;
  padding: 0;
  overflow: hidden;
}

.stream-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #999;
  padding: 8px 12px;
  cursor: pointer;
  user-select: none;
}

.stream-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stream-content {
  position: relative;
  padding: 0 12px 12px;
}

.stream-content pre {
  color: #d4d4d4;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
  max-height: 400px;
  overflow-y: auto;
}

.cursor-blink {
  color: #1989fa;
  animation: blink 1s infinite;
}

@keyframes blink {
  50% { opacity: 0; }
}

/* 差异对比区域 */
.diff-section {
  margin-top: 16px;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

/* 差异统计 */
.diff-stats {
  display: flex;
  gap: 0;
  border-bottom: 1px solid #f0f0f0;
}

.stat-item {
  flex: 1;
  text-align: center;
  padding: 12px 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-item + .stat-item {
  border-left: 1px solid #f0f0f0;
}

.stat-num {
  font-size: 20px;
  font-weight: 700;
}

.stat-label {
  font-size: 11px;
  color: #999;
}

.stat-item.added .stat-num { color: #07c160; }
.stat-item.removed .stat-num { color: #ee0a24; }
.stat-item.modified .stat-num { color: #ff976a; }
.stat-item.unchanged .stat-num { color: #999; }

/* 视图切换 */
.diff-tabs {
  display: flex;
  border-bottom: 1px solid #f0f0f0;
}

.diff-tab {
  flex: 1;
  padding: 8px;
  font-size: 13px;
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  position: relative;
}

.diff-tab.active {
  color: #1989fa;
  font-weight: 600;
}

.diff-tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 20%;
  right: 20%;
  height: 2px;
  background: #1989fa;
  border-radius: 1px;
}

/* 行内对比 */
.diff-inline {
  padding: 12px;
  max-height: 500px;
  overflow-y: auto;
}

.diff-para {
  margin-bottom: 12px;
  border-radius: 6px;
  padding: 8px 12px;
  position: relative;
}

.diff-para-equal {
  background: transparent;
  padding: 4px 12px;
}

.diff-para-delete {
  background: #fff0f0;
  border-left: 3px solid #ee0a24;
}

.diff-para-insert {
  background: #f0fff4;
  border-left: 3px solid #07c160;
}

.diff-para-modified {
  background: #fffaf0;
  border-left: 3px solid #ff976a;
}

.diff-label {
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 4px;
}

.delete-label { color: #ee0a24; }
.insert-label { color: #07c160; }
.modified-label { color: #ff976a; }

.diff-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.8;
  color: #333;
  white-space: pre-wrap;
}

.equal-text {
  color: #666;
}

.delete-text {
  color: #999;
  text-decoration: line-through;
}

.insert-text {
  color: #333;
}

/* 句子级 chunk 样式 */
.diff-chunk {
  line-height: 1.8;
}

.chunk-equal {
  color: #666;
}

.chunk-delete {
  background: #ffe0e0;
  color: #999;
  text-decoration: line-through;
  border-radius: 2px;
  padding: 0 2px;
}

.chunk-insert {
  background: #d4f5e0;
  color: #333;
  border-radius: 2px;
  padding: 0 2px;
}

.diff-more {
  text-align: center;
  padding: 8px;
}

/* 全文视图 */
.diff-full {
  padding: 12px;
}

.full-repaired-text {
  font-size: 14px;
  line-height: 1.8;
  color: #333;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 500px;
  overflow-y: auto;
  margin: 0;
  background: #fafafa;
  padding: 12px;
  border-radius: 6px;
}

.repair-result-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.re-review {
  margin-top: 16px;
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

.re-review h5 {
  font-size: 14px;
  margin: 0 0 8px;
  color: #333;
}

.mini-scores {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mini-score {
  font-size: 12px;
  color: #666;
}

.mini-score b {
  font-size: 14px;
}

.re-review-error {
  font-size: 12px;
  color: #ee0a24;
}
</style>
