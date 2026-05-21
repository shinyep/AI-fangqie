import { getDb } from '../models/database.js';

export function createSnapshot(chapterId, { content, word_count, label }) {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO chapter_snapshot (chapter_id, content, word_count, label)
     VALUES (?, ?, ?, ?)`
  );
  const info = stmt.run(chapterId, content, word_count || 0, label || '');
  return {
    id: info.lastInsertRowid,
    chapter_id: chapterId,
    content,
    word_count: word_count || 0,
    label: label || '',
    created_at: new Date().toISOString(),
  };
}

export function getSnapshotsByChapterId(chapterId) {
  const db = getDb();
  return db.prepare(
    'SELECT id, chapter_id, word_count, label, created_at FROM chapter_snapshot WHERE chapter_id = ? ORDER BY created_at DESC'
  ).all(chapterId);
}

export function getSnapshotById(snapshotId) {
  const db = getDb();
  return db.prepare('SELECT * FROM chapter_snapshot WHERE id = ?').get(snapshotId);
}

export function restoreSnapshot(chapterId, snapshotId) {
  const db = getDb();
  const snapshot = getSnapshotById(snapshotId);
  if (!snapshot) throw new Error('快照不存在');
  if (snapshot.chapter_id !== chapterId) throw new Error('快照不属于此章节');

  // 更新章节内容为快照内容
  db.prepare(
    'UPDATE book_chapter SET content = ?, word_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(snapshot.content, snapshot.word_count, chapterId);

  return { restored: true, chapter_id: chapterId, snapshot_id: snapshotId };
}

export function deleteSnapshot(snapshotId) {
  const db = getDb();
  db.prepare('DELETE FROM chapter_snapshot WHERE id = ?').run(snapshotId);
  return { deleted: true };
}
