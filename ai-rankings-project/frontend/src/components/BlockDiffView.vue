<template>
  <div class="block-diff-view">
    <div class="diff-header">
      <div class="diff-tabs">
        <button :class="{ active: activeTab === 'compare' }" @click="activeTab = 'compare'">
          修改对比
        </button>
        <button :class="{ active: activeTab === 'result' }" @click="activeTab = 'result'">
          完整结果
        </button>
      </div>
      <div class="diff-stats" v-if="stats.total > 0">
        <span class="stat-item stat-equal">不变 {{ stats.unchanged }}</span>
        <span class="stat-item stat-delete">删除 {{ stats.removed }}</span>
        <span class="stat-item stat-insert">新增 {{ stats.added }}</span>
        <span class="stat-item stat-modified">修改 {{ stats.modified }}</span>
      </div>
    </div>

    <!-- 修改对比视图 -->
    <div v-if="activeTab === 'compare'" class="diff-compare">
      <div v-if="diffParagraphs.length === 0" class="diff-empty">
        原文与结果完全相同
      </div>
      <div
        v-for="(p, idx) in visibleParagraphs"
        :key="idx"
        :class="['diff-block', 'diff-' + p.type]"
      >
        <!-- 未修改 -->
        <template v-if="p.type === 'equal'">
          <div class="diff-block-text equal-text">{{ p.text }}</div>
        </template>

        <!-- 删除的段落：左侧红框 -->
        <template v-else-if="p.type === 'delete'">
          <div class="diff-block-label label-delete">删除</div>
          <div class="diff-block-content">
            <div class="diff-side diff-original">
              <div class="diff-side-label">原文</div>
              <div class="diff-side-text delete-text">{{ p.text }}</div>
            </div>
          </div>
        </template>

        <!-- 新增的段落：右侧绿框 -->
        <template v-else-if="p.type === 'insert'">
          <div class="diff-block-label label-insert">新增</div>
          <div class="diff-block-content">
            <div class="diff-side diff-rewritten">
              <div class="diff-side-label">改写</div>
              <div class="diff-side-text insert-text">{{ p.text }}</div>
            </div>
          </div>
        </template>

        <!-- 修改的段落：并排对比 -->
        <template v-else-if="p.type === 'modified'">
          <div class="diff-block-label label-modified">修改</div>
          <div class="diff-block-content diff-side-by-side">
            <div class="diff-side diff-original">
              <div class="diff-side-label">原文</div>
              <div class="diff-side-text">
                <span
                  v-for="(chunk, ci) in getOriginalChunks(p)"
                  :key="ci"
                  :class="['inline-chunk', 'chunk-' + chunk.type]"
                >{{ chunk.text }}</span>
              </div>
            </div>
            <div class="diff-side diff-rewritten">
              <div class="diff-side-label">改写</div>
              <div class="diff-side-text">
                <span
                  v-for="(chunk, ci) in getResultChunks(p)"
                  :key="ci"
                  :class="['inline-chunk', 'chunk-' + chunk.type]"
                >{{ chunk.text }}</span>
              </div>
            </div>
          </div>
        </template>
      </div>

      <div v-if="visibleCount < diffParagraphs.length" class="diff-show-more">
        <button @click="showAll">展示全部（{{ diffParagraphs.length - visibleCount }} 段更多）</button>
      </div>
    </div>

    <!-- 完整结果视图 -->
    <div v-else class="diff-full">
      <!-- 当原文与结果完全相同时 -->
      <div v-if="diffParagraphs.length === 0" class="diff-empty">
        原文与结果完全相同
      </div>
      <template v-else>
        <div
          v-for="(p, idx) in diffParagraphs"
          :key="idx"
          :class="['diff-full-block', 'full-' + p.type]"
        >
          <!-- 未修改段落 -->
          <template v-if="p.type === 'equal'">
            <p class="full-para-text equal-text">{{ p.text }}</p>
          </template>

          <!-- 新增段落 -->
          <template v-else-if="p.type === 'insert'">
            <span class="full-para-marker marker-insert">新 增</span>
            <p class="full-para-text insert-text">{{ p.text }}</p>
          </template>

          <!-- 删除段落 -->
          <template v-else-if="p.type === 'delete'">
            <span class="full-para-marker marker-delete">已删除</span>
            <p class="full-para-text delete-text">{{ p.text }}</p>
          </template>

          <!-- 修改段落：展示行内对比 + 可展开的原文 -->
          <template v-else-if="p.type === 'modified'">
            <div class="full-modified-header">
              <span class="full-para-marker marker-modified">已修改</span>
              <span class="full-modified-compare">
                <span
                  v-for="(chunk, ci) in p.chunks || []"
                  :key="ci"
                  :class="['inline-chunk', 'chunk-' + chunk.type]"
                >{{ chunk.text }}</span>
              </span>
            </div>
            <details class="full-original-details">
              <summary class="full-original-summary">查 看 原 文</summary>
              <blockquote class="full-original-quote">
                <p class="full-para-text original-text">{{ p.oldText }}</p>
              </blockquote>
            </details>
          </template>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  diffParagraphs: { type: Array, default: () => [] },
  stats: { type: Object, default: () => ({ added: 0, removed: 0, modified: 0, unchanged: 0, total: 0 }) },
  fullResultText: { type: String, default: '' },
  initialVisible: { type: Number, default: 20 },
});

const activeTab = ref('compare');
const visibleCount = ref(props.initialVisible);

const visibleParagraphs = computed(() => props.diffParagraphs.slice(0, visibleCount.value));

function getOriginalChunks(p) {
  return (p.chunks || []).filter(c => c.type !== 'insert');
}

function getResultChunks(p) {
  return (p.chunks || []).filter(c => c.type !== 'delete');
}

function showAll() {
  visibleCount.value = props.diffParagraphs.length;
}
</script>

<style scoped>
.block-diff-view {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
}

.diff-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid #f3f4f6;
  background: #fafbfc;
  flex-wrap: wrap;
  gap: 8px;
}

.diff-tabs {
  display: flex;
  gap: 4px;
}

.diff-tabs button {
  padding: 4px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  font-size: 13px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.15s;
}

.diff-tabs button.active {
  background: #1f2937;
  color: #fff;
  border-color: #1f2937;
}

.diff-stats {
  display: flex;
  gap: 10px;
  font-size: 12px;
}

.stat-item {
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.stat-equal { background: #f3f4f6; color: #6b7280; }
.stat-delete { background: #fee2e2; color: #dc2626; }
.stat-insert { background: #d1fae5; color: #059669; }
.stat-modified { background: #fff7ed; color: #ea580c; }

.diff-compare {
  padding: 12px;
  max-height: 500px;
  overflow-y: auto;
}

.diff-empty {
  text-align: center;
  padding: 32px;
  color: #9ca3af;
  font-size: 14px;
}

.diff-block {
  margin-bottom: 12px;
}

.diff-block-label {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  display: inline-block;
  margin-bottom: 6px;
}

.label-delete { background: #fee2e2; color: #dc2626; }
.label-insert { background: #d1fae5; color: #059669; }
.label-modified { background: #fff7ed; color: #ea580c; }

.diff-block-text {
  font-size: 14px;
  line-height: 1.8;
  padding: 8px 12px;
  border-radius: 8px;
}

.equal-text { background: #f9fafb; color: #6b7280; }

.diff-block-content {
  display: flex;
  gap: 10px;
}

.diff-side-by-side {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.diff-side {
  flex: 1;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.8;
}

.diff-original {
  background: #fef2f2;
  border: 1px solid #fecaca;
}

.diff-rewritten {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
}

.diff-side-label {
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 6px;
  color: #6b7280;
}

.delete-text { color: #991b1b; }
.insert-text { color: #065f46; }

/* 句子级 inline diff */
.inline-chunk { transition: background 0.15s; }
.chunk-equal { color: inherit; }
.chunk-delete { background: #fecaca; color: #991b1b; text-decoration: line-through; padding: 0 2px; border-radius: 3px; }
.chunk-insert { background: #a7f3d0; color: #065f46; padding: 0 2px; border-radius: 3px; }

.diff-show-more {
  text-align: center;
  padding: 10px;
}

.diff-show-more button {
  padding: 6px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  font-size: 13px;
  color: #6b7280;
  cursor: pointer;
}

.diff-full {
  padding: 16px;
  max-height: 70vh;
  overflow-y: auto;
}

/* 完整结果视图 - 段落标注版 */
.diff-full-block {
  margin-bottom: 14px;
  padding: 10px 14px;
  border-radius: 8px;
  border-left: 3px solid transparent;
}

.full-equal {
  border-left-color: #d1d5db;
  background: transparent;
  padding: 4px 14px;
}

.full-insert {
  border-left-color: #22c55e;
  background: #f0fdf4;
}

.full-delete {
  border-left-color: #ef4444;
  background: #fef2f2;
  opacity: 0.7;
}

.full-modified {
  border-left-color: #f97316;
  background: #fff7ed;
}

.full-para-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.9;
  white-space: pre-wrap;
  word-break: break-word;
}

.full-para-text.equal-text { color: #6b7280; }
.full-para-text.insert-text { color: #065f46; }
.full-para-text.delete-text {
  color: #9ca3af;
  text-decoration: line-through;
}
.full-para-text.original-text {
  color: #6b7280;
  font-size: 13px;
  font-style: italic;
}

/* 段落标记 */
.full-para-marker {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  padding: 1px 8px;
  border-radius: 10px;
  margin-bottom: 6px;
}

.marker-insert {
  background: #bbf7d0;
  color: #166534;
}

.marker-delete {
  background: #fecaca;
  color: #991b1b;
}

.marker-modified {
  background: #fed7aa;
  color: #9a3412;
}

/* 修改段落的行内对比区 */
.full-modified-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.full-modified-compare {
  font-size: 14px;
  line-height: 1.9;
  color: #374151;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 原文折叠区 */
.full-original-details {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed #fca5a5;
}

.full-original-summary {
  font-size: 12px;
  font-weight: 600;
  color: #ea580c;
  cursor: pointer;
  user-select: none;
  padding: 2px 0;
}

.full-original-summary:hover {
  color: #c2410c;
  text-decoration: underline;
}

.full-original-quote {
  margin: 6px 0 0;
  padding: 8px 12px;
  background: #fef2f2;
  border-radius: 6px;
  border-left: 3px solid #fca5a5;
}

.full-original-quote .original-text {
  color: #991b1b;
}

.diff-full-text {
  font-size: 14px;
  line-height: 1.8;
  white-space: pre-wrap;
  color: #1f2937;
}
</style>
