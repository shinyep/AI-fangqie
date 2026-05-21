import { computed, ref } from 'vue';
import { countChineseWords } from '../../utils/usageStats.js';

export function useEditor() {
  const draftTitle = ref('');
  const draftContent = ref('');
  const dirty = ref(false);
  const saving = ref(false);
  const lastSavedAt = ref('');
  const contentInputRef = ref(null);
  const textSelection = ref({ start: 0, end: 0, text: '' });
  const processingAnchor = ref(null); // { start, end, text } | null — 处理锚点，不受后续鼠标操作影响

  const draftWordCount = computed(() => countChineseWords(draftContent.value));
  const lastSavedText = computed(() => lastSavedAt.value || '尚未保存');
  const hasActiveSelection = computed(() => {
    const { start, end, text } = textSelection.value;
    return Boolean(text && end > start && draftContent.value.slice(start, end) === text);
  });

  function setActiveChapter(chapter, formatDateTimeFn) {
    draftTitle.value = chapter?.title || '';
    draftContent.value = chapter?.content || '';
    dirty.value = false;
    lastSavedAt.value = chapter?.updated_at ? formatDateTimeFn(chapter.updated_at) : '';
  }

  function markDirty() {
    dirty.value = true;
  }

  function handleContentInput(event) {
    markDirty();
    syncTextSelection(event);
  }

  function syncTextSelection(event) {
    const input = event?.target || contentInputRef.value;
    if (!input) return;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const text = end > start ? draftContent.value.slice(start, end) : '';
    textSelection.value = { start, end, text };
  }

  function refreshTextSelection() {
    syncTextSelection({ target: contentInputRef.value });
    return hasActiveSelection.value ? textSelection.value.text : '';
  }

  function setProcessingAnchor(sel) {
    processingAnchor.value = sel ? { start: sel.start, end: sel.end, text: sel.text } : null;
  }

  function clearProcessingAnchor() {
    processingAnchor.value = null;
  }

  return {
    draftTitle,
    draftContent,
    dirty,
    saving,
    lastSavedAt,
    contentInputRef,
    textSelection,
    draftWordCount,
    lastSavedText,
    hasActiveSelection,
    setActiveChapter,
    markDirty,
    handleContentInput,
    syncTextSelection,
    refreshTextSelection,
    processingAnchor,
    setProcessingAnchor,
    clearProcessingAnchor,
  };
}
