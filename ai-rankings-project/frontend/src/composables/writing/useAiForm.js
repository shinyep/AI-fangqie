import { computed, reactive, ref, watch } from 'vue';

export function useAiForm(llmStore) {
  const selectedProvider = ref('deepseek');

  // 获取当前选中厂商的默认模型
  function getProviderDefaultModel(providerId) {
    const p = llmStore.activeProviders.find(p => p.provider === providerId);
    return p?.model || p?.defaultModel || '';
  }

  const aiForm = reactive({
    advanced: false,
    model: 'deepseek-chat',
    plot: '',
    style: '玄幻',
    stylePreset: '',
    styleMode: 'preset',       // 'preset' | 'custom' | 'more'
    customStylePrompt: '',     // 自定义写作风格文本
    requirementPreset: '',
    requirementMode: 'preset', // 'preset' | 'custom' | 'more'
    customRequirementPrompt: '', // 自定义写作要求文本
    customRequirement: '',
    sourceText: '',
    expandAction: 'expand',
    toolVariant: '',
    relatedRoles: '',
    relatedRoleIds: [],
    relatedTerms: '',
    relatedPromptId: null,
    shortcut: 'Alt+K/Command+K',
    wordCount: 800,
    result: '',
  });

  const currentModels = computed(() => {
    const models = llmStore.getProviderModels(selectedProvider.value);
    if (models.length) return models;
    // 回退：优先用厂商配置的模型，其次用当前输入值
    const fallback = getProviderDefaultModel(selectedProvider.value) || aiForm.model;
    return fallback ? [fallback] : ['deepseek-chat'];
  });

  // 监听 provider 切换，优先使用厂商配置的默认模型
  watch(selectedProvider, (newProvider) => {
    const defaultModel = getProviderDefaultModel(newProvider);
    if (defaultModel) {
      aiForm.model = defaultModel;
    } else {
      const models = llmStore.getProviderModels(newProvider);
      if (models.length) {
        aiForm.model = models[0];
      }
    }
  });

  function ensureToolVariant(config) {
    const variants = config.variants || [];
    if (!variants.length) {
      aiForm.toolVariant = '';
      return;
    }
    const current = variants.find((item) => item.key === aiForm.toolVariant);
    if (!current) aiForm.toolVariant = variants[0].key;
    const selected = variants.find((item) => item.key === aiForm.toolVariant);
    if (selected?.action) aiForm.expandAction = selected.action;
  }

  function selectToolVariant(variant) {
    aiForm.toolVariant = variant.key;
    if (variant.action) aiForm.expandAction = variant.action;
  }

  return { selectedProvider, aiForm, currentModels, ensureToolVariant, selectToolVariant, getProviderDefaultModel };
}
