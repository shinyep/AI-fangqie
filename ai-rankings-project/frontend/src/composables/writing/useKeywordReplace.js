import { computed, ref } from 'vue';
import { updateChapter } from '../../api/books.js';

export function useKeywordReplace(chapters, activeChapter, activeBook, draftContent, markDirty, fetchChapters, showToast, showSuccessToast, showFailToast) {
  const keywordReplaceOpen = ref(false);
  const keywordReplaceScope = ref('current');
  const keywordReplacing = ref(false);
  const keywordReplaceEntries = ref([{ find: '', replace: '' }]);
  const keywordReplacePreview = ref([]);

  const hasValidKeywordEntries = computed(() => {
    return keywordReplaceEntries.value.some(e => e.find.trim() && e.replace.trim());
  });

  function addKeywordReplaceEntry() {
    keywordReplaceEntries.value.push({ find: '', replace: '' });
  }

  function removeKeywordReplaceEntry(index) {
    if (keywordReplaceEntries.value.length > 1) {
      keywordReplaceEntries.value.splice(index, 1);
    }
  }

  function openKeywordReplace() {
    keywordReplaceOpen.value = true;
    keywordReplacePreview.value = [];
  }

  function previewKeywordReplace() {
    const preview = [];
    const targets = keywordReplaceScope.value === 'all'
      ? chapters.value
      : (activeChapter.value ? [activeChapter.value] : []);

    for (const entry of keywordReplaceEntries.value) {
      if (!entry.find.trim() || !entry.replace.trim()) continue;
      let count = 0;
      for (const ch of targets) {
        const content = ch.content || '';
        const escaped = entry.find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const matches = content.match(new RegExp(escaped, 'g'));
        if (matches) count += matches.length;
      }
      preview.push({ find: entry.find, replace: entry.replace, count });
    }
    keywordReplacePreview.value = preview;
  }

  async function executeKeywordReplace() {
    keywordReplacing.value = true;
    try {
      const targets = keywordReplaceScope.value === 'all'
        ? [...chapters.value]
        : (activeChapter.value ? [activeChapter.value] : []);

      if (!targets.length) {
        showToast('没有可修改的章节');
        return;
      }

      let totalReplacements = 0;
      for (const ch of targets) {
        let content = ch.content || '';
        let changed = false;
        for (const entry of keywordReplaceEntries.value) {
          if (!entry.find.trim() || !entry.replace.trim()) continue;
          const escaped = entry.find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(escaped, 'g');
          const matches = content.match(regex);
          if (matches) {
            totalReplacements += matches.length;
            content = content.replace(regex, entry.replace);
            changed = true;
          }
        }
        if (changed) {
          await updateChapter(ch.id, { project_id: activeBook.value.id, content });
          if (activeChapter.value && activeChapter.value.id === ch.id) {
            draftContent.value = content;
            markDirty();
          }
        }
      }

      keywordReplaceOpen.value = false;
      keywordReplaceEntries.value = [{ find: '', replace: '' }];
      keywordReplacePreview.value = [];
      showSuccessToast(`关键词替换完成，共 ${totalReplacements} 处`);
      if (activeBook.value?.id) {
        chapters.value = await fetchChapters(activeBook.value.id);
      }
    } catch (e) {
      showFailToast('替换失败: ' + (e.message || '未知错误'));
    } finally {
      keywordReplacing.value = false;
    }
  }

  return {
    keywordReplaceOpen,
    keywordReplaceScope,
    keywordReplacing,
    keywordReplaceEntries,
    keywordReplacePreview,
    hasValidKeywordEntries,
    addKeywordReplaceEntry,
    removeKeywordReplaceEntry,
    openKeywordReplace,
    previewKeywordReplace,
    executeKeywordReplace,
  };
}
