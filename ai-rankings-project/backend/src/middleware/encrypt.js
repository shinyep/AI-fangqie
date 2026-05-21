import { encrypt } from '../utils/crypto.js';

/**
 * AES加密响应中间件
 * 拦截所有 /api/v1/* 的 JSON 响应，将其包装为加密格式
 */
export function encryptMiddleware(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = function (body) {
    if (req.originalUrl.startsWith('/api/v1')) {
      const statusCode = res.statusCode >= 400 ? res.statusCode : 200;
      const isSuccess = statusCode < 400;
      const encrypted = encrypt(body);
      return originalJson({
        code: body?.code || statusCode,
        status: body?.status || (isSuccess ? 'Success' : 'Error'),
        message: body?.message || (isSuccess ? 'Success' : 'Error'),
        data: { encoded: encrypted },
      });
    }
    return originalJson(body);
  };

  next();
}
