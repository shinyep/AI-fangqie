import { ref } from 'vue';
import { createChapter, deleteChapter, fetchChapters } from '../../api/books.js';

export function useChapterManagement(activeBook, aiForm, dirty, saveCurrentChapter, setActiveChapterWrapper, showToast, showSuccessToast) {
  const chapters = ref([]);
  const activeChapter = ref(null);
  const chapterMenuOpenId = ref(null);
  const chapterMenuPosition = ref({ top: 0, left: 0 });

  function formatDateTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function chapterName(chapter) {
    return chapter.title || `第${chapter.chapter_index || ''}章`;
  }

  async function addChapter() {
    if (!activeBook.value) return;
    if (dirty.value) await saveCurrentChapter(false);
    const nextIndex = chapters.value.length + 1;
    try {
      const chapter = await createChapter({
        project_id: activeBook.value.id,
        chapter_index: nextIndex,
        title: `第${nextIndex}章`,
        content: '',
        word_count: 0,
        ai_model: aiForm.model,
      });
      chapters.value.push(chapter);
      setActiveChapterWrapper(chapter);
      showSuccessToast('已新建章节');
    } catch (error) {
      showToast('新建章节失败：' + error.message);
    }
  }

  async function insertChapterAround(chapter, position) {
    chapterMenuOpenId.value = null;
    if (!activeBook.value) return;
    if (dirty.value) await saveCurrentChapter(false);
    const baseIndex = chapters.value.findIndex((item) => item.id === chapter.id);
    const insertAt = position === 'before' ? baseIndex : baseIndex + 1;
    const nextIndex = Math.max(1, insertAt + 1);
    try {
      const created = await createChapter({
        project_id: activeBook.value.id,
        chapter_index: nextIndex,
        title: `第${nextIndex}章`,
        content: '',
        summary: '',
        word_count: 0,
        ai_model: aiForm.model,
      });
      chapters.value = await fetchChapters(activeBook.value.id);
      setActiveChapterWrapper(chapters.value.find((item) => item.id === created.id) || created);
      showSuccessToast('已插入章节');
    } catch (error) {
      showToast('插入章节失败：' + error.message);
    }
  }

  function toggleChapterMenu(chapter, event) {
    if (chapterMenuOpenId.value === chapter.id) {
      chapterMenuOpenId.value = null;
      return;
    }
    const btn = event?.currentTarget || event?.target;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      chapterMenuPosition.value = { top: rect.bottom + 6, left: rect.left };
    }
    chapterMenuOpenId.value = chapter.id;
  }

  async function removeChapter(chapter) {
    if (!activeBook.value || !chapter) return;
    try {
      await deleteChapter(activeBook.value.id, chapter.id);
      const index = chapters.value.findIndex((item) => item.id === chapter.id);
      if (index >= 0) chapters.value.splice(index, 1);
      if (activeChapter.value?.id === chapter.id) {
        setActiveChapterWrapper(chapters.value[Math.max(0, index - 1)] || null);
      }
      showSuccessToast('已删除章节');
    } catch (error) {
      showToast('删除章节失败：' + error.message);
    }
  }

  function exportChapter(chapter) {
    chapterMenuOpenId.value = null;
    const text = [`# ${chapterName(chapter)}`, chapter.summary ? `## 概要\n${chapter.summary}` : '', chapter.content || ''].filter(Boolean).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${chapterName(chapter)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function selectChapter(chapter) {
    if (activeChapter.value?.id === chapter.id) return;
    if (dirty.value) await saveCurrentChapter(false);
    setActiveChapterWrapper(chapter);
  }

  return {
    chapters,
    activeChapter,
    chapterMenuOpenId,
    chapterMenuPosition,
    formatDateTime,
    chapterName,
    addChapter,
    insertChapterAround,
    toggleChapterMenu,
    removeChapter,
    exportChapter,
    selectChapter,
  };
}
