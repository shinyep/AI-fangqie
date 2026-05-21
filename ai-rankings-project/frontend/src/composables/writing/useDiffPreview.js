import { computed, ref } from 'vue';
import { computeTextDiff } from '../../utils/diff.js';

export function useDiffPreview(aiForm, isTextProcessMode, textSelection) {
  const repairDiffData = ref(null);
  const repairDiffTab = ref('original');
  const repairDiffParagraphs = computed(() => repairDiffData.value?.paragraphs || []);

  const showInlinePreview = computed(() => isTextProcessMode.value && aiForm.result.length > 0);
  const inlineDiffTab = ref('original');
  const inlineDiffResult = computed(() => {
    if (!isTextProcessMode.value || !aiForm.result) return { paragraphs: [], stats: { added: 0, removed: 0, modified: 0, unchanged: 0, total: 0 } };
    const source = (aiForm.sourceText || '').trim();
    if (!source) return { paragraphs: [], stats: { added: 0, removed: 0, modified: 0, unchanged: 0, total: 0 } };
    const diff = computeTextDiff(source, aiForm.result);
    // 如果 diff 结果为空（完全相同），直接显示全文作为 equal
    if (diff.paragraphs.length === 0) {
      return {
        paragraphs: [{ type: 'equal', text: aiForm.result }],
        stats: { added: 0, removed: 0, modified: 0, unchanged: 1, total: 1 },
      };
    }
    return { ...diff, stats: { ...diff.stats, total: diff.stats.added + diff.stats.removed + diff.stats.modified + diff.stats.unchanged } };
  });
  const inlineDiffParagraphs = computed(() => inlineDiffResult.value.paragraphs);
  const inlineDiffStats = computed(() => inlineDiffResult.value.stats);

  function onRepairDiffReady(data) {
    repairDiffData.value = data;
    repairDiffTab.value = 'original';
  }

  function dismissInlinePreview() {
    aiForm.result = '';
    inlineDiffTab.value = 'original';
    textSelection.value = { start: 0, end: 0, text: '' };
  }

  return {
    repairDiffData,
    repairDiffTab,
    repairDiffParagraphs,
    showInlinePreview,
    inlineDiffTab,
    inlineDiffResult,
    inlineDiffParagraphs,
    inlineDiffStats,
    onRepairDiffReady,
    dismissInlinePreview,
  };
}
