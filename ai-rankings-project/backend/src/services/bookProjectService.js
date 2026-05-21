import { getDb } from '../models/database.js';

function ensureTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS book_project (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      cover_url TEXT DEFAULT '',
      style TEXT DEFAULT '',
      status TEXT DEFAULT 'draft',
      total_words INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export function listProjects() {
  ensureTable();
  const db = getDb();
  return db.prepare('SELECT * FROM book_project ORDER BY updated_at DESC').all();
}

export function getProject(id) {
  ensureTable();
  return getDb().prepare('SELECT * FROM book_project WHERE id = ?').get(id);
}

export function createProject({ title, description = '', style = '', cover_url = '', outline = '', style_profile = '', outline_job_id = 0 }) {
  ensureTable();
  const db = getDb();

  const result = db.transaction(() => {
    const r = db.prepare(
      'INSERT INTO book_project (title, description, style, cover_url, outline, style_profile) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(title, description, style, cover_url, outline, style_profile);
    const projectId = Number(r.lastInsertRowid);

    // 如果指定了已保存的细纲，导入章节
    if (outline_job_id) {
      const job = db.prepare('SELECT * FROM novel_outline_job WHERE id = ?').get(outline_job_id);
      if (job) {
        const outlineChapters = db.prepare(
          'SELECT * FROM novel_chapter_outline WHERE job_id = ? ORDER BY chapter_index'
        ).all(outline_job_id);

        const insertChapter = db.prepare(
          'INSERT INTO book_chapter (project_id, chapter_index, title, content, word_count, ai_model) VALUES (?, ?, ?, ?, ?, ?)'
        );

        let totalWords = 0;
        for (const och of outlineChapters) {
          // 将细纲内容格式化为章节正文
          let content = '';
          if (och.brief) content += `## 概要\n${och.brief}\n\n`;
          const keyEvents = (() => { try { return JSON.parse(och.key_events || '[]'); } catch { return []; } })();
          if (keyEvents.length) content += `## 关键事件\n${keyEvents.map((e, i) => `${i + 1}. ${e}`).join('\n')}\n\n`;
          const characters = (() => { try { return JSON.parse(och.characters || '[]'); } catch { return []; } })();
          if (characters.length) content += `## 登场角色\n${characters.join('、')}\n\n`;
          if (och.conflict && och.conflict !== '无') content += `## 冲突推进\n${och.conflict}\n\n`;
          if (och.hook && och.hook !== '无') content += `## 章末钩子\n${och.hook}\n\n`;

          insertChapter.run(
            projectId,
            och.chapter_index,
            och.title,
            content.trim(),
            content.length,
            ''
          );
          totalWords += content.length;
        }

        // 更新总字数
        db.prepare('UPDATE book_project SET total_words = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(totalWords, projectId);
      }
    }

    return projectId;
  })();

  return getProject(result);
}

export function updateProject(id, fields) {
  ensureTable();
  const db = getDb();
  const existing = db.prepare('SELECT * FROM book_project WHERE id = ?').get(id);
  if (!existing) return null;

  const title = fields.title ?? existing.title;
  const description = fields.description ?? existing.description;
  const style = fields.style ?? existing.style;
  const cover_url = fields.cover_url ?? existing.cover_url;
  const status = fields.status ?? existing.status;
  const total_words = fields.total_words ?? existing.total_words;
  const outline = fields.outline ?? existing.outline;
  const style_profile = fields.style_profile ?? existing.style_profile;

  db.prepare(
    'UPDATE book_project SET title=?, description=?, style=?, cover_url=?, status=?, total_words=?, outline=?, style_profile=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
  ).run(title, description, style, cover_url, status, total_words, outline, style_profile, id);
  return getProject(id);
}

export function deleteProject(id) {
  ensureTable();
  return getDb().prepare('DELETE FROM book_project WHERE id = ?').run(id);
}
