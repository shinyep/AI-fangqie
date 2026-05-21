import { computed, ref } from 'vue';
import { countChineseWords } from '../../utils/usageStats.js';

const INDENT = '　　';

/** 确保每个非空段落以两个全角空格开头 */
export function normalizeParagraphIndent(text) {
  if (!text) return text;
  const lines = text.split('\n');
  let changed = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length === 0) continue;
    // 去掉行首已有的全角空格，统一重新添加两个
    const stripped = line.replace(/^　+/, '');
    if (stripped.length > 0) {
      lines[i] = INDENT + stripped;
      changed = true;
    }
  }
  return changed ? lines.join('\n') : text;
}

export function useEditor() {
  const draftTitle = ref('');
  const draftContent = ref('');
  const dirty = ref(false);
  const saving = ref(false);
  const lastSavedAt = ref('');
  const contentInputRef = ref(null);
  const textSelection = ref({ start: 0, end: 0, text: '' });
  const processingAnchor = ref(null);

  const draftWordCount = computed(() => countChineseWords(draftContent.value));
  const lastSavedText = computed(() => lastSavedAt.value || '尚未保存');
  const hasActiveSelection = computed(() => {
    const { start, end, text } = textSelection.value;
    return Boolean(text && end > start && draftContent.value.slice(start, end) === text);
  });

  function setActiveChapter(chapter, formatDateTimeFn) {
    draftTitle.value = chapter?.title || '';
    draftContent.value = normalizeParagraphIndent(chapter?.content || '');
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

  function handleEditorKeydown(event) {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    const textarea = event.target;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const insertion = '\n' + INDENT;
    draftContent.value =
      draftContent.value.slice(0, start) +
      insertion +
      draftContent.value.slice(end);
    markDirty();
    setTimeout(() => {
      textarea.selectionStart = start + insertion.length;
      textarea.selectionEnd = start + insertion.length;
      syncTextSelection({ target: textarea });
    }, 0);
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
    handleEditorKeydown,
    syncTextSelection,
    refreshTextSelection,
    processingAnchor,
    setProcessingAnchor,
    clearProcessingAnchor,
  };
}
