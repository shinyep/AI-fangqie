import { getDb } from '../models/database.js';

function ensureTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS creative_outline_save (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      chapter_index INTEGER NOT NULL,
      chapter_title TEXT DEFAULT '',
      outline_data TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (book_id) REFERENCES book_project(id) ON DELETE CASCADE
    )
  `);
}

export function saveOutline({ book_id, chapter_index, chapter_title, outline_data }) {
  ensureTable();
  const db = getDb();
  const existing = db.prepare('SELECT id FROM creative_outline_save WHERE book_id = ? AND chapter_index = ?').get(book_id, chapter_index);
  const dataJson = typeof outline_data === 'string' ? outline_data : JSON.stringify(outline_data);
  if (existing) {
    db.prepare('UPDATE creative_outline_save SET chapter_title = ?, outline_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(chapter_title || `第${chapter_index}章`, dataJson, existing.id);
    return { id: existing.id, updated: true };
  }
  const result = db.prepare('INSERT INTO creative_outline_save (book_id, chapter_index, chapter_title, outline_data) VALUES (?, ?, ?, ?)').run(book_id, chapter_index, chapter_title || `第${chapter_index}章`, dataJson);
  return { id: Number(result.lastInsertRowid), created: true };
}

export function listOutlines(bookId) {
  ensureTable();
  return getDb().prepare('SELECT * FROM creative_outline_save WHERE book_id = ? ORDER BY chapter_index ASC').all(bookId);
}

export function getOutline(id) {
  ensureTable();
  const row = getDb().prepare('SELECT * FROM creative_outline_save WHERE id = ?').get(id);
  if (row && row.outline_data) {
    try { row.outline_data = JSON.parse(row.outline_data); } catch { /* keep string */ }
  }
  return row;
}

export function deleteOutline(id) {
  ensureTable();
  return getDb().prepare('DELETE FROM creative_outline_save WHERE id = ?').run(id);
}
