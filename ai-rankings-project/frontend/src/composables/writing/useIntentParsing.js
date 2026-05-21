import { ref } from 'vue';
import { parseIntent } from '../../api/writing.js';

/**
 * 意图解析 - 将用户的自然语言修改指令先解析为结构化意图
 */
export function useIntentParsing() {
  const intentResult = ref(null);
  const parsingIntent = ref(false);

  async function parseUserIntent(instruction, options = {}) {
    if (!instruction?.trim()) return null;
    parsingIntent.value = true;
    try {
      const result = await parseIntent({
        instruction: instruction.trim(),
        provider: options.provider,
        model: options.model,
      });
      intentResult.value = result;
      return result;
    } catch {
      intentResult.value = null;
      return null;
    } finally {
      parsingIntent.value = false;
    }
  }

  function clearIntent() {
    intentResult.value = null;
  }

  return {
    intentResult,
    parsingIntent,
    parseUserIntent,
    clearIntent,
  };
}
