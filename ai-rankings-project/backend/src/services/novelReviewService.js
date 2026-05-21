/**
 * 审稿核心服务 — 移植自 AI-Novel-Writing-Assistant NovelCoreReviewService
 *
 * 提供章节审稿、质量报告聚合功能。
 * 审计和修复功能拆分到 auditService.js / repairService.js。
 */
import { getDb } from "../models/database.js";
import { getProject } from "./bookProjectService.js";
import { getChapter, updateChapter } from "./chapterService.js";
import { callLLM } from "./llm/factory.js";
import { buildChapterReviewPrompt, validateReviewOutput } from "../prompts/reviewPrompts.js";
import { buildReviewContext } from "./contextService.js";

const CONTENT_REVIEW_LIMIT = 8000; // 审稿时正文最大长度

/**
 * 审稿主入口：对章节进行 AI 质量评估
 * @param {number|string} novelId
 * @param {number|string} chapterId
 * @param {object} [options]
 * @param {string} [options.provider]
 * @param {string} [options.model]
 * @returns {Promise<{score: object, issues: Array}>}
 */
export async function reviewChapter(novelId, chapterId, options = {}) {
  const novel = getProject(Number(novelId));
  if (!novel) throw new Error(`小说项目不存在: ${novelId}`);

  const chapter = getChapter(Number(chapterId));
  if (!chapter) throw new Error(`章节不存在: ${chapterId}`);
  if (chapter.project_id !== Number(novelId)) throw new Error("章节不属于该项目");

  const content = (chapter.content || "").trim();
  if (!content) throw new Error("章节内容为空，无法审稿");

  // 截断过长内容
  const reviewContent = content.length > CONTENT_REVIEW_LIMIT
    ? content.slice(0, CONTENT_REVIEW_LIMIT)
    : content;

  // 组装审稿上下文
  const contextBlock = buildReviewContext({
    novelId: Number(novelId),
    chapterId: Number(chapterId),
    novelTitle: novel.title,
  });

  // 构建提示词
  const prompt = buildChapterReviewPrompt({
    novelTitle: novel.title,
    chapterTitle: chapter.title || `第${chapter.chapter_index}章`,
    content: reviewContent,
    contextBlock,
  });

  // 调用 LLM（审稿用低温度）
  const result = await callLLM({
    taskType: "chapter_review",
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

  // 解析结构化输出
  const { score, issues } = validateReviewOutput(result.content);

  // 保存质量报告
  saveQualityReport(novel.id, chapter.id, score, issues);

  // 更新章节状态
  updateChapter(chapter.id, { ai_model: result.model || "" });
  try {
    const db = getDb();
    db.prepare("UPDATE book_chapter SET generation_state = ? WHERE id = ?")
      .run("reviewed", chapter.id);
  } catch { /* generation_state 列可能尚不存在 */ }

  // 质量循环：评估下一步建议
  const recommendation = getQualityLoopRecommendation(score, issues, novel.id);

  return { score, issues, model: result.model, recommendation };
}

/**
 * 获取小说的聚合质量报告
 * @param {number|string} novelId
 * @returns {{ summary: object|null, chapters: Array }}
 */
export function getQualityReport(novelId) {
  const db = getDb();
  const reports = db.prepare(
    "SELECT qr.*, bc.title as chapter_title, bc.chapter_index FROM quality_report qr INNER JOIN book_chapter bc ON bc.id = qr.chapter_id WHERE qr.novel_id = ? ORDER BY qr.created_at DESC"
  ).all(Number(novelId));

  if (reports.length === 0) return { summary: null, chapters: [] };

  // 聚合各维度平均分
  const dims = ["coherence", "repetition", "pacing", "voice", "engagement", "overall"];
  const totals = {};
  for (const dim of dims) totals[dim] = 0;

  for (const r of reports) {
    for (const dim of dims) totals[dim] += (r[dim] || 0);
  }

  const summary = {};
  for (const dim of dims) summary[dim] = Math.round(totals[dim] / reports.length);

  return {
    summary,
    totalChapters: reports.length,
    chapters: reports.map((r) => {
      let issues = [];
      try { issues = JSON.parse(r.issues || "[]"); } catch { /* ignore */ }
      return {
        chapterId: r.chapter_id,
        chapterTitle: r.chapter_title,
        chapterIndex: r.chapter_index,
        score: {
          coherence: r.coherence,
          repetition: r.repetition,
          pacing: r.pacing,
          voice: r.voice,
          engagement: r.engagement,
          overall: r.overall,
        },
        issues,
        createdAt: r.created_at,
      };
    }),
  };
}

// ---- 质量循环 ----

/**
 * 简化版质量循环：根据评分和问题严重程度推荐下一步操作
 * @returns {{ action: string, reason: string, budgetExceeded: boolean }}
 */
function getQualityLoopRecommendation(score, issues, novelId) {
  const { overall, coherence, engagement } = score;
  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const highCount = issues.filter((i) => i.severity === "high").length;

  // 检查修复预算
  const budgetExceeded = isRepairBudgetExceeded(novelId);

  // 高质量：继续
  if (overall >= 80 && criticalCount === 0 && highCount <= 1) {
    return { action: "continue", reason: "章节质量良好，可继续下一章", budgetExceeded };
  }

  // 中质量：建议轻量修复
  if (overall >= 60 && criticalCount === 0) {
    if (budgetExceeded) {
      return { action: "manual_gate", reason: "修复次数已超标，建议人工审核", budgetExceeded: true };
    }
    return { action: "patch_repair", reason: "存在一些需要修正的问题，建议轻量修复", budgetExceeded };
  }

  // 低质量或有严重问题：建议重度修复
  if (budgetExceeded) {
    return { action: "manual_gate", reason: "章节质量较低但修复次数已超标，建议人工介入", budgetExceeded: true };
  }

  if (coherence < 50 || criticalCount > 0) {
    return { action: "rewrite_chapter", reason: "连贯性或严重问题较多，建议重点修整", budgetExceeded };
  }

  if (engagement < 40) {
    return { action: "rewrite_chapter", reason: "追读感过低，需要加强结尾钩子和冲突推进", budgetExceeded };
  }

  return { action: "patch_repair", reason: "综合评分偏低，建议针对性修复", budgetExceeded };
}

/**
 * 检查章节修复预算是否超标（同一小说最多5次修复）
 */
function isRepairBudgetExceeded(novelId) {
  try {
    const db = getDb();
    const chapters = db.prepare(
      "SELECT repair_history FROM book_chapter WHERE project_id = ?"
    ).all(novelId);
    let totalRepairs = 0;
    for (const ch of chapters) {
      try {
        const history = JSON.parse(ch.repair_history || "[]");
        totalRepairs += history.length;
      } catch { /* ignore */ }
    }
    return totalRepairs >= 5;
  } catch {
    return false;
  }
}

// ---- 内部方法 ----

/**
 * 保存质量报告到数据库
 */
function saveQualityReport(novelId, chapterId, score, issues) {
  const db = getDb();
  // 每个章节只保留最新一份报告（可选：改为 INSERT 保留历史）
  const existing = db.prepare(
    "SELECT id FROM quality_report WHERE novel_id = ? AND chapter_id = ?"
  ).get(novelId, chapterId);

  if (existing) {
    db.prepare(
      `UPDATE quality_report SET coherence=?, repetition=?, pacing=?, voice=?, engagement=?, overall=?, issues=?, created_at=CURRENT_TIMESTAMP WHERE id=?`
    ).run(score.coherence, score.repetition, score.pacing, score.voice, score.engagement, score.overall, JSON.stringify(issues), existing.id);
  } else {
    db.prepare(
      `INSERT INTO quality_report (novel_id, chapter_id, coherence, repetition, pacing, voice, engagement, overall, issues) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(novelId, chapterId, score.coherence, score.repetition, score.pacing, score.voice, score.engagement, score.overall, JSON.stringify(issues));
  }
}
