/**
 * 统一的写作上下文组装器
 *
 * 参考 51码字 bookWritingContext.js 的"章纲驱动 + 设定过滤 + 上一章风格参考"策略，
 * 以及 InkOS 的章节概要链传递思路。
 *
 * 按优先级分层组装上下文块，总预算 12000 字符，超出按优先级截断。
 */

import { getDb } from "../models/database.js";

const CONTEXT_BUDGET = 12000;
const PREV_CHAPTER_TAIL = 2800; // 上一章末尾截取字数，参考51码字

// 上下文块优先级（数值越小优先级越高）
const BLOCK_PRIORITY = {
  styleProfile: 1,       // 风格描述
  characters: 2,         // 角色设定
  bookOutline: 3,        // 全书细纲
  chapterOutlines: 4,    // 前文章节概要链
  currentContext: 5,     // 当前章前文（续写模式专用，直接放在最前面）
  previousChapterEnd: 6, // 上一章末尾风格参考
  linkedContent: 7,      // 用户手动关联的章节
};

/**
 * 组装续写上下文
 * 续写时：前文正文占最高优先级，然后拼接其他上下文块
 */
export function buildContinueContext(options = {}) {
  const {
    context = '',              // 当前章节前文
    previousChapterEnd = '',   // 上一章末尾
    chapterOutlines = [],      // [{title, summary}] 前文章节概要
    characters = [],           // 角色数组
    style = '',                // 风格描述
    styleProfile = '',         // 风格详细设定
    bookOutline = '',          // 全书细纲
    linkedContent = '',        // 关联章节内容
    maxBudget = CONTEXT_BUDGET,
  } = options;

  // 前文正文优先
  const contextTrimmed = context.length > 4000 ? context.slice(-4000) : context;
  const ctxBlock = `【前文正文】\n${contextTrimmed}`;

  let budgetLeft = maxBudget - ctxBlock.length;
  if (budgetLeft < 0) budgetLeft = 0;

  // 组装其余上下文块
  const extraBlocks = assembleBlocks({
    style,
    styleProfile,
    characters,
    bookOutline,
    chapterOutlines,
    previousChapterEnd,
    linkedContent,
    maxBudget: budgetLeft,
  });

  return [ctxBlock, extraBlocks].filter(Boolean).join('\n\n');
}

/**
 * 组装生成上下文
 * 生成时：没有当前章前文，以风格+角色+细纲为主
 */
export function buildGenerateContext(options = {}) {
  const {
    style = '',
    styleProfile = '',
    characters = [],
    bookOutline = '',
    chapterOutlines = [],
    previousChapterEnd = '',
    linkedContent = '',
    maxBudget = CONTEXT_BUDGET,
  } = options;

  return assembleBlocks({
    style,
    styleProfile,
    characters,
    bookOutline,
    chapterOutlines,
    previousChapterEnd,
    linkedContent,
    maxBudget,
  });
}

/**
 * 内部：按优先级组装上下文块并在预算内截断
 */
function assembleBlocks(options) {
  const {
    style = '',
    styleProfile = '',
    characters = [],
    bookOutline = '',
    chapterOutlines = [],
    previousChapterEnd = '',
    linkedContent = '',
    maxBudget = CONTEXT_BUDGET,
  } = options;

  const blocks = [];

  // 1. 风格信息
  const styleBlock = buildStyleBlock(style, styleProfile);
  if (styleBlock) {
    blocks.push({ id: 'styleProfile', priority: BLOCK_PRIORITY.styleProfile, text: styleBlock });
  }

  // 2. 角色设定
  const charBlock = buildCharacterBlock(characters);
  if (charBlock) {
    blocks.push({ id: 'characters', priority: BLOCK_PRIORITY.characters, text: `【角色设定】\n${charBlock}` });
  }

  // 3. 全书细纲
  if (bookOutline?.trim()) {
    blocks.push({
      id: 'bookOutline',
      priority: BLOCK_PRIORITY.bookOutline,
      text: `【全书细纲】\n${bookOutline.trim()}`,
    });
  }

  // 4. 前文章节概要链（参考 InkOS chapter_summaries.md）
  const summaryChain = buildChapterSummaryChain(chapterOutlines);
  if (summaryChain) {
    blocks.push({
      id: 'chapterOutlines',
      priority: BLOCK_PRIORITY.chapterOutlines,
      text: `【前文章节概要】\n${summaryChain}`,
    });
  }

  // 5. 上一章末尾风格参考（参考51码字）
  if (previousChapterEnd?.trim()) {
    const excerpt = previousChapterEnd.length > PREV_CHAPTER_TAIL
      ? '...' + previousChapterEnd.slice(-PREV_CHAPTER_TAIL)
      : previousChapterEnd;
    blocks.push({
      id: 'previousChapterEnd',
      priority: BLOCK_PRIORITY.previousChapterEnd,
      text: `【上一章末尾参考（用于风格衔接）】\n${excerpt}`,
    });
  }

  // 6. 用户手动关联的章节
  if (linkedContent?.trim()) {
    blocks.push({
      id: 'linkedContent',
      priority: BLOCK_PRIORITY.linkedContent,
      text: `【关联章节参考】\n${linkedContent.trim().slice(0, 6000)}`,
    });
  }

  // 按优先级排序，在预算内截断
  blocks.sort((a, b) => a.priority - b.priority);

  const result = [];
  let used = 0;

  for (const block of blocks) {
    const remaining = maxBudget - used;
    if (remaining <= 80) break; // 剩余空间不足以容纳有意义的块

    if (block.text.length <= remaining) {
      result.push(block.text);
      used += block.text.length;
    } else {
      // 截断并标记
      const trimmed = block.text.slice(0, remaining - 20) + '\n...(已达到上下文上限)';
      result.push(trimmed);
      used += trimmed.length;
      break;
    }
  }

  return result.join('\n\n');
}

/**
 * 构建风格描述块
 */
function buildStyleBlock(style, styleProfile) {
  const parts = [];
  if (style?.trim()) parts.push(`写作风格：${style.trim()}`);
  if (styleProfile?.trim()) parts.push(`风格详细要求：${styleProfile.trim()}`);
  return parts.join('\n');
}

/**
 * 构建角色设定块
 */
function buildCharacterBlock(characters) {
  if (!characters || characters.length === 0) return '';
  return characters
    .map((c, i) => {
      const info = [c.gender, c.age, c.personality, c.background, c.abilities]
        .filter(Boolean)
        .join('，');
      return `${i + 1}. ${c.name || '角色' + (i + 1)}：${info || '待定'}`;
    })
    .join('\n');
}

/**
 * 构建前文章节概要链
 */
function buildChapterSummaryChain(chapterOutlines) {
  if (!chapterOutlines || chapterOutlines.length === 0) return '';
  return chapterOutlines
    .map((o, i) => `${i + 1}. ${o.title}：${o.summary}`)
    .join('\n');
}

/**
 * 组装审稿专用上下文
 * 与续写/生成上下文不同，审稿更侧重前后章节的连贯性参考
 */
export function buildReviewContext({ novelId, chapterId, novelTitle } = {}) {
  const db = getDb();

  const blocks = [];

  // 当前章的前后章节概要
  if (novelId && chapterId) {
    const prevChapters = db.prepare(
      "SELECT chapter_index, title, summary FROM book_chapter WHERE project_id = ? AND id < ? ORDER BY chapter_index DESC LIMIT 2"
    ).all(novelId, chapterId);
    if (prevChapters.length) {
      const lines = prevChapters.reverse().map(
        (c) => `第${c.chapter_index}章 ${c.title || ""}：${(c.summary || "").slice(0, 200)}`
      );
      blocks.push(`【前文章节概要】\n${lines.join("\n")}`);
    }

    const nextChapter = db.prepare(
      "SELECT chapter_index, title, summary FROM book_chapter WHERE project_id = ? AND id > ? ORDER BY chapter_index ASC LIMIT 1"
    ).get(novelId, chapterId);
    if (nextChapter) {
      blocks.push(`【后续章节】第${nextChapter.chapter_index}章 ${nextChapter.title || ""}`);
    }
  }

  // 作品设定
  if (novelId) {
    const novel = db.prepare("SELECT outline, description FROM book_project WHERE id = ?").get(novelId);
    if (novel) {
      if (novel.outline?.trim()) {
        blocks.push(`【全书大纲/设定】\n${novel.outline.trim().slice(0, 1000)}`);
      }
      if (novel.description?.trim()) {
        blocks.push(`【作品简介】\n${novel.description.trim().slice(0, 500)}`);
      }
    }

    // 角色卡片
    const characters = db.prepare(
      "SELECT name, gender, personality, background FROM character_card WHERE novel_id = ? LIMIT 8"
    ).all(novelId);
    if (characters.length) {
      const charLines = characters.map(
        (c) => `${c.name || "?"}（${[c.gender, c.personality, c.background].filter(Boolean).join("，") || "无详细信息"}）`
      );
      blocks.push(`【角色设定参考】\n${charLines.join("\n")}`);
    }
  }

  const result = blocks.join("\n\n");
  // 审稿上下文预算 ~4000 字符
  return result.length > 4000 ? result.slice(0, 4000) + "\n...(上下文已截断)" : result;
}

/**
 * 估算文本的 token 数（粗略：中文约 1.5 字符/token）
 */
export function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 1.5);
}
