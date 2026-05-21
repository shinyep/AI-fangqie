/**
 * 修复服务 — SSE 流式修复 + 修复结果管理
 */
import { getDb } from "../models/database.js";
import { getProject } from "./bookProjectService.js";
import { getChapter, updateChapter } from "./chapterService.js";
import { callLLM } from "./llm/factory.js";
import { buildChapterRepairPrompt } from "../prompts/reviewPrompts.js";
import { buildReviewContext } from "./contextService.js";
import { reviewChapter } from "./novelReviewService.js";

const CONTENT_REPAIR_LIMIT = 12000;

/**
 * 创建 SSE 修复流
 * 返回一个异步生成器，逐块产出修复内容
 *
 * @param {number} novelId
 * @param {number} chapterId
 * @param {object} [options]
 * @param {string} [options.mode] - 'light' (轻量补丁) | 'heavy' (整章重写) ，默认 'light'
 * @param {string} [options.modeHint] - 修复方向提示
 * @param {Array} [options.issues] - 审稿/审计发现的问题列表
 * @param {string} [options.provider]
 * @param {string} [options.model]
 * @returns {Promise<{stream: AsyncGenerator, novelId: number, chapterId: number}>}
 */
export async function createRepairStream(novelId, chapterId, options = {}) {
  const novel = getProject(novelId);
  if (!novel) throw new Error(`小说项目不存在: ${novelId}`);

  const chapter = getChapter(chapterId);
  if (!chapter) throw new Error(`章节不存在: ${chapterId}`);
  if (chapter.project_id !== novelId) throw new Error("章节不属于该项目");

  const content = (chapter.content || "").trim();
  if (!content) throw new Error("章节内容为空，无法修复");

  const { mode = "light", modeHint, issues, provider, model } = options;
  const repairContent = content.length > CONTENT_REPAIR_LIMIT ? content.slice(0, CONTENT_REPAIR_LIMIT) : content;

  const contextBlock = buildReviewContext({ novelId, chapterId, novelTitle: novel.title });

  // 构建问题清单
  let issuesJson = "";
  if (issues && issues.length > 0) {
    issuesJson = JSON.stringify(issues, null, 2);
  } else {
    // 尝试从最新审稿报告中获取问题
    const latestReport = getLatestQualityReport(novelId, chapterId);
    if (latestReport) {
      issuesJson = JSON.stringify(latestReport.issues, null, 2);
    }
  }

  const prompt = buildChapterRepairPrompt({
    novelTitle: novel.title,
    chapterTitle: chapter.title || `第${chapter.chapter_index}章`,
    chapterContent: repairContent,
    issuesJson: issuesJson || "使用默认审稿维度检查并修复章节问题",
    modeHint: modeHint || (mode === "heavy" ? "深入修复，可调整结构和节奏" : "轻量修复，仅修正关键问题"),
    contextBlock,
  });

  const llmOptions = {
    taskType: "chapter_repair",
    ...(provider ? { provider } : {}),
    ...(model ? { model } : {}),
    temperature: 0.3,
    maxTokens: Math.max(repairContent.length * 2, 4096),
    timeoutMs: 300000,
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ],
  };

  // 轻量模式使用非流式（更稳定），重度模式使用流式
  const stream = mode === "heavy"
    ? createStreamingGenerator(llmOptions, novelId, chapterId, repairContent)
    : createNonStreamingGenerator(llmOptions, novelId, chapterId, repairContent);

  return { stream, novelId, chapterId };
}

/**
 * 非流式生成器（轻量修复）
 */
async function* createNonStreamingGenerator(llmOptions, novelId, chapterId, originalContent) {
  yield { type: "status", status: "started", mode: "light" };

  try {
    const result = await callLLM(llmOptions);
    const repairedContent = result.content || "";

    if (repairedContent.trim()) {
      // 保存修复结果
      saveRepairHistory(novelId, chapterId, originalContent, repairedContent, "light");
      yield { type: "status", status: "succeeded", repairedContent };
    } else {
      yield { type: "status", status: "failed", message: "LLM 返回空内容" };
    }
  } catch (err) {
    yield { type: "status", status: "failed", message: err.message };
  }

  yield { type: "done" };
}

/**
 * 流式生成器（重度修复 - SSE）
 */
async function* createStreamingGenerator(llmOptions, novelId, chapterId, originalContent) {
  yield { type: "status", status: "started", mode: "heavy" };

  let fullContent = "";
  try {
    // 流式 LLM 调用
    const result = await callLLM({ ...llmOptions, stream: false }); // 暂用非流式
    fullContent = result.content || "";

    if (fullContent.trim()) {
      saveRepairHistory(novelId, chapterId, originalContent, fullContent, "heavy");
      yield { type: "status", status: "succeeded", repairedContent: fullContent };
    } else {
      yield { type: "status", status: "failed", message: "LLM 返回空内容" };
    }
  } catch (err) {
    yield { type: "status", status: "failed", message: err.message };
  }

  yield { type: "done" };
}

/**
 * 保存修复记录
 */
function saveRepairHistory(novelId, chapterId, originalContent, repairedContent, mode) {
  const db = getDb();
  try {
    const history = db.prepare(
      "SELECT repair_history FROM book_chapter WHERE id = ?"
    ).get(chapterId);
    let entries = [];
    try { entries = JSON.parse(history?.repair_history || "[]"); } catch { /* ignore */ }
    entries.push({
      mode,
      originalLength: originalContent.length,
      repairedLength: repairedContent.length,
      timestamp: new Date().toISOString(),
    });
    // 只保留最近10条
    if (entries.length > 10) entries = entries.slice(-10);
    db.prepare("UPDATE book_chapter SET repair_history = ? WHERE id = ?")
      .run(JSON.stringify(entries), chapterId);
  } catch { /* repair_history 列可能不存在 */ }
}

/**
 * 获取最新的质量报告问题
 */
function getLatestQualityReport(novelId, chapterId) {
  const db = getDb();
  const row = db.prepare(
    "SELECT issues FROM quality_report WHERE novel_id = ? AND chapter_id = ? ORDER BY created_at DESC LIMIT 1"
  ).get(novelId, chapterId);
  if (!row) return null;
  try {
    const issues = JSON.parse(row.issues || "[]");
    return { issues };
  } catch {
    return null;
  }
}

/**
 * 完成修复：保存修复后的内容，自动重新审校
 * @param {number} novelId
 * @param {number} chapterId
 * @param {string} repairedContent
 * @param {object} [options]
 * @returns {Promise<{saved: boolean, reReviewed?: object}>}
 */
export async function finalizeRepairResult(novelId, chapterId, repairedContent, options = {}) {
  if (!repairedContent?.trim()) throw new Error("修复内容不能为空");

  // 保存修复后的内容（创建新版本或覆盖）
  const chapter = getChapter(chapterId);
  if (!chapter) throw new Error("章节不存在");

  updateChapter(chapterId, {
    content: repairedContent,
    word_count: repairedContent.length,
  });

  try {
    const db = getDb();
    db.prepare("UPDATE book_chapter SET generation_state = ? WHERE id = ?")
      .run("repaired", chapterId);
  } catch { /* ignore */ }

  // 自动重新审校
  let reReviewed = null;
  if (options.autoReview !== false) {
    try {
      reReviewed = await reviewChapter(novelId, chapterId, {
        provider: options.provider,
        model: options.model,
      });
    } catch (err) {
      reReviewed = { error: err.message };
    }
  }

  return { saved: true, reReviewed };
}
