import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import config from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db = null;

export function getDb() {
  if (!db) {
    db = new Database(config.dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function initDb() {
  const db = getDb();
  const schemaPath = join(__dirname, '..', '..', '..', 'database', 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');
  db.exec(schema);
  migrateDb(db);
  console.log('[DB] 数据库初始化完成');
}

function migrateDb(db) {
  const columns = new Set(db.prepare('PRAGMA table_info(book)').all().map((column) => column.name));
  const migrations = [
    ['book_url', "ALTER TABLE book ADD COLUMN book_url TEXT DEFAULT ''"],
    ['read_count', 'ALTER TABLE book ADD COLUMN read_count INTEGER DEFAULT 0'],
    ['selling_points', "ALTER TABLE book ADD COLUMN selling_points TEXT DEFAULT '[]'"],
    ['core_hook', "ALTER TABLE book ADD COLUMN core_hook TEXT DEFAULT ''"],
    ['analysis', "ALTER TABLE book ADD COLUMN analysis TEXT DEFAULT '{}'"],
  ];

  for (const [column, sql] of migrations) {
    if (!columns.has(column)) {
      db.exec(sql);
    }
  }

  // Ensure new tables exist (added after initial schema)
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
  const chapterCols = db.prepare("PRAGMA table_info(book_chapter)").all().map(c => c.name);
  if (!chapterCols.includes('summary')) {
    db.exec("ALTER TABLE book_chapter ADD COLUMN summary TEXT DEFAULT ''");
  }
  if (!chapterCols.includes('generation_state')) {
    db.exec("ALTER TABLE book_chapter ADD COLUMN generation_state TEXT DEFAULT ''");
  }
  if (!chapterCols.includes('repair_history')) {
    db.exec("ALTER TABLE book_chapter ADD COLUMN repair_history TEXT DEFAULT '[]'");
  }

  // 补充 book_project 表的列
  const projectCols = new Set(db.prepare("PRAGMA table_info(book_project)").all().map(c => c.name));
  if (!projectCols.has('outline')) {
    db.exec("ALTER TABLE book_project ADD COLUMN outline TEXT DEFAULT ''");
  }
  if (!projectCols.has('style_profile')) {
    db.exec("ALTER TABLE book_project ADD COLUMN style_profile TEXT DEFAULT ''");
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS quality_report (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      novel_id INTEGER NOT NULL,
      chapter_id INTEGER NOT NULL,
      coherence REAL DEFAULT 0,
      repetition REAL DEFAULT 0,
      pacing REAL DEFAULT 0,
      voice REAL DEFAULT 0,
      engagement REAL DEFAULT 0,
      overall REAL DEFAULT 0,
      issues TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (novel_id) REFERENCES book_project(id) ON DELETE CASCADE,
      FOREIGN KEY (chapter_id) REFERENCES book_chapter(id) ON DELETE CASCADE
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_report (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      novel_id INTEGER NOT NULL,
      chapter_id INTEGER NOT NULL,
      audit_type TEXT NOT NULL,
      overall_score REAL,
      summary TEXT DEFAULT '',
      issues TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (novel_id) REFERENCES book_project(id) ON DELETE CASCADE,
      FOREIGN KEY (chapter_id) REFERENCES book_chapter(id) ON DELETE CASCADE
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_issue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      novel_id INTEGER NOT NULL,
      chapter_id INTEGER NOT NULL,
      audit_report_id INTEGER,
      audit_type TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'medium',
      code TEXT DEFAULT '',
      evidence TEXT DEFAULT '',
      fix_suggestion TEXT DEFAULT '',
      resolved INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (novel_id) REFERENCES book_project(id) ON DELETE CASCADE,
      FOREIGN KEY (chapter_id) REFERENCES book_chapter(id) ON DELETE CASCADE,
      FOREIGN KEY (audit_report_id) REFERENCES audit_report(id) ON DELETE SET NULL
    )
  `);
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
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_prompt (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT DEFAULT '通用',
      tags TEXT DEFAULT '[]',
      author TEXT DEFAULT '',
      usage_count INTEGER DEFAULT 0,
      is_public INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
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
      novel_id INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // --- ai_label + ai_prompt_label tables (xingyuexiezuo alignment) ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_label (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_prompt_label (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prompt_id INTEGER NOT NULL,
      label_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (prompt_id) REFERENCES ai_prompt(id) ON DELETE CASCADE,
      FOREIGN KEY (label_id) REFERENCES ai_label(id) ON DELETE CASCADE,
      UNIQUE(prompt_id, label_id)
    )
  `);
  // Create indexes (safe if already exist from schema.sql)
  const labelIndexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND (name LIKE '%ai_label%' OR name LIKE '%ai_prompt_label%')").all().map(r => r.name);
  if (!labelIndexes.includes('idx_ai_prompt_label_prompt')) db.exec('CREATE INDEX IF NOT EXISTS idx_ai_prompt_label_prompt ON ai_prompt_label(prompt_id)');
  if (!labelIndexes.includes('idx_ai_prompt_label_label')) db.exec('CREATE INDEX IF NOT EXISTS idx_ai_prompt_label_label ON ai_prompt_label(label_id)');
  if (!labelIndexes.includes('idx_ai_label_parent')) db.exec('CREATE INDEX IF NOT EXISTS idx_ai_label_parent ON ai_label(parent_id)');

  // --- AI 多厂商配置表（替代旧的 ai_config） ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_provider (
      provider TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      api_key TEXT DEFAULT '',
      model TEXT DEFAULT '',
      api_base TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      is_builtin INTEGER DEFAULT 0,
      reasoning_enabled INTEGER DEFAULT 1,
      concurrency_limit INTEGER DEFAULT 0,
      request_interval_ms INTEGER DEFAULT 0,
      models_json TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 迁移：为已有的 ai_provider 表补充 models_json 列
  try {
    const cols = db.prepare("PRAGMA table_info('ai_provider')").all().map(c => c.name);
    if (!cols.includes('models_json')) {
      db.exec("ALTER TABLE ai_provider ADD COLUMN models_json TEXT DEFAULT ''");
      console.log('[DB] ai_provider 添加 models_json 列');
    }
  } catch { /* ignore */ }

  // --- AI 模型路由表 ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_model_route (
      task_type TEXT PRIMARY KEY,
      provider TEXT NOT NULL DEFAULT 'deepseek',
      model TEXT NOT NULL DEFAULT 'deepseek-v4-flash',
      temperature REAL DEFAULT 0.7,
      max_tokens INTEGER DEFAULT 4096,
      request_protocol TEXT DEFAULT 'auto',
      structured_format TEXT DEFAULT 'auto',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS chapter_snapshot (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chapter_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      word_count INTEGER DEFAULT 0,
      label TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chapter_id) REFERENCES book_chapter(id) ON DELETE CASCADE
    )
  `);

  // 迁移旧 ai_config 数据到新 ai_provider 表
  try {
    const oldConfig = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ai_config'").get();
    if (oldConfig) {
      const oldRow = db.prepare('SELECT * FROM ai_config WHERE id = 1').get();
      if (oldRow) {
        const existing = db.prepare('SELECT provider FROM ai_provider WHERE provider = ?').get(oldRow.provider || 'deepseek');
        if (!existing) {
          db.prepare(`
            INSERT INTO ai_provider (provider, display_name, api_key, model, api_base, is_active, is_builtin, reasoning_enabled, updated_at)
            VALUES (?, ?, ?, ?, ?, 1, ?, 1, CURRENT_TIMESTAMP)
          `).run(
            oldRow.provider || 'deepseek',
            oldRow.provider || 'deepseek',
            oldRow.api_key || '',
            oldRow.model || 'deepseek-v4-flash',
            oldRow.api_base || 'https://api.deepseek.com/v1',
            oldRow.provider === 'deepseek' ? 1 : 0,
          );
          console.log('[DB] 已将旧 ai_config 迁移到 ai_provider 表');
        }
      }
    }
  } catch (e) {
    console.log('[DB] ai_config 迁移跳过:', e.message);
  }

  // Seed labels if empty
  const labelCount = db.prepare('SELECT COUNT(*) as c FROM ai_label').get();
  if (labelCount.c === 0) {
    const seedLabels = [
      [1, '平台', 0, 10],
      [2, '功能', 0, 20],
      [3, '质量', 0, 30],
      // platform labels
      [8, '番茄', 1, 1],
      [9, '起点', 1, 2],
      [6, '知平', 1, 3],
      [10, '小程序风', 1, 4],
      // function labels
      [11, '正文', 2, 1],
      [12, '润色', 2, 2],
      [13, '设定', 2, 3],
      [14, '创意', 2, 4],
      [15, '剧情', 2, 5],
      [16, '人设', 2, 6],
      [17, '短剧', 2, 7],
      // quality labels
      [18, '降AI率', 3, 1],
      [19, '精修', 3, 2],
      [20, '审稿', 3, 3],
    ];
    const insertLabel = db.prepare('INSERT OR IGNORE INTO ai_label (id, name, parent_id, sort_order) VALUES (?, ?, ?, ?)');
    for (const [id, name, parent_id, sort_order] of seedLabels) {
      insertLabel.run(id, name, parent_id, sort_order);
    }
    
    // Auto-link existing prompts to labels based on their category field
    const prompts = db.prepare('SELECT id, category FROM ai_prompt').all();
    const categoryToLabel = {
      '番茄': 8, '起点': 9, '知乎': 6, '小程序风': 10,
      '正文': 11, '润色': 12, '设定': 13, '创意': 14,
      '剧情': 15, '人设': 16, '短剧': 17,
      '通用': null,
    };
    const insertPL = db.prepare('INSERT OR IGNORE INTO ai_prompt_label (prompt_id, label_id) VALUES (?, ?)');
    const insertMany = db.transaction((rows) => {
      for (const [prompt_id, label_id] of rows) {
        insertPL.run(prompt_id, label_id);
      }
    });
    const rows = [];
    for (const p of prompts) {
      const labelId = categoryToLabel[p.category];
      if (labelId) {
        rows.push([p.id, labelId]);
      }
    }
    if (rows.length) insertMany(rows);
    
    console.log('[DB] 已初始化 ' + seedLabels.length + ' 个标签，' + rows.length + ' 条提示词关联');
    // Ensure 番茄 prompts are public + link 降AI/精修/审稿 keywords
    db.prepare('UPDATE ai_prompt SET is_public=1 WHERE id IN (SELECT pl.prompt_id FROM ai_prompt_label pl WHERE pl.label_id=8)').run();
    // Link prompts with matching keywords to quality labels
    const kwLinks = {18: '%降AI%', 19: '%精修%', 20: '%审稿%'};
    const insLink = db.prepare('INSERT OR IGNORE INTO ai_prompt_label (prompt_id, label_id) VALUES (?, ?)');
    let kwLinked = 0;
    for (const [lid, kw] of Object.entries(kwLinks)) {
      const matching = db.prepare('SELECT id FROM ai_prompt WHERE (title LIKE ? OR content LIKE ?)').all(kw, kw);
      for (const {id} of matching) { const r = insLink.run(id, Number(lid)); if (r.changes) kwLinked++; }
    }
    console.log('[DB] 关键词链接提示词: ' + kwLinked + ' 条');
  }

  
  // --- Fix is_public for 番茄 prompts + link quality labels (runs every startup)
  const tomatoPublic = db.prepare('SELECT COUNT(*) as c FROM ai_prompt p INNER JOIN ai_prompt_label pl ON pl.prompt_id=p.id WHERE pl.label_id=8 AND p.is_public=0').get();
  if (tomatoPublic.c > 0) {
    db.prepare('UPDATE ai_prompt SET is_public=1 WHERE id IN (SELECT pl.prompt_id FROM ai_prompt_label pl WHERE pl.label_id=8)').run();
    console.log('[DB] 已修复 ' + tomatoPublic.c + ' 条番茄提示词的公开状态');
  }
  const kwLinks = {18: '%降AI%', 19: '%精修%', 20: '%审稿%'};
  const insLink = db.prepare('INSERT OR IGNORE INTO ai_prompt_label (prompt_id, label_id) VALUES (?, ?)');
  let kwLinked = 0;
  for (const [lid, kw] of Object.entries(kwLinks)) {
    const matching = db.prepare('SELECT id FROM ai_prompt WHERE (title LIKE ? OR content LIKE ?)').all(kw, kw);
    for (const {id} of matching) { const r = insLink.run(id, Number(lid)); if (r.changes) kwLinked++; }
  }
  if (kwLinked > 0) console.log('[DB] 关键词链接提示词: ' + kwLinked + ' 条');

// Ensure new rank types exist without requiring a full re-seed
  const newRankTypes = [
    ['male_reading', '男频阅读榜', 'fire-o', 7],
    ['female_reading', '女频阅读榜', 'star-o', 8],
  ];
  const insertRank = db.prepare(
    'INSERT OR IGNORE INTO rank_type (type_key, label, icon, sort_order) VALUES (?, ?, ?, ?)'
  );
  for (const rt of newRankTypes) {
    insertRank.run(...rt);
  }
}
