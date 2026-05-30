// LLM 客户端工厂 — 核心调用入口
// 移植自 AI-Novel-Writing-Assistant server/src/llm/factory.ts + anthropicClient.ts + reasoning.ts

import { appendFileSync } from "fs";
import { join } from "path";
import { getDb } from "../../models/database.js";
import {
  isBuiltInProvider,
  getProviderEnvApiKey,
  getProviderEnvModel,
  providerRequiresApiKey,
  PROVIDERS,
  resolveProviderBaseUrl,
  getBuiltInProviderName,
} from "./providers.js";
import {
  resolveStructuredOutputProfile,
  resolveModelTemperature,
  isDeepSeekThinkingModeProvider,
  isMiniMaxCompatibleProvider,
} from "./capabilities.js";
import { resolveModel } from "./modelRouter.js";

const DEBUG_LOG_PATH = join(process.cwd(), "logs", "llm-debug.log");

function debugLog(message, meta = {}) {
  const line = `[${new Date().toISOString()}] ${message} ${JSON.stringify(meta)}\n`;
  try { appendFileSync(DEBUG_LOG_PATH, line, "utf8"); } catch { /* ignore */ }
}

function normalizeOptionalText(value) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

// ========== Provider Secret 缓存 ==========

const providerSecrets = new Map();

function toProviderSecret(row) {
  return {
    key: normalizeOptionalText(row.api_key),
    model: normalizeOptionalText(row.model),
    baseURL: normalizeOptionalText(row.api_base),
    displayName: normalizeOptionalText(row.display_name),
    reasoningEnabled: row.reasoning_enabled !== 0,
    concurrencyLimit: typeof row.concurrency_limit === "number" && row.concurrency_limit > 0 ? row.concurrency_limit : 0,
    requestIntervalMs: typeof row.request_interval_ms === "number" && row.request_interval_ms > 0 ? row.request_interval_ms : 0,
    isActive: row.is_active !== 0,
  };
}

function loadProviderSecrets() {
  const db = getDb();
  try {
    const rows = db.prepare("SELECT * FROM ai_provider WHERE is_active = 1").all();
    const fresh = new Map();
    for (const row of rows) {
      fresh.set(row.provider, toProviderSecret(row));
    }
    // 仅在查询成功后替换缓存，避免清空后查询失败导致缓存丢失
    providerSecrets.clear();
    for (const [k, v] of fresh) {
      providerSecrets.set(k, v);
    }
  } catch (err) {
    console.error('[LLM] 加载供应商密钥缓存失败:', err.message);
  }
}

function getProviderSecret(provider) {
  if (providerSecrets.size === 0) loadProviderSecrets();
  const cached = providerSecrets.get(provider);
  if (cached) return cached;

  // 缓存未命中时直接查库（处理缓存被意外清空的情况）
  try {
    const db = getDb();
    const row = db.prepare("SELECT * FROM ai_provider WHERE provider = ? AND is_active = 1").get(provider);
    if (row) {
      const secret = toProviderSecret(row);
      providerSecrets.set(provider, secret);
      return secret;
    }
  } catch (err) {
    console.error(`[LLM] 直接查询供应商 ${provider} 密钥失败:`, err.message);
  }
  return undefined;
}

export function setProviderSecretCache(provider, secret) {
  if (!secret) {
    providerSecrets.delete(provider);
    return;
  }
  providerSecrets.set(provider, {
    key: normalizeOptionalText(secret.key),
    model: normalizeOptionalText(secret.model),
    baseURL: normalizeOptionalText(secret.baseURL),
    displayName: normalizeOptionalText(secret.displayName),
    reasoningEnabled: secret.reasoningEnabled !== false,
    concurrencyLimit: 0,
    requestIntervalMs: 0,
    isActive: secret.isActive !== false,
  });
}

export function clearProviderSecretCache() {
  providerSecrets.clear();
}

// ========== 协议解析 ==========

/**
 * 解析最终使用的协议
 */
function resolveRequestProtocol(provider, requestedProtocol) {
  if (requestedProtocol === "anthropic") return "anthropic";
  if (requestedProtocol === "openai_compatible") return "openai_compatible";
  // auto: Anthropic 厂商默认走 anthropic 协议
  if (provider === "anthropic") return "anthropic";
  return "openai_compatible";
}

// ========== Anthropic 原生客户端 ==========

function convertMessagesForAnthropic(messages) {
  const systemParts = [];
  const converted = [];

  for (const message of messages) {
    const content = typeof message.content === "string"
      ? message.content
      : Array.isArray(message.content)
        ? message.content.map((p) => (typeof p === "string" ? p : p.text ?? "")).join("\n")
        : String(message.content ?? "");
    if (!content.trim()) continue;

    const role = message.role;
    if (role === "system") {
      systemParts.push(content.trim());
      continue;
    }

    const anthropicRole = role === "assistant" || role === "ai" ? "assistant" : "user";
    const previous = converted[converted.length - 1];
    if (previous && previous.role === anthropicRole) {
      previous.content = `${previous.content}\n\n${content.trim()}`;
    } else {
      converted.push({ role: anthropicRole, content: content.trim() });
    }
  }

  return {
    system: systemParts.length > 0 ? systemParts.join("\n\n") : undefined,
    messages: converted,
  };
}

function normalizeAnthropicBaseURL(baseURL) {
  const trimmed = baseURL.trim().replace(/\/+$/u, "");
  return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
}

async function callAnthropicAPI({ apiKey, baseURL, model, temperature, maxTokens, messages, timeoutMs, stream }) {
  const converted = convertMessagesForAnthropic(messages);
  if (converted.messages.length === 0) {
    throw new Error("Anthropic 请求至少需要一条用户或助手消息。");
  }

  const controller = new AbortController();
  const timer = timeoutMs ? setTimeout(() => controller.abort(new Error("请求超时")), timeoutMs) : null;

  try {
    const body = {
      model,
      max_tokens: maxTokens || 4096,
      temperature,
      stream: stream || false,
      ...(converted.system ? { system: converted.system } : {}),
      messages: converted.messages,
    };

    const response = await fetch(`${normalizeAnthropicBaseURL(baseURL)}/messages`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey ?? "",
        "anthropic-version": process.env.ANTHROPIC_VERSION ?? "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Anthropic 请求失败 (${response.status}): ${detail || response.statusText}`);
    }
    return response;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function extractAnthropicTextContent(payload) {
  if (!payload || typeof payload !== "object") return "";
  const content = payload.content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => (part && typeof part === "object" && part.type === "text" && typeof part.text === "string" ? part.text : ""))
    .join("");
}

// ========== OpenAI 兼容客户端 ==========

async function callOpenAICompatibleAPI({ apiKey, baseURL, model, temperature, maxTokens, messages, timeoutMs, stream, responseFormat, modelKwargs }) {
  const controller = new AbortController();
  const timer = timeoutMs ? setTimeout(() => controller.abort(new Error("请求超时")), timeoutMs) : null;

  try {
    const body = {
      model,
      temperature,
      max_tokens: maxTokens || 4096,
      messages,
      stream: stream || false,
      ...(responseFormat ? { response_format: responseFormat } : {}),
      ...(modelKwargs ?? {}),
    };

    const response = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey || "ollama"}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`AI API 请求失败 (${response.status}): ${detail.slice(0, 300)}`);
    }
    return response;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// ========== 思考/推理模式处理 ==========

function resolveReasoningBehavior({ provider, baseURL, model, reasoningEnabled }) {
  if (isDeepSeekThinkingModeProvider(provider, baseURL, model)) {
    return {
      reasoningEnabled,
      modelKwargs: { thinking: { type: reasoningEnabled ? "enabled" : "disabled" } },
    };
  }

  if (isMiniMaxCompatibleProvider(provider, baseURL, model)) {
    return {
      reasoningEnabled,
      modelKwargs: { reasoning_split: true },
      includeRawResponse: true,
    };
  }

  return { reasoningEnabled, modelKwargs: undefined, includeRawResponse: false };
}

// ========== 核心 callLLM ==========

/**
 * 统一的 LLM 调用入口
 *
 * @param {Object} options
 * @param {string} [options.provider] - 厂商 ID（如 'deepseek'）
 * @param {string} [options.model] - 模型名
 * @param {string} [options.taskType] - 任务类型（chapter_analysis 等）
 * @param {number} [options.temperature]
 * @param {number} [options.maxTokens]
 * @param {number} [options.timeoutMs=120000]
 * @param {Array<{role:string,content:string}>} options.messages
 * @param {boolean} [options.forceJSON=false] - 是否要求 JSON 输出
 * @param {string} [options.apiKey] - 覆盖 API Key
 * @param {string} [options.baseURL] - 覆盖 Base URL
 * @param {string} [options.requestProtocol] - 'auto'|'openai_compatible'|'anthropic'
 * @param {boolean} [options.stream=false] - 是否流式
 * @returns {Promise<{content:string, model:string, provider:string, usage?:object}>}
 */
export async function callLLM(options = {}) {
  const startedAt = Date.now();
  let {
    provider,
    model: requestedModel,
    taskType,
    temperature: requestedTemperature,
    maxTokens: requestedMaxTokens,
    timeoutMs = 120000,
    messages,
    forceJSON = false,
    apiKey: overrideApiKey,
    baseURL: overrideBaseURL,
    requestProtocol: requestedProtocol,
    stream = false,
  } = options;

  // 回退默认
  if (!provider) provider = "deepseek";

  // 先获取数据库中的配置（模型路由解析需要用到用户设置的模型）
  const dbSecret = getProviderSecret(provider);
  const userModelSetting = normalizeOptionalText(dbSecret?.model);

  // 通过任务路由解析 provider + model
  if (taskType) {
    const route = resolveModel(
      taskType,
      {
        ...(provider ? { provider } : {}),
        ...(requestedModel ? { model: requestedModel } : {}),
        ...(requestedTemperature != null ? { temperature: requestedTemperature } : {}),
        ...(requestedMaxTokens != null ? { maxTokens: requestedMaxTokens } : {}),
      },
      userModelSetting,  // 用户在设置中选择的模型
    );
    provider = route.provider;
    if (!requestedModel) requestedModel = route.model;
    if (requestedTemperature == null) requestedTemperature = route.temperature;
    if (requestedMaxTokens == null) requestedMaxTokens = route.maxTokens;
    if (!requestedProtocol) requestedProtocol = route.requestProtocol;
  }

  const providerName = dbSecret?.displayName ?? getBuiltInProviderName(provider);

  // 解析 API Key
  const apiKey = normalizeOptionalText(overrideApiKey)
    ?? dbSecret?.key
    ?? getProviderEnvApiKey(provider);
  if (!apiKey && providerRequiresApiKey(provider)) {
    throw new Error(`未配置 ${providerName} 的 API Key。`);
  }

  // 解析模型
  const model = normalizeOptionalText(requestedModel)
    ?? userModelSetting
    ?? getProviderEnvModel(provider)
    ?? (isBuiltInProvider(provider) ? PROVIDERS[provider].defaultModel : undefined);
  if (!model) {
    throw new Error(`未配置 ${providerName} 的默认模型。`);
  }

  // 解析 Base URL
  const baseURL = resolveProviderBaseUrl(provider, overrideBaseURL, dbSecret?.baseURL);
  if (!baseURL) {
    throw new Error(`未配置 ${providerName} 的 API URL。`);
  }

  // 解析温度
  const temperature = resolveModelTemperature(provider, model, requestedTemperature);

  // 解析协议
  const requestProtocol = resolveRequestProtocol(provider, requestedProtocol);

  // 解析结构化输出
  const structuredProfile = resolveStructuredOutputProfile({
    provider,
    model,
    baseURL,
    requestProtocol,
    executionMode: forceJSON ? "structured" : "plain",
  });

  // 处理思考模式
  const reasoningEnabled = dbSecret?.reasoningEnabled !== false;
  const shouldDisableReasoning = Boolean(
    forceJSON
    && structuredProfile.requiresNonThinkingForStructured
    && structuredProfile.supportsReasoningToggle,
  );
  const effectiveReasoning = shouldDisableReasoning ? false : reasoningEnabled;
  const reasoningBehavior = resolveReasoningBehavior({
    provider,
    baseURL,
    model,
    reasoningEnabled: effectiveReasoning,
  });

  // 处理 maxTokens
  let effectiveMaxTokens = requestedMaxTokens;
  if (forceJSON && structuredProfile.omitMaxTokensForNativeStructured) {
    effectiveMaxTokens = undefined;
  } else if (
    forceJSON
    && typeof structuredProfile.safeStructuredMaxTokens === "number"
    && typeof effectiveMaxTokens === "number"
  ) {
    effectiveMaxTokens = Math.min(effectiveMaxTokens, structuredProfile.safeStructuredMaxTokens);
  }

  // 构建 response_format
  let responseFormat;
  if (forceJSON) {
    responseFormat = {
      type: structuredProfile.nativeJsonObject ? "json_object" : "json_object",
    };
    // 尝试 json_object，不支持时回退到不传
  }

  const modelKwargs = {
    ...(reasoningBehavior.modelKwargs ?? {}),
    ...(shouldDisableReasoning ? { enable_thinking: false } : {}),
  };

  // 发起请求
  let response;
  let protocolUsed = requestProtocol;

  debugLog("callLLM start", {
    provider,
    model,
    taskType,
    temperature,
    maxTokens: effectiveMaxTokens,
    protocol: requestProtocol,
    forceJSON,
    messageCount: messages.length,
  });

  try {
    if (requestProtocol === "anthropic") {
      response = await callAnthropicAPI({
        apiKey,
        baseURL,
        model,
        temperature,
        maxTokens: effectiveMaxTokens,
        messages,
        timeoutMs,
        stream,
      });
      const payload = await response.json();
      const content = extractAnthropicTextContent(payload);
      const elapsed = Date.now() - startedAt;
      debugLog("callLLM anthropic success", { provider, model, elapsedMs: elapsed, contentLength: content.length });
      return {
        content,
        model,
        provider,
        protocol: "anthropic",
        usage: payload.usage ? {
          inputTokens: payload.usage.input_tokens,
          outputTokens: payload.usage.output_tokens,
        } : undefined,
      };
    }

    // OpenAI 兼容协议
    response = await callOpenAICompatibleAPI({
      apiKey,
      baseURL,
      model,
      temperature,
      maxTokens: effectiveMaxTokens,
      messages,
      timeoutMs,
      stream,
      responseFormat,
      modelKwargs: Object.keys(modelKwargs).length > 0 ? modelKwargs : undefined,
    });

    const payload = await response.json();
    const content = payload.choices?.[0]?.message?.content || "";
    const elapsed = Date.now() - startedAt;
    debugLog("callLLM openai success", {
      provider,
      model,
      elapsedMs: elapsed,
      contentLength: content.length,
      finishReason: payload.choices?.[0]?.finish_reason,
    });
    return {
      content,
      model,
      provider,
      protocol: "openai_compatible",
      usage: payload.usage ? {
        inputTokens: payload.usage.prompt_tokens,
        outputTokens: payload.usage.completion_tokens,
        totalTokens: payload.usage.total_tokens,
      } : undefined,
    };
  } catch (error) {
    const elapsed = Date.now() - startedAt;
    debugLog("callLLM error", {
      provider,
      model,
      elapsedMs: elapsed,
      error: error.message,
    });
    throw error;
  }
}
