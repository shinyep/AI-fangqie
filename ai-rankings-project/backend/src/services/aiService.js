import { callLLM } from "./llm/factory.js";

const CHAPTER_ANALYSIS_PROMPT = `你是一位专业的网文编辑，擅长分析小说章节。请对以下章节内容进行结构化拆解。

## 分析要求
1. **章节简介(brief)**: 用1-2句话概括本章主要内容（80字以内）
2. **关键事件(key_events)**: 提取本章3-5个关键情节节点，每个15-40字
3. **出场角色(characters)**: 列出本章出现的主要角色名（2-5个）
4. **冲突推进(conflict)**: 分析本章的冲突/矛盾如何推进（40-100字）
5. **章末钩子(hook)**: 章末留下的悬念或期待点（30-80字），如果没有明显钩子则填"无"

## 输出格式
请严格按照以下JSON格式输出，不要添加任何其他文字：
{
  "brief": "...",
  "key_events": ["...", "..."],
  "characters": ["...", "..."],
  "conflict": "...",
  "hook": "..."
}`;

const TITLE_ANALYSIS_PROMPT = `你是一位资深的网文编辑和内容策划专家。根据提供的小说背景信息和章节标题，你需要推断并生成每个章节的结构化拆解。

## 分析规则
根据章节标题、书名、简介、类型等信息，合理推测每个章节的内容：
1. **章节简介(brief)**: 根据标题推测本章主要内容，与整体剧情保持连贯
2. **关键事件(key_events)**: 推测本章3-4个关键情节
3. **出场角色(characters)**: 推测本章可能出现的主要角色
4. **冲突推进(conflict)**: 推测本章的冲突和矛盾进展
5. **章末钩子(hook)**: 推测章末可能留下的悬念

## 输出格式
请严格按照以下JSON数组格式输出，每个元素对应一个章节：
[
  {
    "chapter_index": 1,
    "title": "章节标题",
    "brief": "...",
    "key_events": ["...", "..."],
    "characters": ["...", "..."],
    "conflict": "...",
    "hook": "..."
  }
]`;

export async function analyzeChapter(title, content) {
  const text = content.length > 8000 ? content.slice(0, 8000) : content;

  const result = await callLLM({
    taskType: "chapter_analysis",
    temperature: 0.3,
    maxTokens: 4096,
    timeoutMs: 60000,
    forceJSON: true,
    messages: [
      { role: "system", content: CHAPTER_ANALYSIS_PROMPT },
      { role: "user", content: `## 章节标题\n${title}\n\n## 章节内容\n${text}` },
    ],
  });

  try {
    let jsonStr = result.content;
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1];
    }
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    console.warn('[AI] 章节分析JSON匹配失败，原始内容前300字:', result.content.slice(0, 300));
  } catch (e) {
    console.warn('[AI] 章节分析JSON解析失败:', e.message, '原始内容前300字:', result.content.slice(0, 300));
  }

  return {
    brief: result.content.slice(0, 120) || "AI分析失败",
    key_events: [],
    characters: [],
    conflict: "",
    hook: "",
  };
}

export async function analyzeChaptersFromTitles(bookInfo, chapterTitles) {
  const chaptersText = chapterTitles
    .map((t, i) => `${i + 1}. ${t}`)
    .join("\n");

  const contextText = [
    `书名：${bookInfo.title || "未知"}`,
    `作者：${bookInfo.author || "未知"}`,
    `类型：${bookInfo.category || "未知"}`,
    `简介：${bookInfo.intro || ""}`,
    bookInfo.aiAnalysis ? `已有分析：${bookInfo.aiAnalysis}` : "",
  ].filter(Boolean).join("\n");

  const result = await callLLM({
    taskType: "title_analysis",
    temperature: 0.8,
    maxTokens: 8192,
    timeoutMs: 120000,
    forceJSON: true,
    messages: [
      { role: "system", content: TITLE_ANALYSIS_PROMPT },
      { role: "user", content: `## 小说背景信息\n${contextText}\n\n## 章节列表（共${chapterTitles.length}章）\n${chaptersText}\n\n请逐一分析以上每个章节。` },
    ],
  });

  try {
    // 尝试匹配 JSON 数组，支持 markdown 代码块包裹
    let jsonStr = result.content;
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1];
    }
    const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    console.warn('[AI] 标题分析JSON匹配失败，原始内容前500字:', result.content.slice(0, 500));
  } catch (e) {
    console.warn('[AI] 标题分析JSON解析失败:', e.message, '原始内容前500字:', result.content.slice(0, 500));
  }

  return chapterTitles.map((title, i) => ({
    chapter_index: i + 1,
    title,
    brief: "AI分析未生成有效结果",
    key_events: [],
    characters: [],
    conflict: "",
    hook: "",
  }));
}
