// AI 配置控制器 — 多厂商管理 API
import {
  listProviders,
  getProvider,
  createCustomProvider,
  updateProvider,
  deleteCustomProvider,
  getProviderModelsList,
  getModelRoutes,
  updateModelRoute,
  getAIConfig,
  updateAIConfig,
} from "../services/aiConfigService.js";
import { testConnection } from "../services/llm/connectivity.js";
import { refreshProviderModels } from "../services/llm/modelCatalog.js";

// ========== 厂商管理 ==========

export async function getProviders(req, res) {
  try {
    const providers = listProviders();
    res.json({ providers, total: providers.length });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
}

export async function getProviderDetail(req, res) {
  try {
    const { provider } = req.params;
    const detail = getProvider(provider);
    if (!detail) {
      return res.status(404).json({ code: 404, message: `厂商 ${provider} 不存在` });
    }
    res.json(detail);
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
}

export async function createProvider(req, res) {
  try {
    const { name, key, model, baseURL, isActive, reasoningEnabled, concurrencyLimit, requestIntervalMs, models: manualModels } = req.body || {};
    if (!name?.trim()) {
      return res.status(400).json({ code: 400, message: "厂商名称不能为空" });
    }
    if (!baseURL?.trim()) {
      return res.status(400).json({ code: 400, message: "API URL 不能为空" });
    }

    let models = Array.isArray(manualModels) ? manualModels : [];
    let message = "自定义厂商已创建。";

    if (!models.length) {
      try {
        models = await refreshProviderModels("custom_preview", key?.trim(), baseURL.trim());
      } catch {
        if (!model && !manualModels?.length) {
          return res.status(400).json({ code: 400, message: "未能获取模型列表，请检查 API URL 或手动填写默认模型" });
        }
        message = "自定义厂商已创建，但模型列表刷新失败。可以稍后刷新。";
      }
    }

    // 如果手动提供了 models 但 model 不在其中，把 model 也加入
    if (model && !models.includes(model)) {
      models.unshift(model);
    }

    const result = createCustomProvider({
      name: name.trim(),
      key: key || "",
      model: model || models[0] || "",
      baseURL: baseURL.trim(),
      isActive: isActive !== false,
      reasoningEnabled: reasoningEnabled !== false,
      concurrencyLimit: concurrencyLimit || 0,
      requestIntervalMs: requestIntervalMs || 0,
      models,
    });

    res.status(201).json({ ...result, models, message });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
}

export async function updateProviderConfig(req, res) {
  try {
    const { provider } = req.params;
    const { apiKey, model, baseURL, isActive, reasoningEnabled, concurrencyLimit, requestIntervalMs, displayName, models } = req.body || {};
    const result = updateProvider(provider, {
      apiKey,
      model,
      baseURL,
      isActive,
      reasoningEnabled,
      concurrencyLimit,
      requestIntervalMs,
      displayName,
      models,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
}

export async function deleteProvider(req, res) {
  try {
    const { provider } = req.params;
    deleteCustomProvider(provider);
    res.json({ message: "自定义厂商已删除。" });
  } catch (error) {
    const status = error.message.includes("内置") ? 400 : error.message.includes("没有找到") ? 404 : 500;
    res.status(status).json({ code: status, message: error.message });
  }
}

// ========== 连通性测试 ==========

export async function testLLMConnection(req, res) {
  try {
    const { provider, model, apiKey, baseURL, probeMode, requestProtocol } = req.body || {};
    const result = await testConnection({
      provider: provider || "deepseek",
      model,
      apiKey,
      baseURL,
      probeMode: probeMode || "both",
      requestProtocol,
    });
    res.json(result);
  } catch (error) {
    res.json({ ok: false, error: error.message });
  }
}

// ========== 模型列表 ==========

export async function getModels(req, res) {
  try {
    const { provider, forceRefresh } = req.query;
    const result = getAIConfig();
    const targetProvider = provider || result.provider;

    try {
      const models = await getProviderModelsList(targetProvider, {
        forceRefresh: forceRefresh === "true",
      });
      res.json({
        provider: targetProvider,
        models: models.map((m) => ({
          label: m,
          value: m,
          provider: targetProvider,
        })),
      });
    } catch {
      // 回退：返回内置模型列表
      const { PROVIDERS, isBuiltInProvider } = await import("../services/llm/providers.js");
      const fallbackModels = isBuiltInProvider(targetProvider)
        ? PROVIDERS[targetProvider].models.map((m) => ({ label: m, value: m, provider: targetProvider }))
        : [{ label: result.model, value: result.model, provider: targetProvider }];
      res.json({ provider: targetProvider, models: fallbackModels });
    }
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
}

// ========== 模型路由 ==========

export async function getRoutes(req, res) {
  try {
    const routes = getModelRoutes();
    res.json({ routes });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
}

export async function updateRoute(req, res) {
  try {
    const { taskType, provider, model, temperature, maxTokens, requestProtocol, structuredFormat } = req.body || {};
    if (!taskType) {
      return res.status(400).json({ code: 400, message: "taskType 不能为空" });
    }
    const routes = updateModelRoute(taskType, { provider, model, temperature, maxTokens, requestProtocol, structuredFormat });
    res.json({ routes });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
}

// ========== 预览自定义厂商模型列表 ==========

export async function previewProviderModels(req, res) {
  try {
    const { key, baseURL } = req.body || {};
    if (!baseURL?.trim()) {
      return res.status(400).json({ code: 400, message: "API URL 不能为空" });
    }
    const models = await refreshProviderModels("custom_preview", key?.trim(), baseURL.trim());
    res.json({ models, defaultModel: models[0] || "" });
  } catch (error) {
    res.status(400).json({ code: 400, message: error.message });
  }
}

// ========== 兼容旧接口 ==========

export async function getConfig(req, res) {
  try {
    const config = getAIConfig();
    const maskedKey = config.api_key
      ? config.api_key.slice(0, 8) + "****" + config.api_key.slice(-4)
      : "";
    res.json({ ...config, api_key: maskedKey });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
}

export async function updateConfig(req, res) {
  try {
    const { provider, model, api_key, api_base, temperature, max_tokens } = req.body || {};
    const config = updateAIConfig({ provider, model, api_key, api_base, temperature, max_tokens });
    const maskedKey = config.api_key
      ? config.api_key.slice(0, 8) + "****" + config.api_key.slice(-4)
      : "";
    res.json({ ...config, api_key: maskedKey });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
}

export async function testConnectionLegacy(req, res) {
  try {
    const config = getAIConfig();
    if (!config.api_key) {
      res.json({ ok: false, error: "请先配置 API Key" });
      return;
    }
    const response = await fetch(`${config.api_base}/models`, {
      headers: { Authorization: `Bearer ${config.api_key}` },
    });
    if (response.ok) {
      res.json({ ok: true });
    } else {
      const body = await response.text();
      res.json({ ok: false, error: `API 返回 ${response.status}: ${body.slice(0, 100)}` });
    }
  } catch (error) {
    res.json({ ok: false, error: error.message });
  }
}

export async function switchModel(req, res) {
  try {
    const { model } = req.body || {};
    if (!model) {
      return res.status(400).json({ code: 400, message: "model is required" });
    }
    updateAIConfig({ model });
    const config = getAIConfig();
    res.json({ model: config.model, provider: config.provider, api_base: config.api_base });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
}
