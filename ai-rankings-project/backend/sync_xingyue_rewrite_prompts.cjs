const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const API_BASE = 'https://c.xingyuexiezuo.com/api';
const AES_KEY = Buffer.from('chloefuckityoall');
const AES_IV = Buffer.from('9311019310287172');
const CONFIG_PATH = path.join(__dirname, 'xingyue_config.json');
const DB_PATH = path.join(__dirname, '..', 'database', 'rankings.db');
const REWRITE_TYPE = 4;

function loadToken() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  if (!config.token) throw new Error('xingyue_config.json missing token');
  return config.token;
}

function decryptPayload(encoded) {
  const decipher = crypto.createDecipheriv('aes-128-cbc', AES_KEY, AES_IV);
  let decrypted = decipher.update(encoded, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
}

async function fetchJson(endpoint, params = {}) {
  const token = loadToken();
  const url = new URL(API_BASE + endpoint);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, {
    headers: {
      Authorization: token,
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });
  const body = await response.json();
  if (body.code !== 200) throw new Error(`Xingyue API ${endpoint} failed: ${body.status || body.message || body.code}`);
  return body.data?.encoded ? decryptPayload(body.data.encoded) : body.data;
}

async function fetchRewritePrompts() {
  const items = [];
  for (let page = 1; page <= 100; page += 1) {
    const data = await fetchJson('/v1/shortcuts/recommended', { type: REWRITE_TYPE, page });
    const pageItems = data?.data || [];
    if (!pageItems.length) break;
    items.push(...pageItems);
    if (pageItems.length < Number(data.per_page || 15)) break;
  }
  return items;
}

function normalizeLabels(labels) {
  if (!Array.isArray(labels)) return [];
  return labels.map((label) => {
    if (typeof label === 'string') return label;
    return label.name || label.title || '';
  }).filter(Boolean);
}

function normalizePrompt(item) {
  const title = String(item.name || item.title || '').trim();
  const content = String(item.text || item.content || item.desc || '').trim();
  if (!title || content.length < 10) return null;
  return {
    title,
    content,
    category: '续写要求',
    tags: ['续写要求', ...normalizeLabels(item.labels)],
    author: item.author?.nickname || item.author?.name || item.author || '星月社区',
    usage_count: Number(item.usage || item.hot || 0) || 0,
    favorite_count: Number(item.collect_count || item.favorite_count || 0) || 0,
    is_public: 1,
  };
}

function ensurePromptTable(db) {
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
}

function upsertPrompts(prompts) {
  const db = new Database(DB_PATH);
  ensurePromptTable(db);
  const findByTitle = db.prepare('SELECT id FROM ai_prompt WHERE title = ?');
  const insertPrompt = db.prepare(`
    INSERT INTO ai_prompt (title, content, category, tags, author, usage_count, favorite_count, is_public)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const updatePrompt = db.prepare(`
    UPDATE ai_prompt
    SET content = ?, category = ?, tags = ?, author = ?, usage_count = ?, favorite_count = ?, is_public = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  let inserted = 0;
  let updated = 0;
  const write = db.transaction((rows) => {
    rows.forEach((prompt) => {
      const existing = findByTitle.get(prompt.title);
      const tags = JSON.stringify([...new Set(prompt.tags)], null, 0);
      if (existing) {
        updatePrompt.run(prompt.content, prompt.category, tags, prompt.author, prompt.usage_count, prompt.favorite_count, prompt.is_public, existing.id);
        updated += 1;
      } else {
        insertPrompt.run(prompt.title, prompt.content, prompt.category, tags, prompt.author, prompt.usage_count, prompt.favorite_count, prompt.is_public);
        inserted += 1;
      }
    });
  });
  write(prompts);
  const totalRewrite = db.prepare('SELECT COUNT(*) AS c FROM ai_prompt WHERE category = ?').get('续写要求').c;
  const totalAll = db.prepare('SELECT COUNT(*) AS c FROM ai_prompt').get().c;
  db.close();
  return { inserted, updated, totalRewrite, totalAll };
}

(async () => {
  const raw = await fetchRewritePrompts();
  const prompts = raw.map(normalizePrompt).filter(Boolean);
  const result = upsertPrompts(prompts);
  console.log(JSON.stringify({ fetched: raw.length, valid: prompts.length, ...result }, null, 2));
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
