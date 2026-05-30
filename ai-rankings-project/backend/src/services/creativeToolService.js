import { getAIConfig, listProviders } from './aiConfigService.js';

export function listModels() {
  const providers = listProviders();
  return providers
    .filter(p => p.isConfigured)
    .map(p => ({
      provider: p.provider,
      displayName: p.displayName,
      defaultModel: p.defaultModel || '',
      models: p.builtinModels || [],
    }));
}

import TOOLS from "../prompts/creativeToolPrompts.js";



async function callAI(systemPrompt, userPrompt, { temperature = 0.85, maxTokens = 4096, timeout = 120000, provider: overrideProvider = null, model: overrideModel = null } = {}) {
  const config = getAIConfig();
  if (overrideProvider) {
    const providers = listProviders();
    const target = providers.find(function(p) { return p.provider === overrideProvider && p.isActive; });
    if (target) {
      if (target.api_key) config.api_key = target.api_key;
      if (target.api_base) config.api_base = target.api_base;
      if (overrideModel) config.model = overrideModel;
      else if (target.model) config.model = target.model;
    }
  }
  if (!config.api_key) throw new Error('AI模型未配置API Key，请先在设置中配置');

  const response = await fetch(`${config.api_base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.api_key}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature,
      max_tokens: maxTokens || config.max_tokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
    signal: AbortSignal.timeout(timeout),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`AI API请求失败 (${response.status}): ${errBody.slice(0, 200)}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}
// Common helper: call AI and parse JSON response
async function callAIAndParseJSON(systemPrompt, userPrompt, options = {}) {
  const raw = await callAI(systemPrompt, userPrompt, options);
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/) || raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return { type: 'json', data: JSON.parse(jsonMatch[0]), raw };
    }
  } catch { /* return as text */ }
  return { type: 'text', data: raw, raw };
}

// Common helper: parse JSON from raw AI response (no AI call)
function parseJSONResponse(raw) {
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/) || raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return { type: 'json', data: JSON.parse(jsonMatch[0]), raw };
    }
  } catch { /* return as text */ }
  return { type: 'text', data: raw, raw };
}


export function getToolList() {
  return Object.entries(TOOLS).map(([key, tool]) => ({
    key,
    name: tool.name,
    description: tool.description,
    inputs: tool.inputs,
  }));
}

export async function generateTool(key, params = {}) {
  const tool = TOOLS[key];
  if (!tool) throw new Error(`未知生成器: ${key}`);

  // 模式切换：风格仿写用 rewritePrompt，原创生成用 systemPrompt
  const isRewrite = params.mode === '风格仿写' && tool.rewritePrompt;
  let systemPrompt = isRewrite ? tool.rewritePrompt : tool.systemPrompt;

  // 动态替换 {count} 模板变量：优先 chapters > volume_count > count
  const countInput = tool.inputs.find(inp => inp.type === 'stepper' || inp.type === 'number');
  const countKey = countInput?.key || 'count';
  const count = params.chapters || params[countKey] || tool.count || 1;
  systemPrompt = systemPrompt.replace(/\{count\}/g, String(count));

  // 动态构建用户输入：遍历工具定义的所有输入字段
  const userParts = [];
  if (tool.inputs) {
    tool.inputs.forEach(inp => {
      const val = params[inp.key];
      if (val !== undefined && val !== null && val !== '' && val !== false) {
        userParts.push(`${inp.label}：${val}`);
      }
    });
  }
  if (params.extra_instruction) {
    userParts.push(`附加指令：${params.extra_instruction}`);
  }
  const userPrompt = userParts.length ? userParts.join('\n') : `请根据此工具的要求生成内容。`;

  const isJsonTool = ['book_title', 'synopsis', 'outline', 'golden_finger', 'name_generator', 'character_design', 'detailed_outline', 'opening', 'world', 'imagination', 'title_rewrite', 'summary_rewrite', 'imagination_rewrite', 'book_analysis', 'chapter_title', 'cover_prompt', 'volume_summary'].includes(key);
  const isHeavyTool = ['outline', 'detailed_outline'].includes(key);
  const raw = await callAI(systemPrompt, userPrompt, {
    temperature: isJsonTool ? 0.9 : 0.85,
    maxTokens: isHeavyTool ? 16384 : (isJsonTool ? 8192 : 4096),
    timeout: 120000,
  });

  if (isJsonTool) {
    return parseJSONResponse(raw);
  }

  return { type: 'text', data: raw, raw };
}

// AI完善大纲节点
export async function refineOutline(toolKey, { original_data, mode = 'overall', direction, extra_instruction } = {}) {
  const tool = TOOLS[toolKey];
  if (!tool) throw new Error(`未知生成器: ${toolKey}`);

  const modes = {
    overall: '整体扩写：全面丰富内容，增加深度和细节',
    details: '补充细节：增强具体描写和场景细节',
    conflict: '强化冲突：加深矛盾对立和戏剧张力',
    pacing: '优化节奏：调整叙事节奏，松紧有度',
    world: '补足世界观：拓展世界设定和背景深度',
  };

  const modeDesc = modes[direction] || modes.overall;
  const originalJson = JSON.stringify(original_data, null, 2);

  const systemPrompt = `你是一位资深网文编辑，擅长完善和增强大纲内容。

## 当前操作
${modeDesc}

## 要求
1. 保持原始内容的核心结构不变
2. 在原有基础上进行增强，不要推倒重来
3. 丰富细节，增加具体描写
4. 保持与原作的风格一致性

## 输出格式
输出完善后的内容，保持与输入相同的JSON结构。`;

  const userParts = [`完善模式：${modeDesc}\n\n原始内容：\n${originalJson}`];
  if (extra_instruction) userParts.push(`附加指令：${extra_instruction}`);
  const userPrompt = userParts.join('\n');

  return await callAIAndParseJSON(systemPrompt, userPrompt, {
    temperature: 0.85, maxTokens: 8192, timeout: 120000,
  });
}

// AI拆分大纲节点
export async function splitOutline(toolKey, { original_data, mode = 'plot', direction, split_count = 3, extra_instruction } = {}) {
  const tool = TOOLS[toolKey];
  if (!tool) throw new Error(`未知生成器: ${toolKey}`);

  const modes = {
    plot: '按剧情推进：将内容按故事发展的先后顺序拆分为多个阶段',
    conflict: '按冲突升级：按冲突从小到大、从外部到内部的升级路径拆分',
    timeline: '按时间顺序：按时间线节点拆分（如：前夜/爆发/转折/高潮/余波）',
    chapter: '按章节策划：直接将内容拆分为具体章节的规划',
  };

  const modeDesc = modes[direction] || modes.plot;
  const originalJson = JSON.stringify(original_data, null, 2);

  const systemPrompt = `你是一位资深网文策划，擅长将大纲细化和拆分。

## 当前操作
${modeDesc}

## 要求
1. 将原始内容拆分为${split_count}个子节点
2. 每个子节点保持相对独立和完整
3. 子节点之间要有清晰的递进/因果逻辑
4. 保持原有内容不丢失，只是重组和细化

## 输出格式
生成${split_count}个子节点的JSON数组，保持与输入相同的字段结构。`;

  const userParts = [`拆分模式：${modeDesc}\n拆分数量：${split_count}\n\n原始内容：\n${originalJson}`];
  if (extra_instruction) userParts.push(`附加指令：${extra_instruction}`);
  const userPrompt = userParts.join('\n');

  return await callAIAndParseJSON(systemPrompt, userPrompt, {
    temperature: 0.9, maxTokens: 8192, timeout: 120000,
  });
}

// AI生成场景卡
export async function generateSceneCards(toolKey, { chapter_data, extra_instruction } = {}) {
  const tool = TOOLS[toolKey];
  if (!tool || !tool.sceneCardPrompt) throw new Error(`该工具不支持场景卡生成: ${toolKey}`);

  const chapterJson = JSON.stringify(chapter_data, null, 2);
  const targetWordCount = chapter_data?.boundary?.target_word_count || chapter_data?.word_count_estimate || 3000;
  const sceneCount = Math.min(8, Math.max(3, Math.round(targetWordCount / 500)));

  const systemPrompt = tool.sceneCardPrompt + `\n\n## 当前章节信息\n目标总字数：${targetWordCount}字\n建议场景数：${sceneCount}个`;

  const userParts = [`请为以下章节生成${sceneCount}个场景卡：\n\n${chapterJson}`];
  if (extra_instruction) userParts.push(`附加指令：${extra_instruction}`);
  const userPrompt = userParts.join('\n');

  const raw = await callAI(systemPrompt, userPrompt, {
    temperature: 0.8, maxTokens: 4096, timeout: 60000,
  });

  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/) || raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        type: 'json',
        data: Array.isArray(parsed) ? parsed : (parsed.scene_cards || parsed.scenes || [parsed]),
        raw,
      };
    }
  } catch { /* return as text */ }
  return { type: 'text', data: raw, raw };
}

// AI生成任务单
export async function generateTaskSheet(toolKey, { chapter_data, extra_instruction } = {}) {
  const tool = TOOLS[toolKey];
  if (!tool || !tool.taskSheetPrompt) throw new Error(`该工具不支持任务单生成: ${toolKey}`);

  const chapterJson = JSON.stringify(chapter_data, null, 2);

  const systemPrompt = tool.taskSheetPrompt;
  const userParts = [`请为以下章节生成可执行的任务单：\n\n${chapterJson}`];
  if (extra_instruction) userParts.push(`附加指令：${extra_instruction}`);
  const userPrompt = userParts.join('\n');

  return await callAIAndParseJSON(systemPrompt, userPrompt, {
    temperature: 0.75, maxTokens: 2048, timeout: 60000,
  });
}

// AI评估章节创作蓝图质量
export async function assessChapterQuality(toolKey, { chapter_data, extra_instruction } = {}) {
  const tool = TOOLS[toolKey];
  if (!tool || !tool.assessPrompt) throw new Error(`该工具不支持质量评估: ${toolKey}`);

  const chapterJson = JSON.stringify(chapter_data, null, 2);

  const systemPrompt = tool.assessPrompt;
  const userParts = [`请评估以下章节创作蓝图的完整性：\n\n${chapterJson}`];
  if (extra_instruction) userParts.push(`附加指令：${extra_instruction}`);
  const userPrompt = userParts.join('\n');

  return await callAIAndParseJSON(systemPrompt, userPrompt, {
    temperature: 0.5, maxTokens: 2048, timeout: 60000,
  });
}

// AI生成单章深度细纲
export async function generateSingleChapter(toolKey, params) {
  const tool = TOOLS[toolKey];
  if (!tool || !tool.singleChapterPrompt) throw new Error(`该工具不支持单章深度编排: ${toolKey}`);

  const { single_theme, chapter_context, chapter_number = 1, deep_scope, extra_instruction } = params;
  const includeSceneCards = !deep_scope || deep_scope.includes('完整版');
  const includeBoundary = !deep_scope || deep_scope.includes('标准版') || deep_scope.includes('完整版');

  let systemPrompt = tool.singleChapterPrompt;

  const userParts = [`本章序号：第${chapter_number}章`, `本章概要：${single_theme || ''}`];
  if (chapter_context) userParts.push(`前后文背景：${chapter_context}`);
  if (extra_instruction) userParts.push(`附加指令：${extra_instruction}`);
  const userPrompt = userParts.join('\n\n');

  return await callAIAndParseJSON(systemPrompt, userPrompt, {
    temperature: 0.85, maxTokens: includeSceneCards ? 8192 : 4096, timeout: 120000,
  });
}
