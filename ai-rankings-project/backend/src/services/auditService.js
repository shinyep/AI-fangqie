/**
 * 审计服务 — 4类专项审计 + 问题管理
 */
import { getDb } from "../models/database.js";
import { getProject } from "./bookProjectService.js";
import { getChapter } from "./chapterService.js";
import { callLLM } from "./llm/factory.js";
import {
  getAuditConfig,
  getValidAuditTypes,
  buildAuditPrompt,
  validateAuditOutput,
} from "../prompts/auditPrompts.js";
import { buildReviewContext } from "./contextService.js";

const CONTENT_AUDIT_LIMIT = 8000;

/**
 * 执行单类审计
 * @param {number} novelId
 * @param {number} chapterId
 * @param {'full'|'continuity'|'character'|'plot'|'mode_fit'} scope
 * @param {object} [options]
 * @returns {Promise<{overallScore: number, summary: string, issues: Array, dimensions?: object}>}
 */
export async function auditChapter(novelId, chapterId, scope, options = {}) {
  const novel = getProject(novelId);
  if (!novel) throw new Error(`小说项目不存在: ${novelId}`);

  const chapter = getChapter(chapterId);
  if (!chapter) throw new Error(`章节不存在: ${chapterId}`);
  if (chapter.project_id !== novelId) throw new Error("章节不属于该项目");

  const content = (chapter.content || "").trim();
  if (!content) throw new Error("章节内容为空，无法审计");

  const config = getAuditConfig(scope);
  if (!config) throw new Error(`未知审计类型: ${scope}，有效值: ${getValidAuditTypes().join(", ")}`);

  const auditContent = content.length > CONTENT_AUDIT_LIMIT ? content.slice(0, CONTENT_AUDIT_LIMIT) : content;

  const contextBlock = buildReviewContext({
    novelId,
    chapterId,
    novelTitle: novel.title,
  });

  const prompt = buildAuditPrompt(scope, {
    novelTitle: novel.title,
    chapterTitle: chapter.title || `第${chapter.chapter_index}章`,
    content: auditContent,
    contextBlock,
  });

  const result = await callLLM({
    taskType: "chapter_audit",
    ...(options.provider ? { provider: options.provider } : {}),
    ...(options.model ? { model: options.model } : {}),
    temperature: 0.1,
    maxTokens: 4096,
    timeoutMs: 180000,
    forceJSON: true,
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ],
  });

  const { overallScore, summary, issues, dimensions } = validateAuditOutput(scope, result.content);

  // 保存审计报告
  const reportId = saveAuditReport(novelId, chapterId, scope, overallScore, summary, issues, dimensions);

  // 保存独立审计问题
  saveAuditIssues(novelId, chapterId, reportId, scope, issues);

  return {
    auditType: scope,
    overallScore,
    summary,
    issues,
    ...(dimensions ? { dimensions } : {}),
    reportId,
  };
}

/**
 * 执行完整审计（依次执行4类审计）
 * @returns {Promise<Array>}
 */
export async function runFullAudit(novelId, chapterId, options = {}) {
  const scopes = /** @type {const} */ (["continuity", "character", "plot", "mode_fit"]);
  const results = [];
  for (const scope of scopes) {
    const r = await auditChapter(novelId, chapterId, scope, options);
    results.push(r);
  }
  return results;
}

/**
 * 列出章节的所有审计报告
 */
export function listChapterAuditReports(novelId, chapterId) {
  const db = getDb();
  return db.prepare(
    "SELECT * FROM audit_report WHERE novel_id = ? AND chapter_id = ? ORDER BY created_at DESC"
  ).all(novelId, chapterId).map(parseReportRow);
}

/**
 * 列出小说的未解决审计问题
 */
export function listOpenAuditIssues(novelId, options = {}) {
  const db = getDb();
  const { chapterId, auditType } = options;
  let sql = "SELECT * FROM audit_issue WHERE novel_id = ? AND resolved = 0";
  const params = [novelId];
  if (chapterId) { sql += " AND chapter_id = ?"; params.push(chapterId); }
  if (auditType) { sql += " AND audit_type = ?"; params.push(auditType); }
  sql += " ORDER BY severity DESC, created_at DESC";
  return db.prepare(sql).all(...params).map(parseIssueRow);
}

/**
 * 批量解决审计问题
 */
export function resolveAuditIssues(novelId, issueIds) {
  const db = getDb();
  const ids = Array.isArray(issueIds) ? issueIds : [issueIds];
  const stmt = db.prepare("UPDATE audit_issue SET resolved = 1 WHERE id = ? AND novel_id = ?");
  let count = 0;
  const run = db.transaction(() => {
    for (const id of ids) {
      const r = stmt.run(Number(id), Number(novelId));
      count += r.changes;
    }
  });
  run();
  return { resolvedCount: count };
}

// ---- 内部方法 ----

function saveAuditReport(novelId, chapterId, auditType, overallScore, summary, issues, dimensions) {
  const db = getDb();
  const issuesJson = JSON.stringify(issues);
  const dimensionsJson = dimensions ? JSON.stringify(dimensions) : null;

  const existing = db.prepare(
    "SELECT id FROM audit_report WHERE novel_id = ? AND chapter_id = ? AND audit_type = ?"
  ).get(novelId, chapterId, auditType);

  if (existing) {
    db.prepare(
      "UPDATE audit_report SET overall_score=?, summary=?, issues=?, created_at=CURRENT_TIMESTAMP WHERE id=?"
    ).run(overallScore, summary, issuesJson, existing.id);
    return existing.id;
  } else {
    const r = db.prepare(
      "INSERT INTO audit_report (novel_id, chapter_id, audit_type, overall_score, summary, issues) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(novelId, chapterId, auditType, overallScore, summary, issuesJson);
    return Number(r.lastInsertRowid);
  }
}

function saveAuditIssues(novelId, chapterId, reportId, auditType, issues) {
  const db = getDb();
  const stmt = db.prepare(
    "INSERT INTO audit_issue (novel_id, chapter_id, audit_report_id, audit_type, severity, code, evidence, fix_suggestion) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  db.transaction(() => {
    for (const issue of issues) {
      stmt.run(
        novelId, chapterId, reportId, auditType,
        issue.severity || "medium",
        issue.code || "",
        issue.evidence || issue.description || "",
        issue.fixSuggestion || "",
      );
    }
  })();
}

function parseReportRow(r) {
  let issues = [];
  try { issues = JSON.parse(r.issues || "[]"); } catch { /* ignore */ }
  return { ...r, issues };
}

function parseIssueRow(r) {
  return {
    ...r,
    resolved: r.resolved !== 0,
  };
}
