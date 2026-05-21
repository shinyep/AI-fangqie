<template>
  <van-popup
    :model-value="visible"
    position="bottom"
    :style="{ height: '85%' }"
    round
    closeable
    @update:model-value="$emit('update:visible', $event)"
  >
    <div class="wb-root">
      <h3 class="wb-title">{{ modeTitle }}</h3>
      <div class="wb-mode-tabs">
        <van-button size="small" :type="mode === 'refine' ? 'primary' : 'default'" @click="$emit('update:mode', 'refine')">完善</van-button>
        <van-button size="small" :type="mode === 'split' ? 'primary' : 'default'" @click="$emit('update:mode', 'split')">拆分</van-button>
        <van-button size="small" :type="mode === 'scene_cards' ? 'primary' : 'default'" @click="$emit('update:mode', 'scene_cards')">场景卡</van-button>
        <van-button size="small" :type="mode === 'task_sheet' ? 'primary' : 'default'" @click="$emit('update:mode', 'task_sheet')">任务单</van-button>
        <van-button size="small" :type="mode === 'assess' ? 'primary' : 'default'" @click="$emit('update:mode', 'assess')">评估</van-button>
      </div>
      <template v-if="mode === 'refine'">
        <span class="wb-label">完善方向</span>
        <div class="wb-options">
          <button v-for="opt in refineOptions" :key="opt.key" class="opt-chip" :class="{ active: refineDirection === opt.key }" @click="refineDirection = opt.key">{{ opt.label }}</button>
        </div>
      </template>
      <template v-if="mode === 'split'">
        <span class="wb-label">拆分方式</span>
        <div class="wb-options">
          <button v-for="opt in splitOptions" :key="opt.key" class="opt-chip" :class="{ active: splitDirection === opt.key }" @click="splitDirection = opt.key">{{ opt.label }}</button>
        </div>
        <van-field v-model="splitCount" label="拆分数量" type="number" :min="2" :max="12" center>
          <template #input><van-stepper v-model="splitCount" min="2" max="12" /></template>
        </van-field>
      </template>
      <template v-if="mode === 'scene_cards'">
        <span class="wb-label">根据当前章节信息，AI 将自动拆解为 3-8 个可执行的场景卡。</span>
      </template>
      <template v-if="mode === 'task_sheet'">
        <span class="wb-label">根据当前章节的边界合同和场景卡，AI 将生成可交给写作器执行的任务单。</span>
      </template>
      <template v-if="mode === 'assess'">
        <span class="wb-label">AI 将评估当前章节创作蓝图的完整性。</span>
      </template>
      <van-field v-model="extraInstruction" label="附加指令" placeholder="额外的AI指令（可选）" type="textarea" rows="2" clearable />
      <div v-if="result" class="wb-result">
        <h4>生成结果</h4>
        <template v-if="mode === 'assess' && result.type === 'json'">
          <div class="assess-result">
            <div class="assess-verdict">
              <van-tag size="large" :type="verdictTagType(result.data.verdict)">{{ verdictLabel(result.data.verdict) }}</van-tag>
              <span class="assess-score">{{ result.data.completeness_score ?? '--' }}/100</span>
            </div>
            <p class="assess-summary">{{ result.data.summary }}</p>
            <div v-if="result.data.issues?.length" class="assess-issues">
              <div v-for="(issue, ii) in result.data.issues" :key="ii" class="issue-item">
                <van-tag size="mini" :type="issue.severity === 'high' ? 'danger' : issue.severity === 'medium' ? 'warning' : ''">{{ issue.severity }}</van-tag>
                <span>{{ issue.summary }}</span>
              </div>
            </div>
          </div>
        </template>
        <div v-else-if="result.type === 'json' && Array.isArray(result.data)" class="wb-preview-list">
          <div v-for="(item, i) in result.data" :key="i" class="wb-preview-item">
            <strong>{{ item.title || item.scene_key || item.name || '#' + (i+1) }}</strong>
            <p>{{ item.purpose || item.summary || item.entry_state || '' }}</p>
          </div>
        </div>
        <div v-else-if="result.type === 'json'" class="wb-preview-obj">
          <p v-if="result.data.writing_focus"><strong>写作重心：</strong>{{ result.data.writing_focus }}</p>
          <p v-if="result.data.conflict_delivery"><strong>冲突呈现：</strong>{{ result.data.conflict_delivery }}</p>
          <p v-if="result.data.emotion_curve"><strong>情绪曲线：</strong>{{ result.data.emotion_curve }}</p>
          <div v-if="result.data.avoid_list?.length" class="chip-row">
            <strong>禁止事项：</strong>
            <van-tag v-for="(a, i) in result.data.avoid_list" :key="i" size="mini" type="danger" plain>{{ a }}</van-tag>
          </div>
          <div v-if="result.data.quality_checklist?.length" class="chip-row">
            <strong>自查清单：</strong>
            <van-tag v-for="(q, i) in result.data.quality_checklist" :key="i" size="mini" type="success" plain>{{ q }}</van-tag>
          </div>
        </div>
        <div v-else class="text-output">{{ result.raw || result.data }}</div>
      </div>
      <div class="wb-actions">
        <van-button :loading="loading" type="primary" block @click="doWorkbench">{{ actionLabel }}</van-button>
        <van-button v-if="result" type="warning" block @click="applyResult">应用结果</van-button>
      </div>
    </div>
  </van-popup>
</template>

<script setup>
import { ref, computed } from 'vue';
import { showToast } from 'vant';
import { refineOutline, splitOutline, generateSceneCards, generateTaskSheet, assessQuality } from '../api/creativeTools.js';

const props = defineProps({
  visible: { type: Boolean, default: false },
  mode: { type: String, default: 'refine' },
  target: { type: Object, default: null },
  toolKey: { type: String, default: '' },
});

const emit = defineEmits(['update:visible', 'update:mode', 'confirm']);

const modeTitle = computed(() => ({
  refine: 'AI完善大纲', split: 'AI拆分细纲',
  scene_cards: 'AI生成场景卡', task_sheet: 'AI生成任务单', assess: 'AI质量评估',
}[props.mode] || 'AI工作台'));

const actionLabel = computed(() => ({
  refine: '开始完善', split: '开始拆分',
  scene_cards: '生成场景卡', task_sheet: '生成任务单', assess: '开始评估',
}[props.mode] || '执行'));

const refineOptions = [
  { key: 'overall', label: '整体扩写' }, { key: 'details', label: '补充细节' },
  { key: 'conflict', label: '强化冲突' }, { key: 'pacing', label: '优化节奏' },
  { key: 'world', label: '补足世界观' },
];

const splitOptions = [
  { key: 'plot', label: '按剧情推进' }, { key: 'conflict', label: '按冲突升级' },
  { key: 'timeline', label: '按时间顺序' }, { key: 'chapter', label: '按章节策划' },
];

const refineDirection = ref('overall');
const splitDirection = ref('plot');
const splitCount = ref(3);
const extraInstruction = ref('');
const loading = ref(false);
const result = ref(null);

async function doWorkbench() {
  if (!props.target) { showToast('请先选择一个章节/节点'); return; }
  loading.value = true;
  result.value = null;
  try {
    if (props.mode === 'refine') {
      result.value = await refineOutline({ tool_key: props.toolKey, original_data: props.target, mode: props.mode, direction: refineDirection.value, extra_instruction: extraInstruction.value.trim() || undefined });
    } else if (props.mode === 'split') {
      result.value = await splitOutline({ tool_key: props.toolKey, original_data: props.target, mode: props.mode, direction: splitDirection.value, split_count: splitCount.value, extra_instruction: extraInstruction.value.trim() || undefined });
    } else if (props.mode === 'scene_cards') {
      result.value = await generateSceneCards({ tool_key: props.toolKey, chapter_data: props.target, extra_instruction: extraInstruction.value.trim() || undefined });
    } else if (props.mode === 'task_sheet') {
      result.value = await generateTaskSheet({ tool_key: props.toolKey, chapter_data: props.target, extra_instruction: extraInstruction.value.trim() || undefined });
    } else if (props.mode === 'assess') {
      result.value = await assessQuality({ tool_key: props.toolKey, chapter_data: props.target, extra_instruction: extraInstruction.value.trim() || undefined });
    }
  } catch (e) { showToast('操作失败: ' + (e.message || '未知错误')); }
  finally { loading.value = false; }
}

function applyResult() {
  if (!result.value) return;
  emit('confirm', { mode: props.mode, target: props.target, result: result.value, direction: props.mode === 'refine' ? refineDirection.value : splitDirection.value });
  result.value = null;
}

function verdictTagType(v) { return { ready: 'success', repairable: 'warning', incomplete: 'danger' }[v] || ''; }
function verdictLabel(v) { return { ready: '就绪', repairable: '需修复', incomplete: '不完整' }[v] || v; }
</script>

<style scoped>
.wb-root { padding: 20px 16px; display: grid; gap: 14px; overflow-y: auto; max-height: 100%; }
.wb-title { margin: 0; font-size: 18px; text-align: center; }
.wb-mode-tabs { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; }
.wb-label { font-size: 13px; font-weight: 600; color: var(--muted); line-height: 1.6; }
.wb-options { display: flex; flex-wrap: wrap; gap: 6px; }
.opt-chip { padding: 6px 14px; border: 1px solid var(--line); border-radius: 20px; background: #fff; font-size: 13px; cursor: pointer; transition: all 0.15s; }
.opt-chip.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.wb-result { background: #f8fafc; border-radius: 8px; padding: 12px; max-height: 300px; overflow-y: auto; }
.wb-result h4 { margin: 0 0 8px; font-size: 14px; }
.wb-preview-list { display: grid; gap: 6px; }
.wb-preview-item { padding: 8px; background: #fff; border-radius: 6px; border: 1px solid #f0f0f0; }
.wb-preview-item strong { font-size: 14px; }
.wb-preview-item p { font-size: 12px; color: var(--muted); margin: 4px 0 0; }
.wb-preview-obj { font-size: 13px; line-height: 1.8; }
.wb-preview-obj p { margin: 4px 0; }
.wb-preview-obj .chip-row { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; margin: 6px 0; }
.assess-result { font-size: 13px; }
.assess-verdict { display: flex; align-items: center; gap: 10px; padding: 4px 0 8px; }
.assess-score { font-size: 24px; font-weight: 700; color: var(--accent); }
.assess-summary { font-size: 14px; margin: 4px 0; line-height: 1.6; }
.assess-issues { display: grid; gap: 4px; margin-top: 6px; }
.issue-item { display: flex; gap: 6px; align-items: flex-start; font-size: 12px; line-height: 1.5; }
.text-output { font-size: 12px; line-height: 1.6; white-space: pre-wrap; }
.wb-actions { display: grid; gap: 8px; margin-top: auto; }
</style>
