<template>
  <div class="candidate-switcher" v-if="candidates.length > 0">
    <div class="candidate-tabs">
      <button
        v-for="c in candidates"
        :key="c.id"
        :class="['candidate-tab', { active: c.id === activeId }]"
        @click="$emit('select', c.id)"
      >
        {{ c.label }}
      </button>
    </div>

    <!-- 当前候选摘要 -->
    <div v-if="activeCandidate" class="candidate-info">
      <div class="candidate-summary" v-if="activeCandidate.summary">
        <strong>改写摘要：</strong>{{ activeCandidate.summary }}
      </div>
      <div class="candidate-rationale" v-if="activeCandidate.rationale">
        <strong>改写思路：</strong>{{ activeCandidate.rationale }}
      </div>
      <div class="candidate-tags" v-if="activeCandidate.semanticTags && activeCandidate.semanticTags.length">
        <span v-for="tag in activeCandidate.semanticTags" :key="tag" class="candidate-tag">{{ tag }}</span>
      </div>
      <div class="candidate-risks" v-if="activeCandidate.riskNotes && activeCandidate.riskNotes.length">
        <div class="risk-title">注意：</div>
        <ul>
          <li v-for="(note, i) in activeCandidate.riskNotes" :key="i">{{ note }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  candidates: { type: Array, default: () => [] },
  activeId: { type: String, default: null },
});

defineEmits(['select']);

const activeCandidate = computed(() =>
  props.candidates.find(c => c.id === props.activeId) || props.candidates[0] || null
);
</script>

<style scoped>
.candidate-switcher {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
}

.candidate-tabs {
  display: flex;
  gap: 6px;
  padding: 10px 14px;
  border-bottom: 1px solid #f3f4f6;
  flex-wrap: wrap;
}

.candidate-tab {
  padding: 5px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  background: #fff;
  font-size: 13px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.15s;
}

.candidate-tab:hover { border-color: #10b981; color: #10b981; }
.candidate-tab.active {
  background: #10b981;
  color: #fff;
  border-color: #10b981;
}

.candidate-info {
  padding: 12px 14px;
  font-size: 13px;
  line-height: 1.7;
}

.candidate-summary {
  margin-bottom: 6px;
  color: #374151;
}

.candidate-summary strong { color: #059669; }

.candidate-rationale {
  margin-bottom: 6px;
  color: #6b7280;
  font-style: italic;
}

.candidate-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.candidate-tag {
  padding: 2px 10px;
  border-radius: 12px;
  background: #f3f4f6;
  font-size: 11px;
  color: #6b7280;
}

.candidate-risks {
  margin-top: 6px;
  padding: 8px 10px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
  font-size: 12px;
  color: #92400e;
}

.risk-title { font-weight: 600; margin-bottom: 4px; }
.candidate-risks ul { margin: 0; padding-left: 18px; }
.candidate-risks li { margin-bottom: 2px; }
</style>
