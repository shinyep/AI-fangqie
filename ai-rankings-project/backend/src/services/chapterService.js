import { getDb } from '../models/database.js';

function ensureTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS book_chapter (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      chapter_index INTEGER NOT NULL,
      title TEXT DEFAULT '',
      content TEXT DEFAULT '',
      summary TEXT DEFAULT '',
      word_count INTEGER DEFAULT 0,
      ai_model TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES book_project(id) ON DELETE CASCADE
    )
  `);
  const cols = db.prepare("PRAGMA table_info(book_chapter)").all().map(c => c.name);
  if (!cols.includes('summary')) {
    db.exec("ALTER TABLE book_chapter ADD COLUMN summary TEXT DEFAULT ''");
  }
}

export function listChapters(projectId) {
  ensureTable();
  return getDb().prepare(
    'SELECT * FROM book_chapter WHERE project_id = ? ORDER BY chapter_index ASC'
  ).all(projectId);
}

export function getChapter(id) {
  ensureTable();
  return getDb().prepare('SELECT * FROM book_chapter WHERE id = ?').get(id);
}

export function createChapter({ project_id, chapter_index, title = '', content = '', summary = '', word_count = 0, ai_model = '' }) {
  ensureTable();
  const db = getDb();
  db.prepare(
    'UPDATE book_chapter SET chapter_index = chapter_index + 1 WHERE project_id = ? AND chapter_index >= ?'
  ).run(project_id, chapter_index);
  const result = db.prepare(
    'INSERT INTO book_chapter (project_id, chapter_index, title, content, summary, word_count, ai_model) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(project_id, chapter_index, title || `第${chapter_index}章`, content, summary, word_count, ai_model);

  // 更新项目字数
  const totalWords = db.prepare(
    'SELECT COALESCE(SUM(word_count), 0) as total FROM book_chapter WHERE project_id = ?'
  ).get(project_id);
  db.prepare('UPDATE book_project SET total_words = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(totalWords.total, project_id);

  return getChapter(result.lastInsertRowid);
}

export function updateChapter(id, fields) {
  ensureTable();
  const db = getDb();
  const existing = db.prepare('SELECT * FROM book_chapter WHERE id = ?').get(id);
  if (!existing) return null;

  const title = fields.title ?? existing.title;
  const content = fields.content ?? existing.content;
  const summary = fields.summary ?? existing.summary;
  const word_count = fields.word_count ?? existing.word_count;
  const ai_model = fields.ai_model ?? existing.ai_model;

  db.prepare(
    'UPDATE book_chapter SET title=?, content=?, summary=?, word_count=?, ai_model=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
  ).run(title, content, summary, word_count, ai_model, id);

  // 更新项目字数
  const totalWords = db.prepare(
    'SELECT COALESCE(SUM(word_count), 0) as total FROM book_chapter WHERE project_id = ?'
  ).get(existing.project_id);
  db.prepare('UPDATE book_project SET total_words = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(totalWords.total, existing.project_id);

  return getChapter(id);
}

export function deleteChapter(id) {
  ensureTable();
  const db = getDb();
  const existing = db.prepare('SELECT * FROM book_chapter WHERE id = ?').get(id);
  if (!existing) return { changes: 0 };
  const result = db.prepare('DELETE FROM book_chapter WHERE id = ?').run(id);

  // 更新项目字数
  const totalWords = db.prepare(
    'SELECT COALESCE(SUM(word_count), 0) as total FROM book_chapter WHERE project_id = ?'
  ).get(existing.project_id);
  db.prepare('UPDATE book_project SET total_words = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(totalWords.total, existing.project_id);

  return result;
}
