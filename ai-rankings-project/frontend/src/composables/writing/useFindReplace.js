import { ref } from 'vue';

export function useFindReplace(draftContent, markDirty, showToast) {
  const showFindDialog = ref(false);
  const findKeyword = ref('');
  const findReplaceText = ref('');
  const findResults = ref([]);
  const activeFindIndex = ref(0);

  function findInChapter() {
    if (!findKeyword.value.trim() || !draftContent.value) return;
    const text = draftContent.value;
    const keyword = findKeyword.value;
    const results = [];
    let idx = text.indexOf(keyword);
    while (idx !== -1) {
      const start = Math.max(0, idx - 20);
      const end = Math.min(text.length, idx + keyword.length + 20);
      results.push({
        index: idx,
        preview: (start > 0 ? '...' : '') + text.slice(start, end) + (end < text.length ? '...' : ''),
      });
      idx = text.indexOf(keyword, idx + 1);
    }
    findResults.value = results;
    activeFindIndex.value = 0;
  }

  function replaceCurrent() {
    if (!findResults.value.length) return;
    const pos = findResults.value[activeFindIndex.value].index;
    draftContent.value =
      draftContent.value.slice(0, pos) +
      findReplaceText.value +
      draftContent.value.slice(pos + findKeyword.value.length);
    markDirty();
    findInChapter();
  }

  function replaceAll() {
    if (!findKeyword.value.trim()) return;
    draftContent.value = draftContent.value.split(findKeyword.value).join(findReplaceText.value);
    markDirty();
    showToast('全部替换完成');
    showFindDialog.value = false;
  }

  return {
    showFindDialog,
    findKeyword,
    findReplaceText,
    findResults,
    activeFindIndex,
    findInChapter,
    replaceCurrent,
    replaceAll,
  };
}
