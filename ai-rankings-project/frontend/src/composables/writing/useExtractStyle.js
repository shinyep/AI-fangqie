import { ref } from 'vue';
import { extractWritingStyle } from '../../api/writing.js';

export function useExtractStyle(aiForm, draftContent, stylePresets, showToast, showFailToast) {
  const extractStyleDialogOpen = ref(false);
  const extractStyleInput = ref('');
  const extractStyleLoading = ref(false);
  const extractStyleResult = ref(null);

  function openExtractStyleDialog() {
    extractStyleInput.value = (aiForm.sourceText || draftContent.value || '').trim().slice(0, 4000);
    extractStyleResult.value = null;
    extractStyleDialogOpen.value = true;
  }

  async function doExtractStyle() {
    if (!extractStyleInput.value.trim()) return;
    extractStyleLoading.value = true;
    extractStyleResult.value = null;
    try {
      const res = await extractWritingStyle({ text: extractStyleInput.value.trim() });
      extractStyleResult.value = res;
      showToast('风格提取成功');
    } catch (e) {
      showFailToast('提取失败：' + (e.message || '未知错误'));
    } finally {
      extractStyleLoading.value = false;
    }
  }

  function applyExtractedStyle() {
    if (!extractStyleResult.value) return;
    aiForm.stylePreset = '（自定义提取）';
    stylePresets.value.unshift({
      title: '（自定义提取）',
      content: `## 风格名称：${extractStyleResult.value.styleName}\n\n${extractStyleResult.value.styleContent}`
    });
    extractStyleDialogOpen.value = false;
    showToast('风格已应用');
  }

  return {
    extractStyleDialogOpen,
    extractStyleInput,
    extractStyleLoading,
    extractStyleResult,
    openExtractStyleDialog,
    doExtractStyle,
    applyExtractedStyle,
  };
}
