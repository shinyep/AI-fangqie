import { getDb } from '../models/database.js';

function ensureTable() {
  const db = getDb();
  // 添加 relations 字段（如果不存在）
  const cols = db.prepare("PRAGMA table_info(character_card)").all().map(c => c.name);
  if (!cols.includes('relations')) {
    db.exec("ALTER TABLE character_card ADD COLUMN relations TEXT DEFAULT '[]'");
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS character_card (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      gender TEXT DEFAULT '',
      age TEXT DEFAULT '',
      personality TEXT DEFAULT '',
      background TEXT DEFAULT '',
      abilities TEXT DEFAULT '',
      appearance TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      relations TEXT DEFAULT '[]',
      novel_id INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export function listCharacters({ keyword = '', limit = 100, offset = 0 } = {}) {
  ensureTable();
  const db = getDb();
  let sql = 'SELECT * FROM character_card WHERE 1 = 1';
  const params = [];

  if (keyword) {
    sql += ' AND (name LIKE ? OR personality LIKE ? OR background LIKE ?)';
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw);
  }

  sql += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  return db.prepare(sql).all(...params);
}

export function getCharacter(id) {
  ensureTable();
  return getDb().prepare('SELECT * FROM character_card WHERE id = ?').get(id);
}

export function createCharacter(data) {
  ensureTable();
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO character_card (name, gender, age, personality, background, abilities, appearance, notes, relations, novel_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.name || '',
    data.gender || '',
    data.age || '',
    data.personality || '',
    data.background || '',
    data.abilities || '',
    data.appearance || '',
    data.notes || '',
    JSON.stringify(data.relations || []),
    data.novel_id || 0,
  );
  return getCharacter(result.lastInsertRowid);
}

export function updateCharacter(id, fields) {
  ensureTable();
  const db = getDb();
  const existing = db.prepare('SELECT * FROM character_card WHERE id = ?').get(id);
  if (!existing) return null;

  const keys = ['name', 'gender', 'age', 'personality', 'background', 'abilities', 'appearance', 'notes', 'relations', 'novel_id'];
  const sets = keys.map((k) => `${k} = ?`).join(', ');
  const values = keys.map((k) => {
    if (k === 'relations' && fields[k] !== undefined) return JSON.stringify(fields[k]);
    return fields[k] !== undefined ? fields[k] : existing[k];
  });

  db.prepare(`UPDATE character_card SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, id);
  return getCharacter(id);
}

export function deleteCharacter(id) {
  ensureTable();
  return getDb().prepare('DELETE FROM character_card WHERE id = ?').run(id);
}
