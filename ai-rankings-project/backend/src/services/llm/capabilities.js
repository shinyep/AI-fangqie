// 厂商能力配置 — 结构化输出 + 温度 + JSON 能力 + 推理模式
import { isBuiltInProvider, PROVIDERS } from "./providers.js";

function normalizeText(value) {
  return (value ?? "").trim().toLowerCase();
}

function normalizeModel(value) {
  return (value ?? "").trim().toLowerCase();
}

// ========== 结构化输出 Profile ==========

const QWEN_FAMILY_PATTERN = /(?:^|[/:_-])qwen(?:\d+(?:\.\d+)?)?/i;
const DASHSCOPE_HOST_PATTERN = /(?:^|\.)dashscope\.aliyuncs\.com$/i;
const MODELSCOPE_HOST_PATTERN = /(?:^|\.)modelscope\.cn$/i;
const OPENAI_HOST_PATTERN = /(?:^|\.)api\.openai\.com$/i;
const GEMINI_HOST_PATTERN = /(?:^|\.)generativelanguage\.googleapis\.com$/i;
const MOONSHOT_HOST_PATTERN = /(?:^|\.)api\.moonshot\.cn$/i;
const DEEPSEEK_HOST_PATTERN = /(?:^|\.)api\.deepseek\.com$/i;
const GLM_HOST_PATTERN = /(?:^|\.)open\.bigmodel\.cn$/i;
const GROK_HOST_PATTERN = /(?:^|\.)api\.x\.ai$/i;
const MINIMAX_HOST_PATTERN = /(?:^|\.)api\.minimax(?:i)?\.(?:io|com)$/i;

function extractHost(baseURL) {
  const trimmed = baseURL?.trim();
  if (!trimmed) return "";
  try { return new URL(trimmed).hostname.toLowerCase(); } catch { return ""; }
}

function isQwenFamily(model) {
  return QWEN_FAMILY_PATTERN.test(model);
}

function normalizeModelId(model) {
  const normalized = normalizeText(model);
  if (!normalized) return "";
  const parts = normalized.split("/").filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : normalized;
}

function isQwenThinkingOnlyModel(model) {
  const normalized = normalizeModelId(model);
  if (!normalized) return false;
  return normalized.startsWith("qwq") || normalized.includes("thinking");
}

function supportsDashScopeQwenNativeStructuredOutput(model) {
  const normalized = normalizeModelId(model);
  if (!normalized || isQwenThinkingOnlyModel(normalized)) return false;
  if (normalized.startsWith("qwen3")) return true;
  if (normalized.startsWith("qwen-plus")) return true;
  if (normalized.startsWith("qwen-flash")) return true;
  if (normalized.startsWith("qwen-turbo")) return true;
  if (normalized.startsWith("qwen-max")) return true;
  if (normalized.startsWith("qwen-long")) return true;
  return normalized.startsWith("qwen2.5") && !normalized.includes("math") && !normalized.includes("coder");
}

function isQwenMixedThinkingModel(model) {
  const normalized = normalizeModelId(model);
  if (!normalized || isQwenThinkingOnlyModel(normalized)) return false;
  return (
    normalized.startsWith("qwen3") ||
    normalized.startsWith("qwen-plus") ||
    normalized.startsWith("qwen-flash") ||
    normalized.startsWith("qwen-turbo")
  );
}

function buildProfile(input) {
  return {
    nativeJsonSchema: input.nativeJsonSchema ?? false,
    nativeJsonObject: input.nativeJsonObject ?? false,
    requiresNonThinkingForStructured: input.requiresNonThinkingForStructured ?? false,
    supportsReasoningToggle: input.supportsReasoningToggle ?? false,
    omitMaxTokensForNativeStructured: input.omitMaxTokensForNativeStructured ?? false,
    preferredStructuredStrategy: input.preferredStructuredStrategy ?? "prompt_json",
    safeStructuredMaxTokens: input.safeStructuredMaxTokens,
    family: input.family,
  };
}

export function resolveStructuredOutputProfile(input) {
  const provider = normalizeText(input.provider);
  const model = normalizeText(input.model);
  const host = extractHost(input.baseURL);
  const customProvider = !isBuiltInProvider(input.provider);
  const qwenFamily = isQwenFamily(model);
  const qwenMixedThinkingModel = isQwenMixedThinkingModel(model);
  const qwenThinkingOnlyModel = isQwenThinkingOnlyModel(model);
  const qwenNativeStructuredModel = supportsDashScopeQwenNativeStructuredOutput(model);
  const isDashScopeQwen = input.provider === "qwen" || DASHSCOPE_HOST_PATTERN.test(host);
  const isModelScopeQwen = MODELSCOPE_HOST_PATTERN.test(host) || provider.includes("modelscope");

  if (input.requestProtocol === "anthropic") {
    return buildProfile({ family: "anthropic", preferredStructuredStrategy: "prompt_json", safeStructuredMaxTokens: 8192 });
  }
  if (input.provider === "gemini" || GEMINI_HOST_PATTERN.test(host)) {
    return buildProfile({ family: "gemini", nativeJsonSchema: true, nativeJsonObject: true, preferredStructuredStrategy: "json_schema" });
  }
  if (input.provider === "glm" || GLM_HOST_PATTERN.test(host) || model.startsWith("glm-")) {
    return buildProfile({ family: "glm", nativeJsonObject: true, preferredStructuredStrategy: "json_object" });
  }
  if (input.provider === "kimi" || MOONSHOT_HOST_PATTERN.test(host) || model.startsWith("kimi-")) {
    const supportsJsonObject = !model.includes("thinking");
    return buildProfile({ family: "kimi", nativeJsonObject: supportsJsonObject, preferredStructuredStrategy: supportsJsonObject ? "json_object" : "prompt_json" });
  }
  if (input.provider === "deepseek" || DEEPSEEK_HOST_PATTERN.test(host) || model.startsWith("deepseek-")) {
    return buildProfile({ family: "deepseek", nativeJsonObject: true, preferredStructuredStrategy: "json_object" });
  }
  if (input.provider === "grok" || GROK_HOST_PATTERN.test(host) || model.startsWith("grok-")) {
    return buildProfile({ family: "grok", nativeJsonObject: true, preferredStructuredStrategy: "json_object" });
  }
  if (input.provider === "minimax" || MINIMAX_HOST_PATTERN.test(host) || model.startsWith("minimax-m2")) {
    return buildProfile({ family: "minimax", preferredStructuredStrategy: "prompt_json", safeStructuredMaxTokens: 8192 });
  }
  if (isDashScopeQwen || (input.provider === "qwen" && qwenFamily)) {
    return buildProfile({
      family: "dashscope_qwen",
      nativeJsonObject: qwenNativeStructuredModel,
      preferredStructuredStrategy: qwenNativeStructuredModel ? "json_object" : "prompt_json",
      requiresNonThinkingForStructured: qwenMixedThinkingModel,
      supportsReasoningToggle: qwenMixedThinkingModel,
      omitMaxTokensForNativeStructured: qwenNativeStructuredModel,
      safeStructuredMaxTokens: qwenNativeStructuredModel ? undefined : 8192,
    });
  }
  if (isModelScopeQwen && qwenFamily) {
    return buildProfile({
      family: "modelscope_qwen",
      preferredStructuredStrategy: "prompt_json",
      requiresNonThinkingForStructured: qwenMixedThinkingModel && !qwenThinkingOnlyModel,
      supportsReasoningToggle: qwenMixedThinkingModel && !qwenThinkingOnlyModel,
      safeStructuredMaxTokens: 8192,
    });
  }
  if (qwenFamily) {
    return buildProfile({ family: "custom_openai_compatible_qwen", preferredStructuredStrategy: "prompt_json", safeStructuredMaxTokens: 8192 });
  }
  if (input.provider === "openai" || OPENAI_HOST_PATTERN.test(host)) {
    return buildProfile({ family: "openai", nativeJsonSchema: true, nativeJsonObject: true, preferredStructuredStrategy: "json_schema" });
  }
  if (input.provider === "siliconflow") {
    return buildProfile({ family: "siliconflow", preferredStructuredStrategy: "prompt_json", safeStructuredMaxTokens: 8192 });
  }
  if (input.provider === "ollama") {
    return buildProfile({ family: "ollama", preferredStructuredStrategy: "prompt_json", safeStructuredMaxTokens: 8192 });
  }
  if (customProvider) {
    return buildProfile({
      family: qwenFamily ? "custom_openai_compatible_qwen" : "custom_openai_compatible",
      preferredStructuredStrategy: "prompt_json",
      safeStructuredMaxTokens: 8192,
    });
  }
  return buildProfile({ family: "default", preferredStructuredStrategy: "prompt_json", safeStructuredMaxTokens: 8192 });
}

export function selectStructuredOutputStrategy(profile, schema) {
  // 简化版：不支持 zod schema 检测，仅根据 profile 选择最佳策略
  if (profile.preferredStructuredStrategy === "json_schema" && profile.nativeJsonSchema) {
    return "json_schema";
  }
  if ((profile.preferredStructuredStrategy === "json_object" || profile.preferredStructuredStrategy === "json_schema") && profile.nativeJsonObject) {
    return "json_object";
  }
  return "prompt_json";
}

export function buildStructuredResponseFormat(input) {
  if (input.strategy === "json_object") {
    return { type: "json_object" };
  }
  if (input.strategy === "json_schema") {
    const name = (input.label || "structured_output").replace(/[^a-zA-Z0-9_]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 48) || "structured_output";
    return { type: "json_schema", json_schema: { name, strict: true, schema: input.schema || {} } };
  }
  return undefined;
}

// ========== 温度兼容性 ==========

function isKimiFixedTemperatureModel(normalizedModel) {
  if (!normalizedModel || normalizedModel === "kimi-latest") return false;
  return (
    normalizedModel.startsWith("kimi-k2") ||
    normalizedModel.startsWith("kimi-2.5") ||
    (normalizedModel.startsWith("kimi-") && normalizedModel.includes("k2")) ||
    normalizedModel.includes("kimi2.5") ||
    normalizedModel.includes("kimi-2-5")
  );
}

export function getModelParameterCompatibility(provider, model) {
  const normalized = normalizeModel(model);
  if (provider === "kimi" && isKimiFixedTemperatureModel(normalized)) {
    return { fixedTemperature: 1 };
  }
  if (provider === "minimax") {
    return { minimumTemperature: 0.01, maximumTemperature: 1 };
  }
  return {};
}

export function resolveModelTemperature(provider, model, requestedTemperature, fallbackTemperature = 0.7) {
  const compatibility = getModelParameterCompatibility(provider, model);
  if (typeof compatibility.fixedTemperature === "number") {
    return compatibility.fixedTemperature;
  }
  let resolved = requestedTemperature ?? fallbackTemperature;
  if (typeof compatibility.minimumTemperature === "number") {
    resolved = Math.max(compatibility.minimumTemperature, resolved);
  }
  if (typeof compatibility.maximumTemperature === "number") {
    resolved = Math.min(compatibility.maximumTemperature, resolved);
  }
  return resolved;
}

// ========== JSON 能力 ==========

export function getJsonCapability(provider, model) {
  const normalized = normalizeModel(model);

  const jsonCapabilities = {
    openai: { supportsJsonObject: true, supportsJsonSchema: true, modelCondition: (m) => !m || /^gpt-5([^\w]|$)/.test(m) || m === "gpt-5" },
    deepseek: { supportsJsonObject: true, supportsJsonSchema: false },
    grok: { supportsJsonObject: true, supportsJsonSchema: false },
    anthropic: { supportsJsonObject: false, supportsJsonSchema: false },
    siliconflow: { supportsJsonObject: false, supportsJsonSchema: false },
    kimi: { supportsJsonObject: true, supportsJsonSchema: false, modelCondition: (m) => !m || !m.includes("thinking") },
    minimax: { supportsJsonObject: false, supportsJsonSchema: false },
    glm: { supportsJsonObject: true, supportsJsonSchema: false },
    qwen: { supportsJsonObject: true, supportsJsonSchema: false },
    gemini: { supportsJsonObject: true, supportsJsonSchema: true, modelCondition: () => true },
    ollama: { supportsJsonObject: false, supportsJsonSchema: false },
  };

  if (!isBuiltInProvider(provider)) {
    return { supportsJsonObject: false, supportsJsonSchema: false };
  }

  const cap = jsonCapabilities[provider];
  if (!cap) return { supportsJsonObject: false, supportsJsonSchema: false };

  if (cap.modelCondition) {
    const ok = cap.modelCondition(normalized);
    return { supportsJsonObject: cap.supportsJsonObject && ok, supportsJsonSchema: cap.supportsJsonSchema && ok };
  }

  return { supportsJsonObject: cap.supportsJsonObject, supportsJsonSchema: cap.supportsJsonSchema };
}

// ========== 推理/思考模式检测 ==========

const DEEPSEEK_HOST_THINK_PATTERN = /(?:^|:\/\/)(?:api\.)?deepseek\.com(?:\/|$)/i;
const MINIMAX_HOST_THINK_PATTERN = /(?:^|:\/\/)(?:api\.)?minimax(?:i)?\.(?:io|com)(?:\/|$)/i;
const MINIMAX_MODEL_PATTERN = /^minimax-m2(?:[.-]|$)/i;

export function isDeepSeekThinkingModeProvider(provider, baseURL, model) {
  const normalizedModel = model?.trim().toLowerCase();
  const supportsThinkingToggle = normalizedModel === "deepseek-v4-pro" || normalizedModel === "deepseek-reasoner";
  if (!supportsThinkingToggle) return false;
  if (provider === "deepseek") return true;
  const normalizedBaseURL = baseURL?.trim();
  return Boolean(normalizedBaseURL && DEEPSEEK_HOST_THINK_PATTERN.test(normalizedBaseURL));
}

export function isMiniMaxCompatibleProvider(provider, baseURL, model) {
  if (provider === "minimax") return true;
  const normalizedBaseURL = baseURL?.trim();
  if (normalizedBaseURL && MINIMAX_HOST_THINK_PATTERN.test(normalizedBaseURL)) return true;
  const normalizedModel = model?.trim();
  return Boolean(normalizedModel && MINIMAX_MODEL_PATTERN.test(normalizedModel));
}
