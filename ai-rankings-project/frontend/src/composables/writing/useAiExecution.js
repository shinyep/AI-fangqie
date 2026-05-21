import { computed, ref } from 'vue';

// 第一阶段：创建 AI 面板相关的所有 refs（无外部依赖，可早期调用）
export function useAiState() {
  const aiPanelOpen = ref(false);
  const showPresetContent = ref(true);
  const activeAiKey = ref('write');
  const aiLoading = ref(false);
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
  function onRepairDone() {
    repairLoading.value = false;
  }
  function resetAiState() {
    aiLoading.value = false;
  }

  return {
    aiPanelOpen,
    showPresetContent,
    activeAiKey,
    aiLoading,
    repairLoading,
    showRepairPanel,
    currentReviewIssues,
    onReviewDone,
    onStartRepair,
    onRepairDone,
    resetAiState,
  };
}

// 第二阶段：创建依赖 activeAiConfig / activeToolVariant 的 computed 和函数
export function useAiExecution(aiForm, activeAiKey, aiPanelOpen, activeAiConfig, activeToolVariant, correctionRules, selectedCharacters, selectedRequirementPrompt, outlinePromptContent, activeLibraryPrompt, getPresetPromptSection, stylePresets, requirementPresets, ensureToolVariant, loadCharactersForWriting, refreshTextSelection, draftContent, draftTitle, AI_SOURCE_LIMIT, showToast) {
  function buildAiInstruction(config = activeAiConfig.value) {
    return aiForm.plot.trim();
  }

  function loadActiveLibraryPrompt() {
    try {
      const raw = localStorage.getItem('activePrompt');
      if (!raw) return;
      const prompt = JSON.parse(raw);
      if (prompt?.title && prompt?.content) {
        activeLibraryPrompt.value = prompt;
        showToast('已加载提示词：' + prompt.title);
      }
      localStorage.removeItem('activePrompt');
    } catch {
      localStorage.removeItem('activePrompt');
    }
  }

  function getToolInstruction(config = activeAiConfig.value) {
    const parts = [];
    if (config?.instruction) parts.push(`当前工具：${config.title}\n${config.instruction}`);
    if (activeToolVariant.value?.instruction) {
      parts.push(`细分功能：${activeToolVariant.value.label}\n${activeToolVariant.value.instruction}`);
    }
    if (config?.key === 'correct') {
      const enabledRules = correctionRules.filter((rule) => rule.enabled);
      if (enabledRules.length) {
        parts.push(`启用纠错规则：\n${enabledRules.map((rule, index) => `${index + 1}. ${rule.title}：${rule.description}`).join('\n')}`);
      }
    }
    if (config?.key === 'outline' && selectedCharacters.value.length) {
      parts.push(`需求角色：${selectedCharacters.value.map((character) => character.name).join('、')}`);
    }
    if (config?.key === 'outline' && selectedRequirementPrompt.value) {
      parts.push(`续写要求提示词：${selectedRequirementPrompt.value.title}`);
    }
    return parts.join('\n\n');
  }

  function getSystemPromptContent(config = activeAiConfig.value, options = {}) {
    const stylePromptSection = aiForm.styleMode === 'custom' && aiForm.customStylePrompt?.trim()
      ? `## 写作风格（自定义）\n${aiForm.customStylePrompt.trim()}`
      : getPresetPromptSection(stylePresets.value, aiForm.stylePreset, '写作风格');

    const reqLabel = config?.key === 'outline' ? '续写要求'
      : config?.key === 'review' ? '审稿要求'
      : config?.key === 'remove' ? '去痕要求'
      : config?.key === 'script' ? '改编要求'
      : config?.mode === 'expand' || config?.mode === 'polish' ? '处理要求'
      : '写作要求';

    const reqPromptSection = aiForm.requirementMode === 'custom' && aiForm.customRequirementPrompt?.trim()
      ? `## ${reqLabel}（自定义）\n${aiForm.customRequirementPrompt.trim()}`
      : getPresetPromptSection(requirementPresets.value, aiForm.requirementPreset, reqLabel);

    return [
      options.includeToolInstruction ? getToolInstruction(config) : '',
      config?.key === 'outline' ? outlinePromptContent.value : '',
      activeLibraryPrompt.value?.content ? `## 提示词库：${activeLibraryPrompt.value.title}\n${activeLibraryPrompt.value.content}` : '',
      stylePromptSection,
      reqPromptSection,
      aiForm.customRequirement.trim() ? `## 用户额外要求\n${aiForm.customRequirement.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  function buildTextProcessInstruction(config) {
    return getSystemPromptContent(config);
  }

  function openAiPanel(key) {
    activeAiKey.value = key;
    aiPanelOpen.value = true;
    aiForm.result = '';
    const config = activeAiConfig.value;
    ensureToolVariant(config);
    if (config.key === 'outline') loadCharactersForWriting();
    if (['expand', 'polish'].includes(config.mode)) {
      const selectedText = refreshTextSelection();
      aiForm.sourceText = (selectedText || draftContent.value).trim().slice(0, AI_SOURCE_LIMIT);
      aiForm.expandAction = activeToolVariant.value?.action || config.defaultAction || 'expand';
    } else if (!aiForm.plot && draftTitle.value) {
      aiForm.plot = draftTitle.value;
    }
  }

  const selectedPresetContent = computed(() => {
    return [getToolInstruction(activeAiConfig.value), getSystemPromptContent(activeAiConfig.value)]
      .filter(Boolean)
      .join('\n\n');
  });

  return {
    buildAiInstruction,
    loadActiveLibraryPrompt,
    getToolInstruction,
    getSystemPromptContent,
    buildTextProcessInstruction,
    openAiPanel,
    selectedPresetContent,
  };
}
