// 连通性测试
// 移植自 AI-Novel-Writing-Assistant server/src/llm/connectivity.ts

import { callLLM } from "./factory.js";
import { resolveStructuredOutputProfile } from "./capabilities.js";

function toErrorMessage(error) {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return "连接测试失败。";
}

/**
 * 测试普通文本生成连通性
 */
async function testPlainConnection({ provider, model, apiKey, baseURL, requestProtocol }) {
  try {
    const result = await callLLM({
      provider,
      model,
      apiKey,
      baseURL,
      temperature: 0.1,
      maxTokens: 16,
      timeoutMs: 30000,
      requestProtocol,
      messages: [{ role: "user", content: "请只回复 ok" }],
    });
    return {
      ok: true,
      latency: null,
      error: null,
      requestProtocol: result.protocol,
      model: result.model,
    };
  } catch (error) {
    return {
      ok: false,
      latency: null,
      error: toErrorMessage(error),
      requestProtocol: requestProtocol ?? null,
      model: model || "",
    };
  }
}

/**
 * 测试结构化输出兼容性
 */
async function testStructuredConnection({ provider, model, apiKey, baseURL, requestProtocol }) {
  try {
    const result = await callLLM({
      provider,
      model,
      apiKey,
      baseURL,
      temperature: 0.2,
      maxTokens: 256,
      timeoutMs: 30000,
      requestProtocol,
      forceJSON: true,
      messages: [
        { role: "system", content: "你正在执行结构化输出兼容性探针。必须只输出合法 JSON。" },
        { role: "user", content: '请输出一个 JSON 对象，字段 status 的值必须是 ok。"' },
      ],
    });

    const profile = resolveStructuredOutputProfile({
      provider,
      model,
      baseURL,
      requestProtocol: result.protocol,
      executionMode: "structured",
    });

    return {
      ok: true,
      latency: null,
      error: null,
      requestProtocol: result.protocol,
      strategy: profile.preferredStructuredStrategy,
      nativeJsonObject: profile.nativeJsonObject,
      nativeJsonSchema: profile.nativeJsonSchema,
      profileFamily: profile.family,
    };
  } catch (error) {
    return {
      ok: false,
      latency: null,
      error: toErrorMessage(error),
      requestProtocol: requestProtocol ?? null,
      strategy: null,
      nativeJsonObject: false,
      nativeJsonSchema: false,
      profileFamily: null,
    };
  }
}

function getProtocolCandidates(preferred) {
  if (preferred === "openai_compatible" || preferred === "anthropic") {
    return [preferred, preferred === "anthropic" ? "openai_compatible" : "anthropic"];
  }
  return ["openai_compatible", "anthropic"];
}

/**
 * 全面连通性测试（含协议自动协商）
 */
export async function testConnection({ provider, model, apiKey, baseURL, probeMode = "both", requestProtocol }) {
  let plain = null;
  let structured = null;

  if (probeMode === "plain" || probeMode === "both") {
    for (const protocol of getProtocolCandidates(requestProtocol)) {
      plain = await testPlainConnection({ provider, model, apiKey, baseURL, requestProtocol: protocol });
      if (plain.ok) break;
    }
  }

  if (probeMode === "structured" || probeMode === "both") {
    for (const protocol of getProtocolCandidates(requestProtocol)) {
      structured = await testStructuredConnection({ provider, model, apiKey, baseURL, requestProtocol: protocol });
      if (structured.ok) break;
    }
  }

  const top = plain ?? structured ?? { ok: false, error: "连接测试失败。", requestProtocol: null };

  return {
    provider,
    model: plain?.model ?? structured?.model ?? model ?? "",
    ok: top.ok,
    latency: top.latency,
    error: top.error,
    requestProtocol: top.requestProtocol,
    plain,
    structured,
  };
}
