import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../models/database.js';

import { syncPromptLabelAssociations } from './labelService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function ensureTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_prompt (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT DEFAULT '通用',
      tags TEXT DEFAULT '[]',
      author TEXT DEFAULT '',
      usage_count INTEGER DEFAULT 0,
      favorite_count INTEGER DEFAULT 0,
      is_public INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // migrate: add favorite_count if missing
  const existingCols = db.prepare("PRAGMA table_info(ai_prompt)").all().map(c => c.name);
  if (!existingCols.includes('favorite_count')) {
    db.exec("ALTER TABLE ai_prompt ADD COLUMN favorite_count INTEGER DEFAULT 0");
  }
}

export function getCategories() {
  ensureTable();
  const db = getDb();
  const rows = db.prepare('SELECT DISTINCT category FROM ai_prompt WHERE is_public = 1 ORDER BY category').all();
  return rows.map((r) => r.category);
}

export function listPrompts({ category = '', keyword = '', label_id = 0, limit = 50, offset = 0 } = {}) {
  ensureTable();
  const db = getDb();
  let sql = 'SELECT * FROM ai_prompt WHERE is_public = 1';
  const params = [];

  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (keyword) {
    sql += ' AND (title LIKE ? OR content LIKE ? OR tags LIKE ?)';
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw);
  }
  if (label_id) {
    sql += ` AND id IN (SELECT pl.prompt_id FROM ai_prompt_label pl WHERE pl.label_id = ?)`;
    params.push(label_id);
  }


  sql += ' ORDER BY usage_count DESC, created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const rows = db.prepare(sql).all(...params);
  return rows.map(parsePrompt);
}

export function getPrompt(id) {
  ensureTable();
  const db = getDb();
  const row = db.prepare('SELECT * FROM ai_prompt WHERE id = ?').get(id);
  if (!row) return null;
  // 更新使用计数
  db.prepare('UPDATE ai_prompt SET usage_count = usage_count + 1 WHERE id = ?').run(id);
  return parsePrompt(row);
}

export function createPrompt({ title, content, category = '通用工具', tags = [], author = '', is_public = 1 }) {
  ensureTable();
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO ai_prompt (title, content, category, tags, author, is_public) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(title, content, category, JSON.stringify(tags), author, is_public ? 1 : 0);
  syncPromptLabelAssociations();
  return getPrompt(result.lastInsertRowid);
}

export function updatePrompt(id, fields) {
  ensureTable();
  const db = getDb();
  const existing = db.prepare('SELECT * FROM ai_prompt WHERE id = ?').get(id);
  if (!existing) return null;

  const title = fields.title ?? existing.title;
  const content = fields.content ?? existing.content;
  const category = fields.category ?? existing.category;
  const tags = fields.tags !== undefined ? JSON.stringify(fields.tags) : existing.tags;
  const isPublic = fields.is_public !== undefined ? (fields.is_public ? 1 : 0) : existing.is_public;

  db.prepare(
    'UPDATE ai_prompt SET title = ?, content = ?, category = ?, tags = ?, is_public = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(title, content, category, tags, isPublic, id);

  syncPromptLabelAssociations();
  return getPrompt(id);
}

export function toggleFavorite(id) {
  ensureTable();
  const db = getDb();
  const prompt = db.prepare('SELECT * FROM ai_prompt WHERE id = ?').get(id);
  if (!prompt) return null;
  db.prepare('UPDATE ai_prompt SET favorite_count = favorite_count + 1 WHERE id = ?').run(id);
  return getPrompt(id);
}

export function deletePrompt(id) {
  ensureTable();
  const db = getDb();
  return db.prepare('DELETE FROM ai_prompt WHERE id = ?').run(id);
}

function parsePrompt(row) {
  return {
    ...row,
    tags: safeJsonParse(row.tags, []),
  };
}

function safeJsonParse(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

// 初始化种子提示词
export function seedPrompts() {
  ensureTable();
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as c FROM ai_prompt').get();
  if (count.c > 0) return;

  const prompts = [
    ['写一个惊艳的开篇', '你是一位网文大神。请为以下故事设定写一个约800字的开篇。开篇必须在前三段抛出悬念或冲突，快速建立主角形象和核心困境，让读者产生强烈的好奇心。故事设定：{story_setting}', '开篇创作', ['开篇', '通用']],
    ['续写章节', '你是一位网文作家。请根据前文内容续写约600字。保持与前文一致的风格和叙事视角，剧情发展自然流畅，在末尾留下钩子。前文内容：{previous_text}', '续写正文', ['续写', '通用']],
    ['扩写场景描写', '请对以下场景进行扩写，增加环境描写、感官细节和角色心理活动，使画面更加生动饱满。字数扩展到原文的1.5-2倍。原文：{original_text}', 'AI扩写润色', ['扩写', '描写']],
    ['角色对话润色', '请优化以下对话，使其更符合角色性格，更有张力。每个角色的语言风格应该独特分明。角色设定：{character_info}\n对话原文：{dialogue}', '对话对白', ['对话', '角色']],
    ['世界观设定', '你是一位科幻/奇幻世界构建专家。请为以下构思设计一个完整的世界观框架，包括：时代背景、力量体系、社会结构、主要势力、独特法则。构思：{concept}', '世界设定', ['世界观', '大纲']],
    ['冲突设计', '你是一位网文剧情设计师。请为以下故事情境设计3种可能的核心冲突方案，每种方案包含：冲突来源、升级路径、解决方向、预期爽点。情境：{situation}', '大纲细纲', ['冲突', '剧情']],
    ['书名头脑风暴', '你是一位资深网文编辑。请根据以下故事信息，生成10个候选书名。书名要求2-5个字，好记有辨识度，体现核心卖点。故事信息：{story_info}', '书名简介', ['书名', '命名']],
    ['金手指设计', '你是一位网文创意策划。请根据故事类型设计一个新颖的金手指，包括：触发条件、核心能力、使用限制、成长空间、隐藏潜力。故事类型：{genre}', '创意脑洞', ['金手指', '设定']],
    ['反派设计', '你是一位网文角色设计师。请设计一个有深度的反派角色，包括：背景故事、核心动机、性格特点、能力体系、与主角的冲突根源。故事设定：{story_setting}', '角色人设', ['反派', '角色']],
    ['情感线设计', '你是一位言情/剧情设计师。请设计一条动人的情感线，包括：双方初遇、情感递进、关键转折、高潮冲突、理想结局。角色信息：{character_info}', '续写正文', ['情感', '关系']],
    ['打斗场面描写', '你是一位擅长动作描写的网文作家。请根据以下设定写一段精彩的打斗场面，要求招式清晰、节奏紧凑、有画面感。设定：{fight_setting}', '打斗场面', ['打斗', '动作']],
    ['章节收尾钩子', '请为以下章节内容设计一个章末钩子，让读者迫不及待想看下一章。钩子可以是悬念、转折、新角色登场或危机预警。章节内容概要：{chapter_summary}', '续写正文', ['钩子', '章末']],
  ];

  const insert = db.prepare(
    'INSERT INTO ai_prompt (title, content, category, tags, author) VALUES (?, ?, ?, ?, ?)'
  );
  for (const [title, content, category, tags] of prompts) {
    insert.run(title, content, category, JSON.stringify(tags), '系统');
  }
  syncPromptLabelAssociations();
  console.log('[PROMPT] 已初始化12条种子提示词');
}

// 从本地 JSON 文件加载续写要求提示词（不需要依赖星月 API）
export function seedLocalRewritePrompts() {
  ensureTable();
  const db = getDb();
  const jsonPath = join(__dirname, '..', '..', 'data', 'rewrite_prompts.json');

  if (!existsSync(jsonPath)) {
    console.log('[PROMPT] 本地续写要求提示词文件不存在，跳过加载');
    return;
  }

  let prompts;
  try {
    prompts = JSON.parse(readFileSync(jsonPath, 'utf8'));
  } catch (err) {
    console.error('[PROMPT] 读取本地续写要求提示词失败:', err.message);
    return;
  }

  if (!Array.isArray(prompts) || !prompts.length) {
    console.log('[PROMPT] 本地续写要求提示词为空');
    return;
  }

  const findByTitle = db.prepare('SELECT id FROM ai_prompt WHERE title = ?');
  const insertPrompt = db.prepare(`
    INSERT INTO ai_prompt (title, content, category, tags, author, usage_count, favorite_count, is_public)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let inserted = 0;
  const upsert = db.transaction((rows) => {
    rows.forEach((prompt) => {
      if (!prompt.title || !prompt.content) return;
      const existing = findByTitle.get(prompt.title);
      if (!existing) {
        const tags = Array.isArray(prompt.tags) ? JSON.stringify([...new Set(prompt.tags)]) : '[]';
        insertPrompt.run(
          prompt.title,
          prompt.content,
          prompt.category || '续写要求',
          tags,
          prompt.author || '星月社区',
          prompt.usage_count || 0,
          prompt.favorite_count || 0,
          1
        );
        inserted += 1;
      }
    });
  });
  upsert(prompts);
  if (inserted > 0) {
    syncPromptLabelAssociations();
    console.log(`[PROMPT] 从本地加载了 ${inserted} 条续写要求提示词`);
  }
}
