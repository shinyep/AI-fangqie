/**
 * 审稿 API 层 — 对应后端 novelReviewRoutes
 */
import request from './request.js';

/**
 * 执行章节审稿
 * @returns {Promise<{score: object, issues: Array}>}
 */
export function reviewChapter(novelId, chapterId, options = {}) {
  return request.post(`/novel-review/${novelId}/chapters/${chapterId}/review`, options);
}

/**
 * 执行专项审计
 * @param {'full'|'continuity'|'character'|'plot'|'mode_fit'} scope
 */
export function auditChapter(novelId, chapterId, scope, options = {}) {
  return request.post(`/novel-review/${novelId}/chapters/${chapterId}/audit/${scope}`, options);
}

/**
 * 获取章节审计报告列表
 */
export function getAuditReports(novelId, chapterId) {
  return request.get(`/novel-review/${novelId}/chapters/${chapterId}/audit-reports`);
}

/**
 * 获取未解决审计问题
 */
export function getOpenAuditIssues(novelId, params = {}) {
  return request.get(`/novel-review/${novelId}/audit-issues`, { params });
}

/**
 * 批量解决审计问题
 */
export function resolveAuditIssues(novelId, issueIds) {
  return request.post(`/novel-review/${novelId}/audit-issues/resolve`, { issueIds });
}

/**
 * 获取质量报告
 */
export function getQualityReport(novelId) {
  return request.get(`/novel-review/${novelId}/quality-report`);
}

/**
 * 执行章节修复（SSE 流，不能走 encrypt 中间件自动解密）
 * 直接返回 fetch API
 */
export function repairChapterStream(novelId, chapterId, options = {}) {
  const url = `/api/v1/novel-review/${novelId}/chapters/${chapterId}/repair`;
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
}

/**
 * 应用修复结果（非 SSE）
 */
export function applyRepairResult(novelId, chapterId, data = {}) {
  return request.post(`/novel-review/${novelId}/chapters/${chapterId}/repair/apply`, data);
}
