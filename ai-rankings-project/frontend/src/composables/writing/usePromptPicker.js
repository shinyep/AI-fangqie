import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { fetchPrompts } from '../../api/prompts.js';

export function usePromptPicker(aiForm, showToast) {
  const router = useRouter();
  const availableRequirementPrompts = ref([]);
  const promptKeyword = ref('');
  const promptPickerOpen = ref(false);
  const selectedRequirementPrompt = ref(null);
  const promptTooltip = ref(null);
  const promptTooltipStyle = ref({});

  const outlinePromptContent = computed(() => {
    return selectedRequirementPrompt.value?.content || '';
  });

  async function loadRequirementPrompts() {
    try {
      availableRequirementPrompts.value = await fetchPrompts({
        category: '续写要求',
        keyword: promptKeyword.value.trim(),
        limit: 1000,
      });
    } catch {
      availableRequirementPrompts.value = [];
    }
  }

  function openPromptPicker() {
    promptPickerOpen.value = true;
    if (!availableRequirementPrompts.value.length) loadRequirementPrompts();
  }

  function selectRequirementPrompt(prompt) {
    selectedRequirementPrompt.value = prompt;
    aiForm.relatedPromptId = prompt.id;
    aiForm.relatedTerms = prompt.title;
    promptPickerOpen.value = false;
  }

  function showPromptTooltip(event, prompt) {
    const rect = event.target.getBoundingClientRect();
    promptTooltipStyle.value = {
      top: rect.bottom + 4 + 'px',
      left: Math.min(rect.left, window.innerWidth - 360) + 'px',
    };
    promptTooltip.value = prompt;
  }

  function hidePromptTooltip() {
    promptTooltip.value = null;
  }

  function goPromptLibrary() {
    promptPickerOpen.value = false;
    router.push('/prompts');
  }

  function showCreatePromptTip() {
    showToast('请在提示词库中新增提示词');
    goPromptLibrary();
  }

  return {
    availableRequirementPrompts,
    promptKeyword,
    promptPickerOpen,
    selectedRequirementPrompt,
    promptTooltip,
    promptTooltipStyle,
    outlinePromptContent,
    loadRequirementPrompts,
    openPromptPicker,
    selectRequirementPrompt,
    showPromptTooltip,
    hidePromptTooltip,
    goPromptLibrary,
    showCreatePromptTip,
  };
}
