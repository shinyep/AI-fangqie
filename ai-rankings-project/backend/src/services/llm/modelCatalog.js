// 模型列表获取与缓存
// 移植自 AI-Novel-Writing-Assistant server/src/llm/modelCatalog.ts

import {
  isBuiltInProvider,
  providerRequiresApiKey,
  PROVIDERS,
  resolveProviderBaseUrl,
} from "./providers.js";

const MODEL_CACHE_TTL_MS = 30 * 60 * 1000; // 30 分钟缓存
const modelCache = new Map();

function uniqueModels(models) {
  return Array.from(new Set(models.map((item) => item.trim()).filter(Boolean)));
}

function getFallbackModels(provider, options = {}) {
  const builtInModels = isBuiltInProvider(provider) ? PROVIDERS[provider].models : [];
  return uniqueModels([
    ...builtInModels,
    ...(options.fallbackModels ?? []),
    options.fallbackModel ?? "",
  ]);
}

function getCacheKey(provider, baseURL) {
  const resolvedBaseURL = resolveProviderBaseUrl(provider, baseURL, baseURL) ?? "";
  return `${provider}::${resolvedBaseURL}`;
}

function getCachedModels(provider, baseURL) {
  const cacheKey = getCacheKey(provider, baseURL);
  const item = modelCache.get(cacheKey);
  if (!item) return undefined;
  if (Date.now() - item.cachedAt > MODEL_CACHE_TTL_MS) {
    modelCache.delete(cacheKey);
    return undefined;
  }
  return item.models;
}

function setCachedModels(provider, models, baseURL) {
  const normalized = uniqueModels(models);
  modelCache.set(getCacheKey(provider, baseURL), { models: normalized, cachedAt: Date.now() });
  return normalized;
}

function parseModelIds(payload) {
  if (!payload || typeof payload !== "object") return [];
  const data = payload.data ?? payload.models;
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      return item.id ?? item.model ?? item.name ?? "";
    })
    .filter(Boolean);
}

async function fetchJson(url, init) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`拉取模型列表失败（${response.status}）：${detail || "未知错误"}`);
    }
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

function buildHeaders(provider, apiKey) {
  const headers = { Accept: "application/json" };
  if (!apiKey) return headers;
  if (provider === "anthropic") {
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = process.env.ANTHROPIC_VERSION ?? "2023-06-01";
    return headers;
  }
  headers.Authorization = `Bearer ${apiKey}`;
  return headers;
}

async function fetchOllamaModels(baseURL) {
  const nativeBaseURL = baseURL.endsWith("/v1") ? baseURL.slice(0, -3) : baseURL;
  try {
    const payload = await fetchJson(`${nativeBaseURL}/api/tags`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const models = parseModelIds(payload);
    if (models.length > 0) return models;
  } catch {
    // 回退到 OpenAI 兼容端点
  }
  const payload = await fetchJson(`${baseURL}/models`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  const models = parseModelIds(payload);
  if (models.length === 0) throw new Error("模型列表为空。");
  return models;
}

/**
 * 远程拉取模型列表
 */
export async function fetchProviderModels(provider, apiKey, customBaseURL) {
  const baseURL = resolveProviderBaseUrl(provider, customBaseURL, customBaseURL);
  if (!baseURL) throw new Error("未配置可用的 API URL。");

  if (provider === "ollama") {
    return fetchOllamaModels(baseURL);
  }

  const payload = await fetchJson(`${baseURL}/models`, {
    method: "GET",
    headers: buildHeaders(provider, apiKey),
  });

  const models = parseModelIds(payload);
  if (models.length === 0) throw new Error("模型列表为空。");
  return models;
}

/**
 * 获取厂商模型列表（带缓存）
 */
export async function getProviderModels(provider, options = {}) {
  const fallback = getFallbackModels(provider, options);

  if (!options.forceRefresh) {
    const cached = getCachedModels(provider, options.baseURL);
    if (cached && cached.length > 0) return cached;
  }

  const normalizedApiKey = options.apiKey?.trim();
  const allowAnonymous = options.allowAnonymous ?? !providerRequiresApiKey(provider);
  const canFetchRemotely = normalizedApiKey || allowAnonymous;
  if (!canFetchRemotely) return fallback;

  try {
    const models = await fetchProviderModels(provider, normalizedApiKey, options.baseURL);
    return models.length > 0 ? setCachedModels(provider, models, options.baseURL) : fallback;
  } catch {
    const cached = getCachedModels(provider, options.baseURL);
    if (cached && cached.length > 0) return cached;
    return fallback;
  }
}

/**
 * 强制刷新厂商模型列表
 */
export async function refreshProviderModels(provider, apiKey, baseURL) {
  const models = await fetchProviderModels(provider, apiKey?.trim(), baseURL);
  return setCachedModels(provider, models, baseURL);
}
