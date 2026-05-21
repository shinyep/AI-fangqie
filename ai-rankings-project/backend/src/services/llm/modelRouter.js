// 任务级模型路由 — 数据库持久化的路由配置
import { getDb } from "../../models/database.js";

// 本地项目的任务类型
export const TASK_TYPES = [
  "chapter_analysis",
  "title_analysis",
  "writing_generate",
  "writing_continue",
  "writing_expand",
  "chapter_summary",
  "chapter_review",
  "chapter_repair",
  "chapter_audit",
  "writing_extract_style",
  "default",
];

// 每种任务的默认配置
const DEFAULT_ROUTES = {
  chapter_analysis: {
    provider: "deepseek",
    model: "deepseek-chat",
    temperature: 0.3,
    maxTokens: 4096,
    requestProtocol: "auto",
    structuredFormat: "auto",
  },
  title_analysis: {
    provider: "deepseek",
    model: "deepseek-chat",
    temperature: 0.8,
    maxTokens: 8192,
    requestProtocol: "auto",
    structuredFormat: "auto",
  },
  writing_generate: {
    provider: "deepseek",
    model: "deepseek-chat",
    temperature: 0.9,
    maxTokens: 4096,
    requestProtocol: "auto",
    structuredFormat: "auto",
  },
  writing_continue: {
    provider: "deepseek",
    model: "deepseek-chat",
    temperature: 0.85,
    maxTokens: 4096,
    requestProtocol: "auto",
    structuredFormat: "auto",
  },
  writing_expand: {
    provider: "deepseek",
    model: "deepseek-chat",
    temperature: 0.75,
    maxTokens: 4096,
    requestProtocol: "auto",
    structuredFormat: "auto",
  },
  chapter_summary: {
    provider: "deepseek",
    model: "deepseek-chat",
    temperature: 0.45,
    maxTokens: 1200,
    requestProtocol: "auto",
    structuredFormat: "auto",
  },
  chapter_review: {
    provider: "deepseek",
    model: "deepseek-chat",
    temperature: 0.1,
    maxTokens: 4096,
    requestProtocol: "auto",
    structuredFormat: "json_object",
  },
  chapter_repair: {
    provider: "deepseek",
    model: "deepseek-chat",
    temperature: 0.3,
    maxTokens: 8192,
    requestProtocol: "auto",
    structuredFormat: "auto",
  },
  chapter_audit: {
    provider: "deepseek",
    model: "deepseek-chat",
    temperature: 0.1,
    maxTokens: 4096,
    requestProtocol: "auto",
    structuredFormat: "json_object",
  },
  writing_extract_style: {
    provider: "deepseek",
    model: "deepseek-chat",
    temperature: 0.3,
    maxTokens: 4096,
    requestProtocol: "auto",
    structuredFormat: "auto",
  },
  default: {
    provider: "deepseek",
    model: "deepseek-chat",
    temperature: 0.7,
    maxTokens: 4096,
    requestProtocol: "auto",
    structuredFormat: "auto",
  },
};

export function normalizeRequestProtocol(value) {
  if (value === "openai_compatible" || value === "anthropic") return value;
  return "auto";
}

export function normalizeStructuredFormat(value) {
  if (value === "json_schema" || value === "json_object" || value === "prompt_json") return value;
  return "auto";
}

function normalizeProvider(provider) {
  if (typeof provider !== "string" || !provider.trim()) return "deepseek";
  return provider.trim();
}

/**
 * 根据任务类型解析最终的 provider/model/temperature
 * @param {string} taskType - 任务类型
 * @param {object} userOverride - 用户显式覆盖
 * @param {string} [userModelSetting] - 用户在设置中选择的模型（数据库中的偏好）
 */
export function resolveModel(taskType, userOverride = {}, userModelSetting) {
  const normalizedTaskType = TASK_TYPES.includes(taskType) ? taskType : "default";
  const base = DEFAULT_ROUTES[normalizedTaskType] ?? DEFAULT_ROUTES.default;

  let dbRoute = null;
  try {
    const db = getDb();
    dbRoute = db
      .prepare("SELECT * FROM ai_model_route WHERE task_type = ?")
      .get(normalizedTaskType);
  } catch {
    // 表可能不存在
  }

  const routeSource = dbRoute || base;

  // 模型优先级：显式传入 > 数据库路由 > 用户设置偏好 > 默认
  const resolvedModel =
    userOverride.model ||
    (dbRoute ? routeSource.model : userModelSetting) ||
    base.model;

  return {
    provider: normalizeProvider(userOverride.provider || routeSource.provider),
    model: resolvedModel,
    temperature:
      userOverride.temperature ?? routeSource.temperature ?? base.temperature,
    maxTokens: userOverride.maxTokens ?? routeSource.max_tokens ?? base.maxTokens,
    requestProtocol:
      normalizeRequestProtocol(userOverride.requestProtocol || routeSource.request_protocol),
    structuredFormat:
      normalizeStructuredFormat(userOverride.structuredFormat || routeSource.structured_format),
    routeKey: normalizedTaskType,
    routeDegraded: !dbRoute && normalizedTaskType !== "default",
  };
}

/**
 * 列出所有模型路由配置
 */
export function listModelRouteConfigs() {
  try {
    const db = getDb();
    const rows = db
      .prepare("SELECT * FROM ai_model_route ORDER BY task_type")
      .all();
    return rows.map((r) => ({
      taskType: r.task_type,
      provider: r.provider,
      model: r.model,
      temperature: r.temperature,
      maxTokens: r.max_tokens,
      requestProtocol: r.request_protocol || "auto",
      structuredFormat: r.structured_format || "auto",
    }));
  } catch {
    return [];
  }
}

/**
 * 更新或插入模型路由配置
 */
export function upsertModelRouteConfig(taskType, data) {
  const db = getDb();
  const normalizedTaskType = TASK_TYPES.includes(taskType) ? taskType : "default";
  const provider = normalizeProvider(data.provider || "deepseek");
  const requestProtocol = normalizeRequestProtocol(data.requestProtocol);
  const structuredFormat = normalizeStructuredFormat(data.structuredFormat);

  db.prepare(`
    INSERT INTO ai_model_route (task_type, provider, model, temperature, max_tokens, request_protocol, structured_format, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(task_type) DO UPDATE SET
      provider = excluded.provider,
      model = excluded.model,
      temperature = excluded.temperature,
      max_tokens = excluded.max_tokens,
      request_protocol = excluded.request_protocol,
      structured_format = excluded.structured_format,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    normalizedTaskType,
    provider,
    data.model || "deepseek-chat",
    data.temperature ?? 0.7,
    data.maxTokens ?? 4096,
    requestProtocol,
    structuredFormat,
  );
}
