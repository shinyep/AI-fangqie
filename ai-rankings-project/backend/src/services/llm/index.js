// LLM 模块统一导出

export {
  PROVIDERS,
  BUILTIN_PROVIDERS,
  isBuiltInProvider,
  normalizeBaseURL,
  resolveProviderBaseUrl,
  getProviderEnvApiKey,
  getProviderEnvBaseUrl,
  getProviderEnvModel,
  getProviderDefaultBaseUrl,
  providerRequiresApiKey,
  getBuiltInProviderName,
} from "./providers.js";

export {
  resolveStructuredOutputProfile,
  selectStructuredOutputStrategy,
  buildStructuredResponseFormat,
  getModelParameterCompatibility,
  resolveModelTemperature,
  getJsonCapability,
  isDeepSeekThinkingModeProvider,
  isMiniMaxCompatibleProvider,
} from "./capabilities.js";

export {
  TASK_TYPES,
  resolveModel,
  listModelRouteConfigs,
  upsertModelRouteConfig,
  normalizeRequestProtocol,
  normalizeStructuredFormat,
} from "./modelRouter.js";

export {
  callLLM,
  setProviderSecretCache,
  clearProviderSecretCache,
} from "./factory.js";

export {
  getProviderModels,
  fetchProviderModels,
  refreshProviderModels,
} from "./modelCatalog.js";

export {
  testConnection,
} from "./connectivity.js";
