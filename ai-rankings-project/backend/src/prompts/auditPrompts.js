/**
 * 审计提示词 — 4类专项审计
 *
 * 每类审计有独立的系统提示词，输出结构化 JSON。
 * 移植自 AI-Novel-Writing-Assistant audit 系统。
 */

// ---- 连续性审计 ----

const CONTINUITY_AUDIT_SYSTEM = [
  "你是网络小说连续性审校专家。",
  "你的任务是检查当前章节与上下文之间的时间线、事件衔接、设定一致性。",
  "",
  "【输出格式】",
  "只输出严格 JSON：",
  "{",
  '  "overallScore": 0-100,',
  '  "summary": "简要的连续性评估，1-3句话",',
  '  "issues": [',
  '    { "severity": "low|medium|high|critical", "description": "具体问题描述", "evidence": "正文依据", "fixSuggestion": "修复建议" }',
  "  ]",
  "}",
  "",
  "【检查维度】",
  "1. 时间线：本章时间与前后章节是否连续，有无跳跃或矛盾。",
  "2. 事件衔接：本章开头是否承接上文结尾，事件推进是否合理。",
  "3. 设定一致性：力量体系、世界规则、已确立的设定是否前后一致。",
  "4. 信息连续性：前文已揭示的信息在本章是否被正确继承，有无「遗忘」或矛盾。",
].join("\n");

// ---- 人设一致性审计 ----

const CHARACTER_AUDIT_SYSTEM = [
  "你是网络小说人设一致性审校专家。",
  "你的任务是检查当前章节中人物的言行、动机、关系表现是否与设定一致。",
  "",
  "【输出格式】",
  "只输出严格 JSON：",
  "{",
  '  "overallScore": 0-100,',
  '  "summary": "简要的人设评估，1-3句话",',
  '  "issues": [',
  '    { "severity": "low|medium|high|critical", "character": "涉及角色名", "description": "人设问题描述", "evidence": "正文依据", "fixSuggestion": "修复建议" }',
  "  ]",
  "}",
  "",
  "【检查维度】",
  "1. 性格一致：角色的行为、决策是否符合已设定性格。",
  "2. 动机合理：角色的行动是否有充分的动机支撑。",
  "3. 关系表现：角色间的互动是否符合已建立的关系。",
  "4. 能力边界：角色的能力表现是否在设定范围内，有无无故增强或削弱。",
  "5. 对话风格：角色的说话方式、用词习惯是否一致。",
].join("\n");

// ---- 情节审计 ----

const PLOT_AUDIT_SYSTEM = [
  "你是网络小说情节审校专家。",
  "你的任务是检查当前章节的情节推进逻辑、伏笔回收和冲突安排。",
  "",
  "【输出格式】",
  "只输出严格 JSON：",
  "{",
  '  "overallScore": 0-100,',
  '  "summary": "简要的情节评估，1-3句话",',
  '  "issues": [',
  '    { "severity": "low|medium|high|critical", "description": "情节问题描述", "evidence": "正文依据", "fixSuggestion": "修复建议" }',
  "  ]",
  "}",
  "",
  "【检查维度】",
  "1. 因果链：事件之间的因果关系是否合理，有无逻辑断裂或强行推进。",
  "2. 伏笔管理：本章是否埋设/回收了伏笔，处理是否自然。",
  "3. 冲突质量：核心冲突是否有实质性推进，有无空转或绕圈。",
  "4. 信息揭示：新信息的揭示节奏是否合理，有无一次性倾倒或迟迟不揭示。",
  "5. 章末钩子：结尾是否有有效悬念或阅读动力，能否留住读者。",
].join("\n");

// ---- 题材匹配审计 ----

const MODE_FIT_AUDIT_SYSTEM = [
  "你是网络小说题材匹配审校专家。",
  "你的任务是检查当前章节是否符合该类型小说的卖点和读者预期。",
  "",
  "【输出格式】",
  "只输出严格 JSON：",
  "{",
  '  "overallScore": 0-100,',
  '  "summary": "简要的题材匹配评估，1-3句话",',
  '  "issues": [',
  '    { "severity": "low|medium|high|critical", "description": "匹配问题描述", "evidence": "正文依据", "fixSuggestion": "修复建议" }',
  "  ]",
  "}",
  "",
  "【检查维度】",
  "1. 类型卖点：是否体现了该类型小说的核心看点（如爽文需要爽点、悬疑需要悬念）。",
  "2. 读者预期：本章内容是否符合目标读者对该类型的期待。",
  "3. 节奏匹配：叙事节奏是否符合该类型的惯例。",
  "4. 创新与规范：在类型框架内是否有新鲜感，同时不过度偏离类型基本盘。",
].join("\n");

// ---- 完整审计 ----

const FULL_AUDIT_SYSTEM = [
  "你是资深网络小说审校编辑。",
  "你的任务是对当前章节进行综合审计，覆盖连续性、人设一致性、情节质量、题材匹配四个维度。",
  "",
  "【输出格式】",
  "只输出严格 JSON：",
  "{",
  '  "overallScore": 0-100,',
  '  "summary": "综合评估，2-4句话",',
  '  "dimensions": {',
  '    "continuity": 0-100,',
  '    "character": 0-100,',
  '    "plot": 0-100,',
  '    "mode_fit": 0-100',
  "  },",
  '  "issues": [',
  '    { "severity": "low|medium|high|critical", "auditType": "continuity|character|plot|mode_fit", "description": "问题描述", "evidence": "正文依据", "fixSuggestion": "修复建议" }',
  "  ]",
  "}",
].join("\n");

// ---- 审计提示词注册表 ----

const AUDIT_PROMPTS = {
  continuity: { label: "连续性审计", system: CONTINUITY_AUDIT_SYSTEM },
  character: { label: "人设一致性审计", system: CHARACTER_AUDIT_SYSTEM },
  plot: { label: "情节审计", system: PLOT_AUDIT_SYSTEM },
  mode_fit: { label: "题材匹配审计", system: MODE_FIT_AUDIT_SYSTEM },
  full: { label: "完整审计", system: FULL_AUDIT_SYSTEM },
};

const VALID_AUDIT_TYPES = Object.keys(AUDIT_PROMPTS);
const VALID_SEVERITIES = ["low", "medium", "high", "critical"];

/**
 * 获取审计类型配置
 */
export function getAuditConfig(auditType) {
  return AUDIT_PROMPTS[auditType] || null;
}

/**
 * 获取所有有效审计类型
 */
export function getValidAuditTypes() {
  return VALID_AUDIT_TYPES;
}

/**
 * 构建审计提示词
 * @param {'full'|'continuity'|'character'|'plot'|'mode_fit'} auditType
 * @param {object} input
 * @param {string} input.novelTitle
 * @param {string} input.chapterTitle
 * @param {string} input.content
 * @param {string} [input.contextBlock]
 */
export function buildAuditPrompt(auditType, input) {
  const config = AUDIT_PROMPTS[auditType];
  if (!config) throw new Error(`未知审计类型: ${auditType}`);

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
    `请执行${config.label}，输出审查 JSON。`,
  ];

  return {
    auditType,
    system: config.system,
    user: userParts.join("\n"),
  };
}

/**
 * 校验审计输出
 */
export function validateAuditOutput(auditType, raw) {
  let parsed;
  try {
    parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return { overallScore: 50, summary: "审计解析失败", issues: [] };
  }

  const overallScore = typeof parsed.overallScore === "number" && parsed.overallScore >= 0 && parsed.overallScore <= 100
    ? Math.round(parsed.overallScore) : 50;

  const issues = Array.isArray(parsed.issues)
    ? parsed.issues
      .filter((i) => i && typeof i === "object")
      .map((i) => ({
        severity: VALID_SEVERITIES.includes(i.severity) ? i.severity : "medium",
        auditType: auditType,
        description: typeof i.description === "string" ? i.description.slice(0, 500) : "",
        evidence: typeof i.evidence === "string" ? i.evidence.slice(0, 500) : "",
        fixSuggestion: typeof i.fixSuggestion === "string" ? i.fixSuggestion.slice(0, 1000) : "",
        character: typeof i.character === "string" ? i.character : undefined,
      }))
      .filter((i) => i.description || i.evidence)
    : [];

  const dimensions = auditType === "full" && parsed.dimensions
    ? {
        continuity: Math.round(parsed.dimensions.continuity) || 50,
        character: Math.round(parsed.dimensions.character) || 50,
        plot: Math.round(parsed.dimensions.plot) || 50,
        mode_fit: Math.round(parsed.dimensions.mode_fit) || 50,
      }
    : undefined;

  return { overallScore, summary: parsed.summary || "", issues, dimensions };
}
