/**
 * 审稿路由 — 移植自 AI-Novel-Writing-Assistant novelReviewRoutes.ts
 *
 * 提供审稿、审计、修复三类端点。
 */
import { Router } from "express";
import { reviewChapter, getQualityReport } from "../services/novelReviewService.js";
import { auditChapter, runFullAudit, listChapterAuditReports, listOpenAuditIssues, resolveAuditIssues } from "../services/auditService.js";
import { createRepairStream, finalizeRepairResult } from "../services/repairService.js";

const router = Router();

// ====== 审稿 ======

/**
 * POST /api/v1/novel-review/:novelId/chapters/:chapterId/review
 * 执行章节审稿，返回结构化评分和问题列表
 */
router.post("/novel-review/:novelId/chapters/:chapterId/review", async (req, res) => {
  try {
    const { novelId, chapterId } = req.params;
    const result = await reviewChapter(novelId, chapterId, {
      provider: req.body.provider,
      model: req.body.model,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/v1/novel-review/:novelId/quality-report
 * 获取小说的聚合质量报告
 */
router.get("/novel-review/:novelId/quality-report", async (req, res) => {
  try {
    const result = getQualityReport(req.params.novelId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ====== 审计 ======

/**
 * POST /api/v1/novel-review/:novelId/chapters/:chapterId/audit/:scope
 * 执行指定类型的审计（full/continuity/character/plot/mode_fit）
 */
router.post("/novel-review/:novelId/chapters/:chapterId/audit/:scope", async (req, res) => {
  try {
    const { novelId, chapterId, scope } = req.params;
    const options = {
      provider: req.body.provider,
      model: req.body.model,
    };

    let result;
    if (scope === "full_all") {
      result = await runFullAudit(Number(novelId), Number(chapterId), options);
    } else {
      result = await auditChapter(Number(novelId), Number(chapterId), scope, options);
    }
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/v1/novel-review/:novelId/chapters/:chapterId/audit-reports
 * 获取章节的所有审计报告
 */
router.get("/novel-review/:novelId/chapters/:chapterId/audit-reports", async (req, res) => {
  try {
    const { novelId, chapterId } = req.params;
    const result = listChapterAuditReports(Number(novelId), Number(chapterId));
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/v1/novel-review/:novelId/audit-issues
 * 获取小说的未解决审计问题（可选 ?chapterId= & auditType= 过滤）
 */
router.get("/novel-review/:novelId/audit-issues", async (req, res) => {
  try {
    const { novelId } = req.params;
    const options = {};
    if (req.query.chapterId) options.chapterId = Number(req.query.chapterId);
    if (req.query.auditType) options.auditType = req.query.auditType;
    const result = listOpenAuditIssues(Number(novelId), options);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/v1/novel-review/:novelId/audit-issues/resolve
 * 批量解决审计问题
 * Body: { issueIds: number[] }
 */
router.post("/novel-review/:novelId/audit-issues/resolve", async (req, res) => {
  try {
    const { novelId } = req.params;
    const { issueIds } = req.body;
    if (!Array.isArray(issueIds) || issueIds.length === 0) {
      return res.status(400).json({ success: false, message: "issueIds 必须是非空数组" });
    }
    const result = resolveAuditIssues(Number(novelId), issueIds);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ====== 修复 ======

/**
 * POST /api/v1/novel-review/:novelId/chapters/:chapterId/repair
 * 执行章节修复（SSE 流），支持轻量修复和重度修复
 * Body: { mode?: 'light'|'heavy', modeHint?: string, issues?: Array, autoReview?: boolean }
 */
router.post("/novel-review/:novelId/chapters/:chapterId/repair", async (req, res) => {
  const { novelId, chapterId } = req.params;

  try {
    const { stream: resultStream } = await createRepairStream(
      Number(novelId),
      Number(chapterId),
      {
        mode: req.body.mode || "light",
        modeHint: req.body.modeHint,
        issues: req.body.issues,
        provider: req.body.provider,
        model: req.body.model,
      },
    );

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    let repairedContent = "";

    for await (const chunk of resultStream) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);

      if (chunk.type === "status" && chunk.status === "succeeded" && chunk.repairedContent) {
        repairedContent = chunk.repairedContent;
      }
    }

    // 自动修复完成后，如果请求要求保存结果
    if (repairedContent && req.body.autoApply !== false) {
      const finalResult = await finalizeRepairResult(
        Number(novelId),
        Number(chapterId),
        repairedContent,
        { autoReview: req.body.autoReview !== false },
      );
      res.write(`data: ${JSON.stringify({ type: "finalize", result: finalResult })}\n\n`);
    }

    res.end();
  } catch (err) {
    // SSE 模式下不能返回 JSON 错误，用 SSE 事件
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`);
      res.end();
    } else {
      res.status(400).json({ success: false, message: err.message });
    }
  }
});

/**
 * POST /api/v1/novel-review/:novelId/chapters/:chapterId/repair/apply
 * 应用修复结果并自动重审（非 SSE，直接调用）
 * Body: { content: string, provider?, model? }
 */
router.post("/novel-review/:novelId/chapters/:chapterId/repair/apply", async (req, res) => {
  try {
    const { novelId, chapterId } = req.params;
    const { content } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ success: false, message: "内容不能为空" });
    }
    const result = await finalizeRepairResult(
      Number(novelId),
      Number(chapterId),
      content,
      {
        autoReview: req.body.autoReview !== false,
        provider: req.body.provider,
        model: req.body.model,
      },
    );
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
