import { Router } from "express";
import {
  // 新 API
  getProviders,
  getProviderDetail,
  createProvider,
  updateProviderConfig,
  deleteProvider,
  testLLMConnection,
  getModels,
  getRoutes,
  updateRoute,
  previewProviderModels,
  // 兼容旧 API
  getConfig,
  updateConfig,
  testConnectionLegacy,
  switchModel,
} from "../controllers/aiConfigController.js";

const router = Router();

// ---- 厂商管理 ----
router.get("/ai-config/providers", getProviders);
router.get("/ai-config/providers/:provider", getProviderDetail);
router.post("/ai-config/providers", createProvider);
router.put("/ai-config/providers/:provider", updateProviderConfig);
router.delete("/ai-config/providers/:provider", deleteProvider);

// ---- 连通性测试 ----
router.post("/ai-config/test", testLLMConnection);

// ---- 模型列表 ----
router.get("/ai-config/models", getModels);

// ---- 模型路由 ----
router.get("/ai-config/routes", getRoutes);
router.put("/ai-config/routes", updateRoute);

// ---- 自定义厂商预览 ----
router.post("/ai-config/providers-models", previewProviderModels);

// ---- 兼容旧 API ----
router.get("/ai-config", getConfig);
router.put("/ai-config", updateConfig);
router.post("/ai-config/switch-model", switchModel);

export default router;
