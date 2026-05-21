import { getDb } from '../models/database.js';

function ensureTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS word_card (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      content TEXT NOT NULL,
      card_type TEXT DEFAULT 'style',
      is_public INTEGER DEFAULT 0,
      author TEXT DEFAULT '',
      usage_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export function listCards({ card_type = '', keyword = '', limit = 100 } = {}) {
  ensureTable();
  const db = getDb();
  let sql = 'SELECT * FROM word_card WHERE 1 = 1';
  const params = [];

  if (card_type) { sql += ' AND card_type = ?'; params.push(card_type); }
  if (keyword) {
    sql += ' AND (name LIKE ? OR content LIKE ?)';
    const kw = `%${keyword}%`;
    params.push(kw, kw);
  }

  sql += ' ORDER BY usage_count DESC, created_at DESC LIMIT ?';
  params.push(limit);
  return db.prepare(sql).all(...params);
}

export function getCardTypes() {
  ensureTable();
  return [
    { key: 'style', name: '写作风格', description: '如"强画面强代入""轻松幽默风"等' },
    { key: 'requirement', name: '写作要求', description: '如"放大矛盾冲突""突出人物性格"等' },
    { key: 'instruction', name: '剧情指令', description: '如"主角觉醒→遇到对手→绝地反击"等' },
  ];
}

export function getCard(id) {
  ensureTable();
  const row = getDb().prepare('SELECT * FROM word_card WHERE id = ?').get(id);
  if (row) {
    getDb().prepare('UPDATE word_card SET usage_count = usage_count + 1 WHERE id = ?').run(id);
  }
  return row;
}

export function createCard({ name, content, card_type = 'style', is_public = 0, author = '' }) {
  ensureTable();
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO word_card (name, content, card_type, is_public, author) VALUES (?, ?, ?, ?, ?)'
  ).run(name, content, card_type, is_public ? 1 : 0, author);
  return getCard(result.lastInsertRowid);
}

export function updateCard(id, fields) {
  ensureTable();
  const db = getDb();
  const existing = db.prepare('SELECT * FROM word_card WHERE id = ?').get(id);
  if (!existing) return null;

  const name = fields.name ?? existing.name;
  const content = fields.content ?? existing.content;
  const card_type = fields.card_type ?? existing.card_type;
  const is_public = fields.is_public !== undefined ? (fields.is_public ? 1 : 0) : existing.is_public;

  db.prepare(
    'UPDATE word_card SET name=?, content=?, card_type=?, is_public=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
  ).run(name, content, card_type, is_public, id);
  return getCard(id);
}

export function deleteCard(id) {
  ensureTable();
  return getDb().prepare('DELETE FROM word_card WHERE id = ?').run(id);
}

// 种子数据
export function seedWordCards() {
  ensureTable();
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as c FROM word_card').get();
  if (count.c > 0) return;

  const cards = [
    ['南城爽文风', '强画面、强代入、强情绪的爽文输出风格，节奏紧凑不拖沓', 'style', 1],
    ['轻松幽默风', '语言轻松幽默，对话俏皮活泼，适合日常和轻喜剧场景', 'style', 1],
    ['古风典雅', '文笔凝练典雅，注重意境营造和诗词化表达，适合仙侠历史题材', 'style', 1],
    ['紧张悬疑', '氛围紧张压抑，多用短句和悬疑铺垫，层层递进揭示真相', 'style', 1],
    ['放大矛盾冲突', '突出人物之间的矛盾，放大冲突细节，增加戏剧张力', 'requirement', 1],
    ['突出人物性格', '通过对话和行动强化角色性格特征，让角色更加立体', 'requirement', 1],
    ['加强情感渲染', '在关键情节加强情感描写，增加内心独白和感官细节', 'requirement', 1],
    ['控制节奏紧凑', '减少闲笔和过度描写，保持每段都有信息量或情绪推动', 'requirement', 1],
    ['黄金开篇指令', '1.抛出悬念→2.快速建立主角形象→3.暗示金手指→4.制造首次冲突→5.留下追读钩子', 'instruction', 1],
    ['升级打脸指令', '1.主角遭遇轻视→2.隐忍/准备→3.关键场合爆发→4.震慑众人→5.新的挑战降临', 'instruction', 1],
    ['情感推进指令', '1.双方互动升温→2.误会/阻碍出现→3.情感考验→4.坦诚/和解→5.关系升级', 'instruction', 1],
    ['世界观展开指令', '1.局部设定展示→2.规则体系暗示→3.格局扩大→4.深层规则揭示→5.世界全貌初现', 'instruction', 1],
  ];

  const insert = db.prepare(
    'INSERT INTO word_card (name, content, card_type, is_public, author) VALUES (?, ?, ?, ?, ?)'
  );
  for (const [name, content, card_type, is_public] of cards) {
    insert.run(name, content, card_type, is_public, '系统');
  }
  console.log('[WORDCARD] 已初始化12条种子词条卡');
}
