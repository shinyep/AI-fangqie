import { getDb } from '../models/database.js';

// --- Query helpers ---

function buildTree(rows, parentId = 0) {
  return rows
    .filter((row) => row.parent_id === parentId)
    .map((row) => ({
      id: row.id,
      name: row.name,
      sort_order: row.sort_order,
      children: buildTree(rows, row.id),
    }));
}

// --- Public API ---

const CATEGORY_LABEL_MAP = {
  'AI扩写润色': 30,
  '续写正文': 35,
  '仿写改写': 25,
  '开篇创作': 23,
  '审稿分析': 22,
  '去AI痕迹': 21,
  '大纲细纲': 36,
  '书名简介': 24,
  '角色人设': 26,
  '对话对白': 27,
  '打斗场面': 28,
  '剧本创作': 29,
  '世界设定': 31,
  '短篇创作': 32,
  '创意脑洞': 33,
  '其他工具': 34,
  '通用工具': 34,
};

const QUALITY_KEYWORD_LABEL_MAP = {
  18: '%降AI%',
  19: '%精修%',
  20: '%审稿%',
};

function tableExists(db, tableName) {
  const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(tableName);
  return Boolean(row);
}

export function syncPromptLabelAssociations() {
  const db = getDb();
  if (!tableExists(db, 'ai_prompt') || !tableExists(db, 'ai_label') || !tableExists(db, 'ai_prompt_label')) {
    return { categoryLinked: 0, keywordLinked: 0 };
  }

  const insertLink = db.prepare('INSERT OR IGNORE INTO ai_prompt_label (prompt_id, label_id) VALUES (?, ?)');
  let categoryLinked = 0;
  for (const [category, labelId] of Object.entries(CATEGORY_LABEL_MAP)) {
    const prompts = db.prepare('SELECT id FROM ai_prompt WHERE category = ?').all(category);
    for (const { id } of prompts) {
      const result = insertLink.run(id, labelId);
      if (result.changes) categoryLinked++;
    }
  }

  let keywordLinked = 0;
  for (const [labelId, keyword] of Object.entries(QUALITY_KEYWORD_LABEL_MAP)) {
    const prompts = db.prepare('SELECT id FROM ai_prompt WHERE title LIKE ? OR content LIKE ?').all(keyword, keyword);
    for (const { id } of prompts) {
      const result = insertLink.run(id, Number(labelId));
      if (result.changes) keywordLinked++;
    }
  }

  return { categoryLinked, keywordLinked };
}

/** Get all labels as a tree */
export function getLabelTree() {
  const db = getDb();
  const rows = db.prepare(
    'SELECT id, name, parent_id, sort_order FROM ai_label ORDER BY sort_order ASC, id ASC'
  ).all();
  return buildTree(rows);
}

/** Get flat list of all labels */
export function getAllLabels() {
  const db = getDb();
  return db.prepare(
    'SELECT id, name, parent_id, sort_order FROM ai_label ORDER BY sort_order ASC, id ASC'
  ).all();
}

/** Get a single label by id */
export function getLabel(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM ai_label WHERE id = ?').get(id) || null;
}

/** Create a new label */
export function createLabel({ name, parent_id = 0, sort_order = 0 }) {
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO ai_label (name, parent_id, sort_order) VALUES (?, ?, ?)'
  ).run(name, parent_id, sort_order);
  return getLabel(result.lastInsertRowid);
}

/** Update a label */
export function updateLabel(id, fields) {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM ai_label WHERE id = ?').get(id);
  if (!existing) return null;

  const name = fields.name ?? existing.name;
  const parent_id = fields.parent_id ?? existing.parent_id;
  const sort_order = fields.sort_order ?? existing.sort_order;

  db.prepare(
    'UPDATE ai_label SET name = ?, parent_id = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(name, parent_id, sort_order, id);

  return getLabel(id);
}

/** Delete a label and its pivot entries */
export function deleteLabel(id) {
  const db = getDb();
  // Re-parent children to grandparent
  const label = db.prepare('SELECT parent_id FROM ai_label WHERE id = ?').get(id);
  if (label) {
    db.prepare('UPDATE ai_label SET parent_id = ? WHERE parent_id = ?').run(label.parent_id, id);
  }
  return db.prepare('DELETE FROM ai_label WHERE id = ?').run(id);
}

/** Get labels for a specific prompt */
export function getLabelsForPrompt(promptId) {
  const db = getDb();
  return db.prepare(`
    SELECT l.id, l.name, l.parent_id, l.sort_order
    FROM ai_label l
    INNER JOIN ai_prompt_label pl ON pl.label_id = l.id
    WHERE pl.prompt_id = ?
    ORDER BY l.sort_order ASC, l.id ASC
  `).all(promptId);
}

/** Set labels for a prompt (replace all) */
export function setPromptLabels(promptId, labelIds) {
  const db = getDb();
  const run = db.transaction(() => {
    db.prepare('DELETE FROM ai_prompt_label WHERE prompt_id = ?').run(promptId);
    const insert = db.prepare('INSERT OR IGNORE INTO ai_prompt_label (prompt_id, label_id) VALUES (?, ?)');
    for (const labelId of labelIds) {
      insert.run(promptId, labelId);
    }
  });
  run();
  return getLabelsForPrompt(promptId);
}

/** Get all prompts under a label (recursive through children) */
export function getPromptsForLabel(labelId, { limit = 50, offset = 0 } = {}) {
  const db = getDb();
  // Collect label and all its descendants
  const allLabels = getAllLabels();
  const ids = collectDescendantIds(allLabels, labelId);
  ids.push(labelId);

  const placeholders = ids.map(() => '?').join(',');
  const rows = db.prepare(`
    SELECT DISTINCT p.* FROM ai_prompt p
    INNER JOIN ai_prompt_label pl ON pl.prompt_id = p.id
    WHERE pl.label_id IN (${placeholders}) AND p.is_public = 1
    ORDER BY p.usage_count DESC, p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...ids, limit, offset);

  return rows.map(parsePrompt);
}

// --- Helpers ---

function collectDescendantIds(allRows, parentId) {
  const result = [];
  for (const row of allRows) {
    if (row.parent_id === parentId) {
      result.push(row.id);
      result.push(...collectDescendantIds(allRows, row.id));
    }
  }
  return result;
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

/**
 * Get writing style presets (番茄 + 降AI率 labels' prompts formatted as presets)
 * This replaces the hardcoded stylePresets in Writing.vue
 */
export function getStylePresets() {
  const db = getDb();
  // Use new scenario category names
  const writingCategories = ['AI扩写润色', '续写正文', '仿写改写', '开篇创作', '对话对白', '打斗场面', '角色人设', '短篇创作', '去AI痕迹', '审稿分析'];
  const rows = db.prepare(`
    SELECT DISTINCT p.id, p.title, p.content, p.category, p.tags
    FROM ai_prompt p
    WHERE p.is_public = 1
      AND p.category IN (${writingCategories.map(() => '?').join(',')})
    ORDER BY p.usage_count DESC, p.created_at DESC
    LIMIT 100
  `).all(...writingCategories);
  return rows.map(parsePrompt);
}
