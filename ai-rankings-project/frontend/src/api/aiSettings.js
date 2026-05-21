// AI 设置 API — 多厂商管理
import request from './request.js';

// ========== 厂商管理 ==========

/** 获取所有厂商列表（含模型） */
export function fetchProviders() {
  return request.get('/ai-config/providers');
}

/** 获取单个厂商详情 */
export function fetchProvider(provider) {
  return request.get(`/ai-config/providers/${provider}`);
}

/** 创建自定义厂商 */
export function createProvider(data) {
  return request.post('/ai-config/providers', data);
}

/** 更新厂商配置 */
export function updateProvider(provider, data) {
  return request.put(`/ai-config/providers/${provider}`, data);
}

/** 删除自定义厂商 */
export function deleteProvider(provider) {
  return request.delete(`/ai-config/providers/${provider}`);
}

// ========== 连通性测试 ==========

/** 测试厂商连接 */
export function testConnection(data) {
  return request.post('/ai-config/test', data);
}

// ========== 模型列表 ==========

/** 获取厂商模型列表 */
export function fetchModels(provider, forceRefresh = false) {
  return request.get('/ai-config/models', { params: { provider, forceRefresh: forceRefresh ? 'true' : 'false' } });
}

// ========== 模型路由 ==========

/** 获取所有模型路由配置 */
export function fetchModelRoutes() {
  return request.get('/ai-config/routes');
}

/** 更新模型路由 */
export function updateModelRoute(data) {
  return request.put('/ai-config/routes', data);
}

// ========== 自定义厂商预览 ==========

/** 预览自定义厂商模型列表 */
export function previewProviderModels(data) {
  return request.post('/ai-config/providers-models', data);
}

// ========== 兼容旧 API ==========

/** @deprecated 使用 fetchProviders 替代 */
export function fetchAIConfig() {
  return request.get('/ai-config');
}

/** @deprecated 使用 updateProvider 替代 */
export function updateAIConfig(data) {
  return request.put('/ai-config', data);
}

/** @deprecated 使用 testConnection 替代 */
export function testConnectionLegacy() {
  return request.post('/ai-config/test');
}

/** @deprecated 使用 updateProvider 替代 */
export function switchModel(model) {
  return request.post('/ai-config/switch-model', { model });
}
