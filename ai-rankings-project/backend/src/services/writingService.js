import { callLLM } from "./llm/factory.js";
import { buildContinueContext, buildGenerateContext } from "./contextService.js";

import { appendFileSync } from "fs";
import { join } from "path";

const DEBUG_LOG_PATH = join(process.cwd(), "writing-debug.log");

function debugLog(message, meta = {}) {
  const line = `[${new Date().toISOString()}] ${message} ${JSON.stringify(meta)}\n`;
  console.log(`[WRITING-DEBUG] ${message}`, meta);
  try {
    appendFileSync(DEBUG_LOG_PATH, line, "utf8");
  } catch (error) {
    console.error("[WRITING-DEBUG] 写入日志失败:", error.message);
  }
}

// --- Prompt 模板 ---

const WRITING_STYLES = {
  仙侠: "古典仙侠风格，文笔凝练有古韵，注重意境营造和道法描写，节奏张弛有度",
  都市: "现代都市风格，语言简练直接，注重人物心理和现实感，节奏明快",
  科幻: "硬科幻风格，逻辑严谨设定硬核，注重科技细节和世界观构建",
  玄幻: "东方玄幻风格，想象力丰富宏大，注重修炼体系和世界观层次",
  历史: "历史架空风格，语言偏文言但不晦涩，注重历史氛围和权谋博弈",
  悬疑: "悬疑惊悚风格，氛围营造细腻，注重伏笔编排和反转设计",
  游戏: "游戏竞技风格，节奏紧凑热血，注重战术细节和竞技场面",
  轻小说: "轻小说风格，语气轻松活泼，注重对话和角色互动",
  言情: "现代言情风格，情感表达细腻，注重人物关系和心理变化",
  末日: "末日废土风格，氛围压抑中带着希望，注重生存压力和人性探讨",
  武侠: "传统武侠风格，招式描写利落，注重江湖义气和人物成长",
  脑洞: "创意脑洞风格，设定新颖出奇，注重概念创新和反差冲突",
};

const GENERATE_TEXT_PROMPT = `你是一位资深网络小说作家，擅长多种风格创作。请根据以下设定生成小说正文。

## 写作风格
{style}

## 目标字数
约{word_count}字

## 角色信息
{characters}

## 输出要求
1. 直接输出小说正文，不写标题、不写"第X章"
2. 段落分明，适当使用对话推动剧情
3. 在末尾留下悬念或期待点
4. 保持风格一致，语言流畅自然
5. 字数控制在目标字数±20%范围内`;

const TOOL_GENERATE_PROMPT = `你是一位资深网络小说创作助手。请严格按照"当前工具"的功能产出内容，不要套用通用正文生成模板。

## 当前工具
{tool_instruction}

## 写作风格
{style}

## 目标篇幅
约{word_count}字，可根据工具需要合理浮动

## 角色信息
{characters}

## 输出要求
1. 优先遵守当前工具的任务边界和输出格式
2. 内容要贴合用户输入的剧情、设定或文本
3. 不输出与工具无关的套话
4. 结构清晰，可直接用于写作工作台`;

const CONTINUE_TEXT_PROMPT = `你是一位资深网络小说作家。请根据前文内容无缝续写小说。

## 写作风格
{style}

## 续写字数
约{word_count}字

## 已有角色信息
{characters}

## 前文内容
---
{context}
---

## 输出要求
1. 直接输出续写正文，不写标题
2. 保持与前文一致的风格、人设和叙事视角
3. 剧情发展自然，承接前文冲突和伏笔
4. 适当使用对话和描写
5. 在末尾留下悬念或钩子`;

const EXPAND_TEXT_PROMPT = `你是一位资深网络小说编辑和作家。请对以下文本进行{action}。

## 原文
---
{text}
---

## 当前字数
约{current_words}字

## {action_label}
{action_detail}

## 输出要求
1. 直接输出处理后的文本
2. {output_requirement}
3. 保持原文的风格一致
4. 不改变核心剧情走向`;

const TOOL_TEXT_PROCESS_PROMPT = `你是一位资深网络小说创作助手。请严格按照"当前工具"和"细分功能"处理文本，不要套用普通润色模板。

## 当前工具
{tool_instruction}

## 原文
---
{text}
---

## 当前字数
约{current_words}字

## 输出要求
1. 严格遵守当前工具和细分功能的任务边界
2. 需要改写时，保留原文核心剧情、人设、视角和信息
3. 需要审稿或分析时，不要把全文重写成润色稿
4. 输出结构清晰，可直接用于写作工作台`;

const CHAPTER_SUMMARY_PROMPT = `你是一位资深网文编辑，请根据章节正文生成章节概要。

## 输出要求
1. 用3-6条短句概括本章核心事件、人物行动、冲突变化、伏笔和结尾钩子
2. 只输出概要内容，不要写分析过程
3. 不要新增正文中没有的信息
4. 字数控制在200字以内`;

// --- 内部方法 ---

function buildCharSection(characters) {
  if (!characters || characters.length === 0) return "（无特殊角色设定，请自行设定合适的角色）";
  return characters
    .map(
      (c, i) =>
        `${i + 1}. ${c.name || "角色" + (i + 1)}：${[c.gender, c.age, c.personality, c.background, c.abilities].filter(Boolean).join("，") || "待定"}`
    )
    .join("\n");
}

function appendPromptContent(basePrompt, promptContent) {
  const extra = promptContent?.trim();
  if (!extra) return basePrompt;
  return `${basePrompt}\n\n## 选用提示词\n${extra}`;
}

// --- 公开 API ---

/**
 * AI写作：根据设定生成小说正文
 */
export async function generateText({ theme, style = "玄幻", wordCount = 800, characters = [], outline = "", promptContent = "", toolInstruction = "", linkedContent = "", provider, model, previousChapterExcerpt = "", chapterOutlines = [], styleProfile = "", bookOutline = "" }) {
  const styleDesc = WRITING_STYLES[style] || WRITING_STYLES["玄幻"];
  const charSection = buildCharSection(characters);
  const hasToolInstruction = Boolean(toolInstruction?.trim());

  // 用 contextService 组装结构化上下文（参考51码字的分层策略）
  const assembledContext = buildGenerateContext({
    style: styleDesc,
    styleProfile,
    characters,
    bookOutline: bookOutline || outline || "",
    chapterOutlines,
    previousChapterEnd: previousChapterExcerpt,
    linkedContent,
  });

  const userContent = [
    `## 创作主题/灵感\n${theme || "请根据风格自由创作一个精彩开篇"}`,
    assembledContext ? `## 上下文参考\n${assembledContext}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const result = await callLLM({
    taskType: "writing_generate",
    ...(provider ? { provider } : {}),
    ...(model ? { model } : {}),
    temperature: 0.9,
    maxTokens: Math.max(wordCount * 3, 2048),
    timeoutMs: 180000,
    messages: [
      {
        role: "system",
        content: appendPromptContent(
          (hasToolInstruction ? TOOL_GENERATE_PROMPT : GENERATE_TEXT_PROMPT)
            .replace("{tool_instruction}", toolInstruction.trim())
            .replace("{style}", styleDesc),
          promptContent
        )
          .replace("{word_count}", String(wordCount))
          .replace("{characters}", charSection),
      },
      { role: "user", content: userContent },
    ],
  });

  return { text: result.content };
}

/**
 * AI续写：根据前文接续写
 */
export async function continueText({ context, style = "玄幻", wordCount = 600, characters = [], promptContent = "", provider, model, previousChapterExcerpt = "", chapterOutlines = [], linkedContent = "", styleProfile = "", bookOutline = "" }) {
  if (!context?.trim()) throw new Error("前文内容不能为空");

  const styleDesc = WRITING_STYLES[style] || WRITING_STYLES["玄幻"];
  const charSection = buildCharSection(characters);

  // 用 contextService 组装结构化上下文
  // 包含：前文正文 + 上一章末尾参考 + 前文章节概要 + 角色设定 + 关联章节
  const assembledContext = buildContinueContext({
    context,
    previousChapterEnd: previousChapterExcerpt,
    chapterOutlines,
    characters,
    style: styleDesc,
    styleProfile,
    bookOutline,
    linkedContent,
  });

  const result = await callLLM({
    taskType: "writing_continue",
    ...(provider ? { provider } : {}),
    ...(model ? { model } : {}),
    temperature: 0.85,
    maxTokens: Math.max(wordCount * 3, 2048),
    timeoutMs: 180000,
    messages: [
      {
        role: "system",
        content: appendPromptContent(CONTINUE_TEXT_PROMPT.replace("{style}", styleDesc), promptContent)
          .replace("{word_count}", String(wordCount))
          .replace("{characters}", charSection)
          .replace("{context}", assembledContext),
      },
      { role: "user", content: "请根据前文内容续写，保持风格和剧情连贯。" },
    ],
  });

  return { text: result.content };
}

/**
 * AI扩写/润色/缩写
 */
export async function expandText({ text, action = "expand", style = "", promptContent = "", toolInstruction = "", requestId = "", provider, model }) {
  if (!text?.trim()) throw new Error("原文内容不能为空");

  const actionConfig = {
    expand: {
      action_label: "扩写要求",
      action_detail: "在保持原意的基础上，丰富细节描写、心理活动、环境烘托和对话延展，使内容更加饱满生动。字数扩展到原文的1.5-2倍。",
      output_requirement: "展开描写，增加细节但不偏离原意",
    },
    polish: {
      action_label: "润色要求",
      action_detail: "优化句式结构，提升文笔质量，增强画面感和代入感，修正语病和平淡表达。字数与原文基本持平。",
      output_requirement: "保持原有信息量，提升表达质量",
    },
    shorten: {
      action_label: "精炼要求",
      action_detail: "去除冗余描写，保留核心情节和关键对话，使表达更加简洁有力。字数压缩到原文的60-70%。",
      output_requirement: "精简表达，保留核心信息和情节",
    },
    title: {
      action_label: "起名要求",
      action_detail: "根据章节内容，提炼出简洁有力、吸引读者的章节标题（15字以内），需要抓住本章核心爽点或钩子。",
      output_requirement: "只输出章节标题，不输出任何其他内容",
    },
  };

  const cfg = actionConfig[action] || actionConfig.expand;
  const clippedText = text.length > 3000 ? text.slice(0, 3000) : text;
  const hasToolInstruction = Boolean(toolInstruction?.trim());
  const basePrompt = hasToolInstruction
    ? TOOL_TEXT_PROCESS_PROMPT
      .replace("{tool_instruction}", toolInstruction.trim())
      .replace("{text}", clippedText)
      .replace("{current_words}", String(text.length))
    : EXPAND_TEXT_PROMPT.replace("{action}", action === "polish" ? "润色优化" : action === "shorten" ? "精简提炼" : action === "title" ? "章节起名" : "扩写丰富")
      .replace("{text}", clippedText)
      .replace("{current_words}", String(text.length))
      .replace("{action_label}", cfg.action_label)
      .replace("{action_detail}", cfg.action_detail)
      .replace("{output_requirement}", cfg.output_requirement);

  const systemPrompt = [
    basePrompt,
    promptContent?.trim() ? `## 附加要求\n${promptContent.trim()}` : "",
  ].filter(Boolean).join("\n\n");

  debugLog("expandText prepared prompt", {
    requestId,
    action,
    style,
    textLength: text.length,
    promptContentLength: promptContent?.length || 0,
    toolInstructionLength: toolInstruction?.length || 0,
    systemPromptLength: systemPrompt.length,
    maxTokens: Math.max(text.length * 3, 2048),
  });

  const result = await callLLM({
    taskType: "writing_expand",
    ...(provider ? { provider } : {}),
    ...(model ? { model } : {}),
    temperature: 0.75,
    maxTokens: Math.max(text.length * 3, 2048),
    timeoutMs: 180000,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: hasToolInstruction ? "请根据当前工具和细分功能处理以上文本。" : `请对以上文本进行${action === "polish" ? "润色" : action === "shorten" ? "精炼" : action === "title" ? "章节起名" : "扩写"}处理。` },
    ],
  });

  debugLog("expandText finished", {
    requestId,
    action,
    resultLength: result.content.length,
    resultPreview: result.content.slice(0, 120),
  });
  return { text: result.content };
}

export async function summarizeChapter({ title = "", content = "", provider, model }) {
  if (!content?.trim()) throw new Error("章节正文不能为空");
  const clippedText = content.length > 8000 ? content.slice(0, 8000) : content;

  const result = await callLLM({
    taskType: "chapter_summary",
    ...(provider ? { provider } : {}),
    ...(model ? { model } : {}),
    temperature: 0.45,
    maxTokens: 1200,
    timeoutMs: 120000,
    messages: [
      { role: "system", content: CHAPTER_SUMMARY_PROMPT },
      { role: "user", content: `## 章节标题\n${title || "未命名章节"}\n\n## 章节正文\n${clippedText}` },
    ],
  });

  return { summary: result.content.trim() };
}

/**
 * 获取支持的写作风格列表
 */
export function getWritingStyles() {
  return Object.keys(WRITING_STYLES).map((name) => ({ name, description: WRITING_STYLES[name] }));
}

// --- 风格提取 ---

const STYLE_EXTRACTION_PROMPT = `你是一位专业的写作风格分析专家。请分析以下文本的写作风格特征，输出JSON格式。

## 分析维度
1. 整体风格定位：体裁、基调、读者群体
2. 句式特征：长短句比例、复杂度、偏好句式
3. 节奏与段落：段落长度特征、节奏快慢、断章习惯
4. 词汇特征：词汇丰富度、偏好词类、特色用语
5. 修辞手法：常用修辞方式
6. 可复现的写作公式：3-5条可操作的具体写作技巧
7. 应用建议：2-3条模仿此风格写作的实用建议

## 输出格式（严格遵守JSON）
{
  "styleName": "简短的风格名称（10字以内）",
  "styleContent": "完整的风格分析（Markdown格式，包含以上7个维度的详细描述）"
}`;

export async function extractStyle(text) {
  if (!text?.trim()) throw new Error("参考文本不能为空");
  const trimmed = text.slice(0, 4000);

  const result = await callLLM({
    taskType: "writing_extract_style",
    messages: [
      { role: "system", content: STYLE_EXTRACTION_PROMPT },
      { role: "user", content: `请分析以下文本的写作风格：\n\n${trimmed}` },
    ],
    forceJSON: true,
  });

  try {
    const parsed = JSON.parse(result.content);
    return { styleName: parsed.styleName || '提取的风格', styleContent: parsed.styleContent || result.content };
  } catch {
    return { styleName: '提取的风格', styleContent: result.content };
  }
}

// ========== V2: 多候选 + 意图解析 + 约束 ==========

const INTENT_PARSE_PROMPT = `你是一位资深的网文编辑。用户想对一段小说文本进行修改，请分析用户的修改意图，输出结构化JSON。

## 分析维度
1. editGoal: 一句话描述修改的核心目标
2. toneShift: 语气应如何调整（保持/更轻松/更严肃/更有张力等）
3. paceAdjustment: 节奏应如何调整（保持/加快/放慢）
4. conflictAdjustment: 冲突应如何调整（保持/强化/弱化）
5. emotionAdjustment: 情绪应如何调整（保持/增强/收敛）
6. mustPreserve: 必须保留的内容（数组，至少1条）
7. mustAvoid: 必须避免的问题（数组，至少1条）
8. strength: 修改力度（light/medium/strong）
9. reasoningSummary: 一句话说明你为什么这样理解

## 输出格式（严格遵守JSON，不要输出其他内容）
{
  "editGoal": "...",
  "toneShift": "...",
  "paceAdjustment": "...",
  "conflictAdjustment": "...",
  "emotionAdjustment": "...",
  "mustPreserve": ["..."],
  "mustAvoid": ["..."],
  "strength": "medium",
  "reasoningSummary": "..."
}`;

export async function parseUserIntent({ instruction, provider, model } = {}) {
  if (!instruction?.trim()) throw new Error('修改指令不能为空');

  const result = await callLLM({
    taskType: 'writing_intent_parse',
    ...(provider ? { provider } : {}),
    ...(model ? { model } : {}),
    temperature: 0.4,
    maxTokens: 1024,
    timeoutMs: 30000,
    messages: [
      { role: 'system', content: INTENT_PARSE_PROMPT },
      { role: 'user', content: `用户的修改指令：${instruction.trim()}` },
    ],
  });

  try {
    const parsed = JSON.parse(result.content);
    return {
      editGoal: parsed.editGoal || instruction,
      toneShift: parsed.toneShift || '保持',
      paceAdjustment: parsed.paceAdjustment || '保持',
      conflictAdjustment: parsed.conflictAdjustment || '保持',
      emotionAdjustment: parsed.emotionAdjustment || '保持',
      mustPreserve: parsed.mustPreserve || ['保留核心事实'],
      mustAvoid: parsed.mustAvoid || ['避免AI腔'],
      strength: parsed.strength || 'medium',
      reasoningSummary: parsed.reasoningSummary || '按用户要求执行修改',
    };
  } catch {
    return {
      editGoal: instruction.trim(),
      toneShift: '保持',
      paceAdjustment: '保持',
      conflictAdjustment: '保持',
      emotionAdjustment: '保持',
      mustPreserve: ['保留核心事实'],
      mustAvoid: ['避免AI腔'],
      strength: 'medium',
      reasoningSummary: '按用户要求执行修改',
    };
  }
}

const MULTI_CANDIDATE_PROMPT = `你是一位资深网络小说编辑和作家。请对以下文本进行修改，生成2-3个不同风格的候选版本。

## 修改意图
{intent_summary}

## 约束条件
{constraints}

## 原文
---
{text}
---

## 输出要求
1. 生成2-3个候选版本，每个版本有不同的侧重点
2. 严格遵守约束条件
3. 每个候选版本必须是完整的改写结果
4. 输出严格JSON格式

## 输出格式
{
  "candidates": [
    {
      "label": "候选名称（6字以内，如：细腻版/紧凑版/情绪强化版）",
      "content": "完整的改写后文本",
      "summary": "一句话说明这个版本做了什么（30字以内）",
      "rationale": "说明这个版本的改写思路（50字以内）",
      "riskNotes": ["可能的风险或注意事项"],
      "semanticTags": ["标签1", "标签2"]
    }
  ]
}

请输出JSON：`;

export async function expandTextV2({ text, action = 'expand', style = '', promptContent = '', toolInstruction = '', requestId = '', provider, model, constraints = null, intent = null } = {}) {
  if (!text?.trim()) throw new Error('原文内容不能为空');

  const actionConfig = {
    expand: { label: '扩写', detail: '在保持原意的基础上，丰富细节描写、心理活动、环境烘托和对话延展，使内容更加饱满生动。字数扩展到原文的1.5-2倍。', output: '展开描写，增加细节但不偏离原意' },
    polish: { label: '润色', detail: '优化句式结构，提升文笔质量，增强画面感和代入感，修正语病和平淡表达。字数与原文基本持平。', output: '保持原有信息量，提升表达质量' },
    shorten: { label: '精炼', detail: '去除冗余描写，保留核心情节和关键对话，使表达更加简洁有力。字数压缩到原文的60-70%。', output: '精简表达，保留核心信息和情节' },
  };

  const cfg = actionConfig[action] || actionConfig.expand;
  const clippedText = text.length > 3000 ? text.slice(0, 3000) : text;

  let constraintsText = '';
  if (constraints) {
    const c = constraints;
    constraintsText = [
      c.keepFacts ? '- 保留现有剧情事实' : '- 可调整部分事实',
      c.keepPov ? '- 保持当前人称与叙事视角' : '- 可调整叙事视角',
      c.noUnauthorizedSetting ? '- 不新增未授权设定' : '- 可引入补充设定',
      c.preserveCoreInfo ? '- 尽量保留原段核心信息' : '- 可重组核心信息',
    ].join('\n');
  }

  let intentSummary = '';
  if (intent) {
    intentSummary = [
      `目标：${intent.editGoal}`,
      `语气：${intent.toneShift}`,
      `节奏：${intent.paceAdjustment}`,
      `冲突：${intent.conflictAdjustment}`,
      `情绪：${intent.emotionAdjustment}`,
      `力度：${intent.strength}`,
      `保留：${(intent.mustPreserve || []).join('；')}`,
      `避免：${(intent.mustAvoid || []).join('；')}`,
    ].join('\n');
  }

  const systemPrompt = [
    MULTI_CANDIDATE_PROMPT
      .replace('{intent_summary}', intentSummary || `${cfg.label}处理：${cfg.detail}`)
      .replace('{constraints}', constraintsText || '- 保留核心剧情和信息\n- 不改变原有风格基调')
      .replace('{text}', clippedText),
    toolInstruction?.trim() ? `## 细分功能\n${toolInstruction.trim()}` : '',
    promptContent?.trim() ? `## 附加要求\n${promptContent.trim()}` : '',
    style?.trim() ? `## 写作风格参考\n${style}` : '',
  ].filter(Boolean).join('\n\n');

  debugLog('expandTextV2 prepared', {
    requestId, action, textLength: text.length, intentSummaryLength: intentSummary.length,
  });

  const result = await callLLM({
    taskType: 'writing_expand_v2',
    ...(provider ? { provider } : {}),
    ...(model ? { model } : {}),
    temperature: 0.8,
    maxTokens: Math.max(text.length * 4, 4096),
    timeoutMs: 180000,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `请对以上文本进行${cfg.label}处理，生成2-3个候选版本。` },
    ],
  });

  debugLog('expandTextV2 finished', {
    requestId, action, resultLength: result.content.length,
  });

  try {
    const parsed = JSON.parse(result.content);
    const candidates = (parsed.candidates || []).map((c, i) => ({
      id: `candidate-${i + 1}`,
      label: c.label || `候选${i + 1}`,
      content: c.content || '',
      summary: c.summary || '',
      rationale: c.rationale || '',
      riskNotes: c.riskNotes || [],
      semanticTags: c.semanticTags || [],
    }));

    if (candidates.length === 0) {
      return {
        candidates: [{
          id: 'candidate-1',
          label: cfg.label,
          content: result.content,
          summary: '',
          rationale: '',
          riskNotes: [],
          semanticTags: [],
        }],
      };
    }

    // 去重
    const seen = new Set();
    const deduped = candidates.filter(c => {
      const key = c.content.trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return { candidates: deduped };
  } catch {
    return {
      candidates: [{
        id: 'candidate-1',
        label: cfg.label,
        content: result.content,
        summary: '',
        rationale: '',
        riskNotes: [],
        semanticTags: [],
      }],
    };
  }
}
