import { computed, ref } from 'vue';
import { countChineseWords } from '../../utils/usageStats.js';

export function useContextAwareness(chapters, activeChapter, aiForm, currentStyleProfile, selectedCharactersForPrompt) {
  const linkedChapterIds = ref(new Set());
  const autoCollectEnabled = ref(true); // 自动收集前文上下文开关，默认开启
  const contextCardExpanded = ref(false); // 上下文感知卡片展开状态

  const linkedChapterList = computed(() => chapters.value.filter(c => linkedChapterIds.value.has(c.id)));
  const linkedChaptersWordCount = computed(() => linkedChapterList.value.reduce((sum, c) => sum + (c.word_count || countChineseWords(c.content || '')), 0));
  const linkedChaptersContent = computed(() => {
    return linkedChapterList.value
      .map(c => `【${c.title || '第' + c.chapter_index + '章'}】\n${(c.content || '').slice(0, 2000)}`)
      .join('\n\n');
  });

  // 上一章末尾截取（参考51码字，用于风格衔接）
  const previousChapterExcerpt = computed(() => {
    if (!activeChapter.value || !chapters.value.length) return '';
    const idx = chapters.value.findIndex(c => c.id === activeChapter.value.id);
    if (idx <= 0) return '';
    const prev = chapters.value[idx - 1];
    return prev?.content?.slice(-2800) || '';
  });

  // 已保存章节的概要链（仅当前章之前，排除当前及之后的章节）
  const chapterOutlineChain = computed(() => {
    if (!activeChapter.value || !chapters.value.length) return [];
    const currentIdx = chapters.value.findIndex(c => c.id === activeChapter.value.id);
    if (currentIdx <= 0) return [];
    return chapters.value
      .slice(0, currentIdx)
      .filter(c => c.summary?.trim())
      .map(c => ({ title: c.title || `第${c.chapter_index}章`, summary: c.summary.trim() }));
  });

  // 上下文感知卡片计算属性
  const contextBlockCount = computed(() => {
    let count = 0;
    if (currentStyleProfile.value || aiForm.style) count++;
    if (selectedCharactersForPrompt.value.length) count++;
    if (chapterOutlineChain.value.length) count++;
    if (autoCollectEnabled.value && previousChapterExcerpt.value) count++;
    if (linkedChapterList.value.length) count++;
    return count;
  });

  const contextSummary = computed(() => {
    if (contextBlockCount.value === 0) return '暂无上下文（建议补充角色和章节信息）';
    const parts = [];
    if (currentStyleProfile.value || aiForm.style) parts.push('风格');
    if (selectedCharactersForPrompt.value.length) parts.push(`${selectedCharactersForPrompt.value.length}个角色`);
    if (chapterOutlineChain.value.length) parts.push(`${chapterOutlineChain.value.length}章概要`);
    if (autoCollectEnabled.value && previousChapterExcerpt.value) parts.push('上一章参考');
    if (linkedChapterList.value.length) parts.push(`关联${linkedChapterList.value.length}章`);
    return `将发送约 ${contextTotalChars.value} 字上下文（${parts.join(' + ')}）`;
  });

  const contextTotalChars = computed(() => {
    let total = 0;
    if (currentStyleProfile.value) total += currentStyleProfile.value.length;
    total += (aiForm.style || '').length;
    selectedCharactersForPrompt.value.forEach(c => {
      total += [c.name, c.gender, c.age, c.personality, c.background, c.abilities].filter(Boolean).join('').length;
    });
    chapterOutlineChain.value.forEach(o => total += (o.title + o.summary).length);
    if (autoCollectEnabled.value && previousChapterExcerpt.value) total += Math.min(previousChapterExcerpt.value.length, 2800);
    linkedChapterList.value.forEach(c => total += Math.min((c.content || '').length, 2000));
    return total;
  });

  const contextTokenEstimate = computed(() => Math.ceil(contextTotalChars.value / 1.5));
  const contextTokenPercent = computed(() => Math.round((contextTokenEstimate.value / 12000) * 100));
  const contextTokenClass = computed(() => {
    if (contextTokenPercent.value <= 50) return 'token-green';
    if (contextTokenPercent.value <= 80) return 'token-yellow';
    return 'token-red';
  });

  function linkRecentChapters(n) {
    // 往前关联：取当前章之前的最近 n 章，排除当前章自身及之后的章节
    if (!activeChapter.value) {
      const recent = chapters.value.slice(-n);
      linkedChapterIds.value = new Set(recent.map(c => c.id));
      return;
    }
    const currentIdx = chapters.value.findIndex(c => c.id === activeChapter.value.id);
    if (currentIdx <= 0) {
      linkedChapterIds.value = new Set();
      return;
    }
    const start = Math.max(0, currentIdx - n);
    const prev = chapters.value.slice(start, currentIdx);
    linkedChapterIds.value = new Set(prev.map(c => c.id));
  }

  function toggleChapterLink(chapter) {
    const next = new Set(linkedChapterIds.value);
    if (next.has(chapter.id)) {
      next.delete(chapter.id);
    } else {
      next.add(chapter.id);
    }
    linkedChapterIds.value = next;
  }

  function clearLinkedChapters() {
    linkedChapterIds.value = new Set();
  }

  return {
    linkedChapterIds,
    autoCollectEnabled,
    contextCardExpanded,
    linkedChapterList,
    linkedChaptersWordCount,
    linkedChaptersContent,
    previousChapterExcerpt,
    chapterOutlineChain,
    contextBlockCount,
    contextSummary,
    contextTotalChars,
    contextTokenEstimate,
    contextTokenPercent,
    contextTokenClass,
    linkRecentChapters,
    toggleChapterLink,
    clearLinkedChapters,
  };
}
