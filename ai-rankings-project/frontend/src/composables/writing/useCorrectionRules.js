import { reactive } from 'vue';

export function useCorrectionRules() {
  const correctionRules = reactive([
    { key: 'translate', title: '全局翻译', description: '将句中出现的外语内容翻译为中文，保持语义准确', enabled: true },
    { key: 'typo', title: '检查所有文本的错字', description: '检查字词准确性，修复错别字与语义使用不当', enabled: true },
    { key: 'natural', title: '自然语言优化', description: '避免使用AI生成感强烈的短语，让表达更自然', enabled: true },
    { key: 'punctuation', title: '中英文标点统一', description: '将文本中的英文标点符号统一替换为中文标点', enabled: true },
  ]);

  function setCorrectionRules(enabled) {
    correctionRules.forEach((rule) => {
      rule.enabled = enabled;
    });
  }

  function resetCorrectionRules() {
    setCorrectionRules(true);
  }

  return { correctionRules, setCorrectionRules, resetCorrectionRules };
}
