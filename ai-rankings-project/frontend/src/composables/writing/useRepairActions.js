import { ref } from 'vue';

export function useRepairActions(activeChapter, activeBook, draftContent, chapters, repairDiffData, normalizeParagraphIndent, updateChapter, fetchChapters, showSuccessToast, showFailToast) {
  const repairLoading = ref(false);
  const showRepairPanel = ref(false);
  const currentReviewIssues = ref([]);

  function onReviewDone(data) {
    currentReviewIssues.value = data.issues || [];
  }

  function onStartRepair({ issues }) {
    currentReviewIssues.value = issues || currentReviewIssues.value;
    showRepairPanel.value = true;
  }

  async function onApplyRepair(repairedContent) {
    if (!activeChapter.value?.id || !repairedContent) return;
    repairLoading.value = true;
    const normalized = normalizeParagraphIndent(repairedContent);
    try {
      await updateChapter(activeChapter.value.id, { project_id: activeBook.value.id, content: normalized, word_count: normalized.length });
      draftContent.value = normalized;
      if (activeBook.value?.id) {
        chapters.value = await fetchChapters(activeBook.value.id);
        const fresh = chapters.value.find(c => c.id === activeChapter.value.id);
        if (fresh) {
          activeChapter.value = fresh;
          draftContent.value = fresh.content || '';
        }
      }
      showRepairPanel.value = false;
      repairDiffData.value = null;
      showSuccessToast('修复内容已应用到章节');
    } catch (err) {
      showFailToast('应用修复失败');
    } finally {
      repairLoading.value = false;
    }
  }

  function onRepairDone() {
    repairLoading.value = false;
  }

  return {
    repairLoading,
    showRepairPanel,
    currentReviewIssues,
    onReviewDone,
    onStartRepair,
    onApplyRepair,
    onRepairDone,
  };
}
