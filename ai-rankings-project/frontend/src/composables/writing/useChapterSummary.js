import { ref } from 'vue';
import { updateChapter } from '../../api/books.js';
import { summarizeChapter } from '../../api/writing.js';
import { countChineseWords } from '../../utils/usageStats.js';

export function useChapterSummary(chapters, activeChapter, activeBook, draftContent, draftTitle, dirty, aiForm, chapterMenuOpenId, saveCurrentChapter, showToast, showSuccessToast) {
  const summaryModalOpen = ref(false);
  const summaryChapter = ref(null);
  const summaryDraft = ref('');
  const summaryGeneratingId = ref(null);
  const batchSummaryLoading = ref(false);

  function openChapterSummary(chapter) {
    summaryChapter.value = chapter;
    summaryDraft.value = chapter?.summary || '';
    summaryModalOpen.value = true;
    chapterMenuOpenId.value = null;
  }

  async function saveChapterSummary() {
    if (!summaryChapter.value || !activeBook.value) return;
    try {
      const saved = await updateChapter(summaryChapter.value.id, {
        project_id: activeBook.value.id,
        title: summaryChapter.value.title,
        content: summaryChapter.value.content || '',
        summary: summaryDraft.value.trim(),
        word_count: summaryChapter.value.word_count || 0,
        ai_model: aiForm.model,
      });
      const index = chapters.value.findIndex((item) => item.id === saved.id);
      if (index >= 0) chapters.value.splice(index, 1, saved);
      if (activeChapter.value?.id === saved.id) activeChapter.value = saved;
      summaryChapter.value = saved;
      showSuccessToast('概要已保存');
    } catch (error) {
      showToast('保存概要失败：' + error.message);
    }
  }

  async function generateChapterSummary(chapter, options = {}) {
    if (!chapter) return;
    const isActive = activeChapter.value?.id === chapter.id;
    const content = isActive ? draftContent.value : chapter.content;
    if (!content?.trim()) {
      showToast('章节正文为空，无法生成概要');
      return;
    }
    summaryGeneratingId.value = chapter.id;
    try {
      if (isActive && dirty.value) await saveCurrentChapter(false);
      const result = await summarizeChapter({
        title: isActive ? draftTitle.value : chapter.title,
        content,
      });
      const saved = await updateChapter(chapter.id, {
        project_id: activeBook.value.id,
        title: isActive ? draftTitle.value : chapter.title,
        content,
        summary: result.summary || '',
        word_count: countChineseWords(content),
        ai_model: aiForm.model,
      });
      const index = chapters.value.findIndex((item) => item.id === saved.id);
      if (index >= 0) chapters.value.splice(index, 1, saved);
      if (activeChapter.value?.id === saved.id) activeChapter.value = saved;
      if (options.keepOpen) {
        summaryChapter.value = saved;
        summaryDraft.value = saved.summary || '';
        summaryModalOpen.value = true;
      }
      showSuccessToast('章节概要已生成');
    } catch (error) {
      showToast('生成概要失败：' + error.message);
    } finally {
      summaryGeneratingId.value = null;
    }
  }

  async function batchGenerateSummaries() {
    batchSummaryLoading.value = true;
    try {
      for (const chapter of chapters.value) {
        if (!chapter.summary && chapter.content?.trim()) {
          await generateChapterSummary(chapter, { keepOpen: summaryChapter.value?.id === chapter.id });
        }
      }
      showSuccessToast('批量生成完成');
    } finally {
      batchSummaryLoading.value = false;
    }
  }

  return {
    summaryModalOpen,
    summaryChapter,
    summaryDraft,
    summaryGeneratingId,
    batchSummaryLoading,
    openChapterSummary,
    saveChapterSummary,
    generateChapterSummary,
    batchGenerateSummaries,
  };
}
