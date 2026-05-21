import { computed, ref } from 'vue';
import { getTodayStats } from '../../utils/usageStats.js';

export function useInit(customStylePresets, customRequirementPresets) {
  const todayStats = ref({ calls: 0, words: 0 });

  const stylePresets = ref([]);
  const activeLibraryPrompt = ref(null);

  const requirementPresets = ref([]);
  // Fallback presets if API returns empty
  const defaultStylePresets = [
    { title: '【🌙】轻AI味，番茄剧情框架，减少描述（十三月）', content: '' },
    { title: '【细腻版】强化感官描写，提升代入感', content: '' },
    { title: '【爽文版】冲突前置，节奏更快', content: '' },
  ];
  const defaultRequirementPresets = [
    { title: '【🌙一键成文】情节连贯，适合续写（十三月）', content: '' },
    { title: '【强冲突】每段都推进矛盾和悬念', content: '' },
    { title: '【对话推动】增加人物互动和潜台词', content: '' },
  ];

  const displayStylePresets = computed(() => {
    const src = stylePresets.value.length ? stylePresets.value : defaultStylePresets;
    return ['（不选择）', ...src.map(s => typeof s === 'string' ? s : s.title)];
  });
  const displayRequirementPresets = computed(() => {
    const src = requirementPresets.value.length ? requirementPresets.value : defaultRequirementPresets;
    return ['（不选择）', ...src.map(s => typeof s === 'string' ? s : s.title)];
  });

  // 合并内置 + 自定义预设（用于"更多"面板）
  const allStylePresets = computed(() => {
    const builtin = (stylePresets.value.length ? stylePresets.value : defaultStylePresets)
      .map(s => typeof s === 'string' ? { title: s, content: '', isCustom: false } : { ...s, isCustom: false });
    const custom = (customStylePresets?.value || []).map(s => ({ ...s, isCustom: true }));
    return [...builtin, ...custom];
  });

  const allRequirementPresets = computed(() => {
    const builtin = (requirementPresets.value.length ? requirementPresets.value : defaultRequirementPresets)
      .map(s => typeof s === 'string' ? { title: s, content: '', isCustom: false } : { ...s, isCustom: false });
    const custom = (customRequirementPresets?.value || []).map(s => ({ ...s, isCustom: true }));
    return [...builtin, ...custom];
  });

  // 当前选中的风格预设完整内容
  function createCurrentStyleProfile(aiFormRef) {
    return computed(() => {
      const preset = stylePresets.value.find(s => s.title === aiFormRef.stylePreset);
      return preset?.content || '';
    });
  }

  // 模板中展示的风格预设内容（筛选非空和非占位项）
  function createSelectedStylePresetContent(aiFormRef, currentStyleProfileRef) {
    return computed(() => {
      if (!aiFormRef.stylePreset || aiFormRef.stylePreset === '（不选择）') return '';
      return currentStyleProfileRef.value;
    });
  }

  function createSelectedRequirementPresetContent(aiFormRef) {
    return computed(() => {
      if (!aiFormRef.requirementPreset || aiFormRef.requirementPreset === '（不选择）') return '';
      const preset = requirementPresets.value.find(s => s.title === aiFormRef.requirementPreset);
      return preset?.content || '';
    });
  }

  // 合并风格预设 + 作品设定风格详细描述，作为 AI 生成上下文
  function createMergedStyleProfile(currentStyleProfileRef, activeBookRef) {
    return computed(() => {
      return [currentStyleProfileRef.value, activeBookRef.value?.style_profile]
        .filter(Boolean)
        .join('\n\n');
    });
  }

  function getPresetContent(presets, title) {
    const selected = presets.find(s => typeof s === 'object' && s.title === title);
    return selected?.content || '';
  }

  function getPresetPromptSection(presets, title, label) {
    const content = getPresetContent(presets, title);
    if (!title && !content) return '';
    return [`## ${label}`, title ? `名称：${title}` : '', content].filter(Boolean).join('\n');
  }

  // 获取写作风格的 Prompt 段落（支持自定义模式）
  function getStylePromptSection(aiForm) {
    if (aiForm.styleMode === 'custom' && aiForm.customStylePrompt?.trim()) {
      return `## 写作风格（自定义）\n${aiForm.customStylePrompt.trim()}`;
    }
    return getPresetPromptSection(stylePresets.value, aiForm.stylePreset, '写作风格');
  }

  // 获取写作要求的 Prompt 段落（支持自定义模式）
  function getRequirementPromptSection(aiForm, reqLabel) {
    if (aiForm.requirementMode === 'custom' && aiForm.customRequirementPrompt?.trim()) {
      return `## ${reqLabel}（自定义）\n${aiForm.customRequirementPrompt.trim()}`;
    }
    return getPresetPromptSection(requirementPresets.value, aiForm.requirementPreset, reqLabel);
  }

  function loadActiveLibraryPrompt() {
    try {
      const raw = localStorage.getItem('activePrompt');
      if (!raw) return;
      const prompt = JSON.parse(raw);
      if (prompt?.title && prompt?.content) {
        activeLibraryPrompt.value = prompt;
        return prompt;
      }
      localStorage.removeItem('activePrompt');
    } catch {
      localStorage.removeItem('activePrompt');
    }
    return null;
  }

  return {
    todayStats,
    stylePresets,
    requirementPresets,
    activeLibraryPrompt,
    defaultStylePresets,
    defaultRequirementPresets,
    displayStylePresets,
    displayRequirementPresets,
    allStylePresets,
    allRequirementPresets,
    createCurrentStyleProfile,
    createSelectedStylePresetContent,
    createSelectedRequirementPresetContent,
    createMergedStyleProfile,
    getPresetContent,
    getPresetPromptSection,
    getStylePromptSection,
    getRequirementPromptSection,
    loadActiveLibraryPrompt,
  };
}
