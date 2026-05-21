/**
 * 审稿提示词 — 迁移自 AI-Novel-Writing-Assistant
 * server/src/prompting/prompts/novel/review.prompts.ts
 *
 * 将 TypeScript/Zod 的 PromptAsset 结构转为纯 JS，
 * 保留核心的 SystemMessage 文本和结构化输出逻辑。
 */

// ---- 章节审稿 ----

const CHAPTER_REVIEW_SYSTEM = [
  "你是资深网络小说章节审校编辑。",
  "你的任务不是重写章节，而是基于正文与给定上下文，对当前章节做结构化质量评估，并输出可供后续修文使用的审查结果。",
  "",
  "【任务边界】",
  "只输出符合 JSON 格式的严格 JSON 对象，不要输出 Markdown、解释、注释、代码块或任何额外文本。",
  "不能脑补未给出的前文、设定或隐藏剧情。",
  "",
  "【评分要求】",
  "score 必须完整包含：coherence、repetition、pacing、voice、engagement、overall。",
  "每项评分 0-100（低=差，高=好），基于正文实际表现，不得凭印象打分。",
  "repetition scoring：0 表示严重重复，100 表示重复控制良好；越高越好。",
  "",
  "【审查重点】",
  "1. coherence（连贯性）：事件衔接、人物行为、因果推进是否清楚稳定。",
  "2. repetition（重复率）：是否存在信息重复、表达重复、动作重复或功能重复。",
  "3. pacing（节奏）：节奏是否松散、失衡、过快跳跃或关键处压缩不足。",
  "4. voice（文风）：文风、叙述口吻、人物表达是否稳定且适配当前内容。",
  "5. engagement（追读感）：是否具有持续阅读动力，结尾钩子、冲突推进与信息揭示是否有效。",
  "6. overall（综合）：综合质量判断，应反映本章是否达到可发布或需重点修整的水平。",
  "",
  "【issues 要求】",
  "1. issues 必须只抓真正影响阅读与连载质量的问题，避免碎问题泛滥。",
  "2. 每条 issue 都必须具体，不能只写\"节奏不好\"\"描写偏弱\"\"有点重复\"。",
  "3. evidence 必须指向正文中的可观察现象，可以是某类段落问题、某种重复模式、某处逻辑断裂或某段失速现象。",
  "4. fixSuggestion 必须可执行，说明\"如何修\"，而不是只说\"加强张力\"\"优化表达\"。",
  "",
  "【上下文使用规则】",
  "1. 上下文仅辅助判断是否偏离任务或设定，不得拿来脑补正文未写出的内容。",
  "2. 若某项上下文不足，允许保守判断，但不要凭空制造问题。",
  "",
  "【输出格式】",
  "{",
  '  "score": { "coherence": 0-100, "repetition": 0-100, "pacing": 0-100, "voice": 0-100, "engagement": 0-100, "overall": 0-100 },',
  '  "issues": [',
  '    { "severity": "low|medium|high|critical", "category": "coherence|repetition|pacing|voice|engagement|logic", "evidence": "正文中可观察的问题描述", "fixSuggestion": "可执行的具体修改建议" }',
  "  ]",
  "}",
  "",
  "【质量要求】",
  "1. 重点关注：是否完成本章任务、是否有新推进、是否存在明显冗余、是否留下有效钩子。",
  "2. 同类问题不要拆成多条近义 issue。",
  "3. 审查结果应服务后续修文，既要指出问题，也要保留本章已经有效的部分。",
].join("\n");

/**
 * 构建章节审稿提示词
 * @param {object} input
 * @param {string} input.novelTitle - 小说标题
 * @param {string} input.chapterTitle - 章节标题
 * @param {string} input.content - 章节正文
 * @param {string} [input.contextBlock] - 上下文参考文本
 */
export function buildChapterReviewPrompt(input) {
  const { novelTitle, chapterTitle, content, contextBlock } = input;
  const userParts = [
    `小说：${novelTitle || "未命名小说"}`,
    `章节：${chapterTitle || "未命名章节"}`,
    "",
    "【上下文参考】",
    contextBlock || "暂无",
    "",
    "【正文】",
    content,
    "",
    "请输出章节审查 JSON。",
  ];
  return {
    system: CHAPTER_REVIEW_SYSTEM,
    user: userParts.join("\n"),
  };
}

// ---- 章节修复 ----

const CHAPTER_REPAIR_SYSTEM = [
  "你是资深网络小说修文编辑。",
  "你的任务是根据问题清单与上下文，对当前章节进行最小必要修复，使其更符合任务要求与阅读体验。",
  "",
  "【任务边界】",
  "只输出修复后的完整章节正文，不要输出解释、提纲、注释或任何额外文本。",
  "修文以\"最小必要修改\"为原则，不要无关重写，不要把原章整体推翻重来。",
  "不得引入新的核心角色、重大设定、主线转向或与上下文冲突的内容。",
  "",
  "【修复原则】",
  "1. 优先修复问题清单中指出的关键问题。",
  "2. 保留原章已经有效的推进、情绪、细节与角色状态，不要把有用内容一起洗掉。",
  "3. 若多个问题冲突，优先修复影响主线推进、逻辑连贯和阅读节奏的问题。",
  "",
  "【具体要求】",
  "1. 修复后章节必须仍然是自然可读的完整正文，而不是拼补痕迹明显的修改稿。",
  "2. 必须尽量保留本章原有核心事件顺序，除非问题清单明确指出结构需要调整。",
  "3. 若存在重复、空转、失速问题，应通过压缩、合并、替换无效段落来修，不要只做表面润色。",
  "4. 若存在逻辑、动机、衔接问题，应补足必要过桥与因果，而不是额外发明大设定。",
  "5. 若存在钩子不足、结尾无力问题，应在不违背既有走向的前提下加强章末压力、悬念或决策点。",
  "",
  "【风格要求】",
  "1. 保持与原章相近的叙述视角、语言风格与人物说话方式。",
  "2. 不要把修文写成另一种风格的新章。",
  "3. 控制 AI 味、总结味和说明味，优先用具体动作、对话、细节与局面变化完成修复。",
  "",
  "【禁止事项】",
  "禁止加入问题清单未要求的大幅扩写。",
  "禁止通过新增大事件掩盖原问题。",
  "禁止输出\"修改说明\"\"修复点如下\"等额外内容。",
].join("\n");

/**
 * 构建章节修复提示词
 * @param {object} input
 * @param {string} input.novelTitle
 * @param {string} input.chapterTitle
 * @param {string} input.chapterContent - 原章正文
 * @param {string} input.issuesJson - JSON 格式的问题清单
 * @param {string} [input.modeHint] - 修复重点方向
 * @param {string} [input.contextBlock] - 上下文参考
 */
export function buildChapterRepairPrompt(input) {
  const { novelTitle, chapterTitle, chapterContent, issuesJson, modeHint, contextBlock } = input;
  const userParts = [
    `小说：${novelTitle || "未命名小说"}`,
    `章节：${chapterTitle || "未命名章节"}`,
    "",
    "【上下文参考】",
    contextBlock || "暂无",
    "",
    "【当前正文】",
    chapterContent,
    "",
    "【问题清单】",
    issuesJson || "无具体问题清单",
    "",
    modeHint ? `【修复重点】${modeHint}` : "",
    "",
    "请直接输出修复后的完整章节正文。",
  ];
  return {
    system: CHAPTER_REPAIR_SYSTEM,
    user: userParts.join("\n"),
  };
}

// ---- 输出校验 ----

const SCORE_DIMS = ["coherence", "repetition", "pacing", "voice", "engagement", "overall"];
const VALID_SEVERITIES = ["low", "medium", "high", "critical"];
const VALID_CATEGORIES = ["coherence", "repetition", "pacing", "voice", "engagement", "logic"];

/**
 * 校验 LLM 返回的审稿 JSON，失败时降级为默认结果
 * @param {string|object} raw - LLM 原始输出
 * @returns {{ score: object, issues: Array }}
 */
export function validateReviewOutput(raw) {
  let parsed;
  try {
    parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return { score: defaultScore(), issues: [] };
  }

  const score = {};
  for (const dim of SCORE_DIMS) {
    const v = parsed?.score?.[dim];
    score[dim] = typeof v === "number" && v >= 0 && v <= 100 ? Math.round(v) : 50;
  }

  let issues = [];
  if (Array.isArray(parsed?.issues)) {
    issues = parsed.issues
      .filter((i) => i && typeof i === "object")
      .map((i) => ({
        severity: VALID_SEVERITIES.includes(i.severity) ? i.severity : "medium",
        category: VALID_CATEGORIES.includes(i.category) ? i.category : "logic",
        evidence: typeof i.evidence === "string" ? i.evidence.slice(0, 500) : "",
        fixSuggestion: typeof i.fixSuggestion === "string" ? i.fixSuggestion.slice(0, 1000) : "",
      }))
      .filter((i) => i.evidence || i.fixSuggestion);
  }

  return { score, issues };
}

function defaultScore() {
  const s = {};
  for (const dim of SCORE_DIMS) s[dim] = 50;
  return s;
}
