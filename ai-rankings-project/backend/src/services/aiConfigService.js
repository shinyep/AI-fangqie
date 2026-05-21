// AI 配置服务 — 多厂商管理 + 模型路由
// 替代旧的单行 ai_config 模式

import { getDb } from "../models/database.js";
import {
  PROVIDERS,
  BUILTIN_PROVIDERS,
  isBuiltInProvider,
  getBuiltInProviderName,
} from "./llm/providers.js";
import { getProviderModels } from "./llm/modelCatalog.js";
import { setProviderSecretCache } from "./llm/factory.js";
import {
  listModelRouteConfigs,
  upsertModelRouteConfig,
} from "./llm/modelRouter.js";

// ========== 厂商管理 ==========

/**
 * 列出所有厂商（内置 + 自定义）
 */
export function listProviders() {
  const db = getDb();
  const result = [];

  // 内置厂商
  for (const provider of BUILTIN_PROVIDERS) {
    const builtin = PROVIDERS[provider];
    let dbRow = null;
    try {
      dbRow = db.prepare("SELECT * FROM ai_provider WHERE provider = ?").get(provider);
    } catch { /* 表可能不存在 */ }

    const customModels = parseModelsJson(dbRow?.models_json);
    const currentModel = dbRow?.model || builtin.defaultModel;
    const effectiveModels = customModels.length
      ? customModels
      : (currentModel && !builtin.models.includes(currentModel)
        ? [currentModel, ...builtin.models]
        : builtin.models);
    result.push({
      provider,
      displayName: builtin.name,
      model: currentModel,
      apiKey: dbRow?.api_key || "",
      apiKeyMasked: maskKey(dbRow?.api_key),
      baseURL: dbRow?.api_base || builtin.baseURL,
      isActive: dbRow ? (dbRow.is_active !== 0) : false,
      isBuiltin: true,
      isConfigured: Boolean(dbRow?.api_key),
      requiresApiKey: builtin.requiresApiKey !== false,
      reasoningEnabled: dbRow ? (dbRow.reasoning_enabled !== 0) : true,
      concurrencyLimit: dbRow?.concurrency_limit || 0,
      requestIntervalMs: dbRow?.request_interval_ms || 0,
      defaultModel: builtin.defaultModel,
      builtinModels: effectiveModels,
    });
  }

  // 自定义厂商
  try {
    const customs = db.prepare("SELECT * FROM ai_provider WHERE is_builtin = 0 ORDER BY display_name").all();
    for (const row of customs) {
      const customModels = parseModelsJson(row.models_json);
      // models_json 为空时，至少包含当前已配置的模型
      const effectiveModels = customModels.length
        ? customModels
        : (row.model ? [row.model] : []);
      result.push({
        provider: row.provider,
        displayName: row.display_name,
        model: row.model || (effectiveModels[0] || ""),
        apiKey: row.api_key || "",
        apiKeyMasked: maskKey(row.api_key),
        baseURL: row.api_base,
        isActive: row.is_active !== 0,
        isBuiltin: false,
        isConfigured: Boolean(row.api_key),
        requiresApiKey: false,
        reasoningEnabled: row.reasoning_enabled !== 0,
        concurrencyLimit: row.concurrency_limit || 0,
        requestIntervalMs: row.request_interval_ms || 0,
        defaultModel: effectiveModels[0] || "",
        builtinModels: effectiveModels,
      });
    }
  } catch { /* 表可能不存在 */ }

  return result;
}

/**
 * 获取单个厂商详情
 */
export function getProvider(provider) {
  const db = getDb();

  if (isBuiltInProvider(provider)) {
    const builtin = PROVIDERS[provider];
    let dbRow = null;
    try {
      dbRow = db.prepare("SELECT * FROM ai_provider WHERE provider = ?").get(provider);
    } catch { /* ignore */ }

    const dbModels = parseModelsJson(dbRow?.models_json);
    return {
      provider,
      displayName: builtin.name,
      model: dbRow?.model || builtin.defaultModel,
      apiKey: dbRow?.api_key || "",
      apiKeyMasked: maskKey(dbRow?.api_key),
      baseURL: dbRow?.api_base || builtin.baseURL,
      isActive: dbRow ? (dbRow.is_active !== 0) : false,
      isBuiltin: true,
      isConfigured: Boolean(dbRow?.api_key),
      requiresApiKey: builtin.requiresApiKey !== false,
      reasoningEnabled: dbRow ? (dbRow.reasoning_enabled !== 0) : true,
      concurrencyLimit: dbRow?.concurrency_limit || 0,
      requestIntervalMs: dbRow?.request_interval_ms || 0,
      defaultModel: builtin.defaultModel,
      builtinModels: dbModels.length ? dbModels : builtin.models,
      envKey: builtin.envKey,
    };
  }

  // 自定义厂商
  try {
    const row = db.prepare("SELECT * FROM ai_provider WHERE provider = ?").get(provider);
    if (!row) return null;
    const dbModels = parseModelsJson(row.models_json);
    return {
      provider: row.provider,
      displayName: row.display_name,
      model: row.model || (dbModels[0] || ""),
      apiKey: row.api_key || "",
      apiKeyMasked: maskKey(row.api_key),
      baseURL: row.api_base,
      isActive: row.is_active !== 0,
      isBuiltin: false,
      isConfigured: Boolean(row.api_key),
      requiresApiKey: false,
      reasoningEnabled: row.reasoning_enabled !== 0,
      concurrencyLimit: row.concurrency_limit || 0,
      requestIntervalMs: row.request_interval_ms || 0,
      defaultModel: dbModels[0] || "",
      builtinModels: dbModels,
    };
  } catch {
    return null;
  }
}

/**
 * 创建自定义厂商
 */
export function createCustomProvider({ name, key = "", model = "", baseURL, isActive = true, reasoningEnabled = true, concurrencyLimit = 0, requestIntervalMs = 0, models = [] }) {
  const db = getDb();
  const provider = buildCustomProviderId(name);

  // 确保唯一
  let candidate = provider;
  let suffix = 2;
  while (db.prepare("SELECT provider FROM ai_provider WHERE provider = ?").get(candidate)) {
    candidate = `${provider}_${suffix}`;
    suffix++;
  }

  const modelsJson = Array.isArray(models) && models.length ? JSON.stringify(models) : "";

  db.prepare(`
    INSERT INTO ai_provider (provider, display_name, api_key, model, api_base, is_active, is_builtin, reasoning_enabled, concurrency_limit, request_interval_ms, models_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(candidate, name.trim(), key?.trim() || "", model?.trim() || "", baseURL.trim(), isActive ? 1 : 0, reasoningEnabled ? 1 : 0, concurrencyLimit || 0, requestIntervalMs || 0, modelsJson);

  // 更新缓存
  setProviderSecretCache(candidate, {
    key: key?.trim(),
    model: model?.trim(),
    baseURL: baseURL.trim(),
    displayName: name.trim(),
    reasoningEnabled,
    isActive,
  });

  return getProvider(candidate);
}

/**
 * 更新厂商配置
 */
export function updateProvider(provider, data) {
  const db = getDb();
  const existing = getProvider(provider);
  if (!existing) throw new Error(`厂商 ${provider} 不存在`);

  const merged = {
    apiKey: data.apiKey !== undefined ? (data.apiKey || "") : existing.apiKey,
    model: data.model !== undefined ? (data.model || "") : existing.model,
    baseURL: data.baseURL !== undefined ? data.baseURL : existing.baseURL,
    displayName: data.displayName !== undefined ? (data.displayName || existing.displayName) : existing.displayName,
    isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
    reasoningEnabled: data.reasoningEnabled !== undefined ? data.reasoningEnabled : existing.reasoningEnabled,
    concurrencyLimit: data.concurrencyLimit !== undefined ? data.concurrencyLimit : existing.concurrencyLimit,
    requestIntervalMs: data.requestIntervalMs !== undefined ? data.requestIntervalMs : existing.requestIntervalMs,
    modelsJson: data.models !== undefined
      ? (Array.isArray(data.models) && data.models.length ? JSON.stringify(data.models) : "")
      : (existing.builtinModels?.length ? JSON.stringify(existing.builtinModels) : ""),
  };

  db.prepare(`
    INSERT INTO ai_provider (provider, display_name, api_key, model, api_base, is_active, is_builtin, reasoning_enabled, concurrency_limit, request_interval_ms, models_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(provider) DO UPDATE SET
      display_name = excluded.display_name,
      api_key = excluded.api_key,
      model = excluded.model,
      api_base = excluded.api_base,
      is_active = excluded.is_active,
      reasoning_enabled = excluded.reasoning_enabled,
      concurrency_limit = excluded.concurrency_limit,
      request_interval_ms = excluded.request_interval_ms,
      models_json = excluded.models_json,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    provider,
    merged.displayName || provider,
    merged.apiKey,
    merged.model,
    merged.baseURL,
    merged.isActive ? 1 : 0,
    isBuiltInProvider(provider) ? 1 : 0,
    merged.reasoningEnabled ? 1 : 0,
    merged.concurrencyLimit,
    merged.requestIntervalMs,
    merged.modelsJson,
  );

  // 更新缓存
  setProviderSecretCache(provider, {
    key: merged.apiKey || undefined,
    model: merged.model || undefined,
    baseURL: merged.baseURL,
    displayName: merged.displayName,
    reasoningEnabled: merged.reasoningEnabled,
    isActive: merged.isActive,
  });

  return getProvider(provider);
}

/**
 * 删除自定义厂商
 */
export function deleteCustomProvider(provider) {
  if (isBuiltInProvider(provider)) throw new Error("内置厂商不能删除");
  const db = getDb();
  const existing = db.prepare("SELECT provider FROM ai_provider WHERE provider = ?").get(provider);
  if (!existing) throw new Error("没有找到这个自定义厂商");

  // 检查是否被路由引用
  const routeRef = db.prepare("SELECT task_type FROM ai_model_route WHERE provider = ?").get(provider);
  if (routeRef) throw new Error(`请先把模型路由 ${routeRef.task_type} 改到其他厂商，再删除这个厂商。`);

  db.prepare("DELETE FROM ai_provider WHERE provider = ?").run(provider);
  setProviderSecretCache(provider, null);
}

// ========== 模型列表 ==========

/**
 * 获取厂商可用模型列表
 */
export async function getProviderModelsList(provider, options = {}) {
  const config = getProvider(provider);
  if (!config) throw new Error(`厂商 ${provider} 不存在`);

  const apiKey = config.apiKey || undefined;
  const baseURL = config.baseURL;

  try {
    const models = await getProviderModels(provider, {
      apiKey,
      baseURL,
      forceRefresh: options.forceRefresh,
    });
    return models;
  } catch {
    return isBuiltInProvider(provider) ? PROVIDERS[provider].models : [config.model].filter(Boolean);
  }
}

// ========== 模型路由管理 ==========

export function getModelRoutes() {
  return listModelRouteConfigs();
}

export function updateModelRoute(taskType, data) {
  upsertModelRouteConfig(taskType, data);
  return getModelRoutes();
}

// ========== 兼容旧 API ==========

/**
 * 获取当前默认的 AI 配置（兼容旧接口）
 * 返回第一个活跃的厂商配置
 */
export function getAIConfig() {
  const providers = listProviders();
  const active = providers.find((p) => p.isActive) || providers[0];
  if (!active) {
    return {
      provider: "deepseek",
      model: "deepseek-chat",
      api_key: "",
      api_base: "https://api.deepseek.com/v1",
      temperature: 0.7,
      max_tokens: 4096,
    };
  }
  return {
    provider: active.provider,
    model: active.model || active.defaultModel,
    api_key: active.apiKey,
    api_base: active.baseURL,
    temperature: 0.7,
    max_tokens: 4096,
  };
}

/**
 * 更新默认 AI 配置（兼容旧接口）
 */
export function updateAIConfig(config) {
  const current = getAIConfig();
  const provider = config.provider || current.provider;
  const db = getDb();

  // 确保 ai_provider 表存在
  try {
    db.prepare("SELECT 1 FROM ai_provider LIMIT 0").run();
  } catch {
    return current;
  }

  updateProvider(provider, {
    apiKey: config.api_key !== undefined ? config.api_key : undefined,
    model: config.model !== undefined ? config.model : undefined,
    baseURL: config.api_base !== undefined ? config.api_base : undefined,
  });

  return getAIConfig();
}

// ========== 工具函数 ==========

function parseModelsJson(json) {
  if (!json || typeof json !== "string") return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function maskKey(key) {
  if (!key || key.length < 8) return "";
  return key.slice(0, 8) + "****" + key.slice(-4);
}

function buildCustomProviderId(name) {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `custom_${normalized || "provider"}`;
}
