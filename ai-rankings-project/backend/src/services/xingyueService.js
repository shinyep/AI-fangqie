import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { decrypt } from '../utils/crypto.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CONFIG_PATH = join(__dirname, '..', '..', 'xingyue_config.json');

const XINGYUE_BASE = 'https://c.xingyuexiezuo.com/api';
const FANQIE_ORIGIN = 'https://fanqienovel.com';
export const XINGYUE_RANK_TYPES = ['male_reading', 'female_reading'];

export function isXingyueRankType(rankType) {
  return XINGYUE_RANK_TYPES.includes(rankType);
}

function loadConfig() {
  if (!existsSync(CONFIG_PATH)) return { api_base: XINGYUE_BASE, token: '', expires_at: 0 };
  return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
}

let _config = null;
function getConfig() {
  if (!_config) _config = loadConfig();
  return _config;
}

export function getToken() {
  return getConfig().token;
}

export function setToken(token, expiresAt) {
  const config = getConfig();
  config.token = token;
  config.expires_at = expiresAt;
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
  _config = config;
}

function decryptXingyueResponse(body) {
  if (body?.data?.encoded) {
    return decrypt(body.data.encoded);
  }
  return body;
}

async function callXingyueApi(endpoint, params = {}) {
  const token = getToken();
  const url = `${XINGYUE_BASE}${endpoint}?${new URLSearchParams(params)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: token,
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  if (response.status === 401) {
    throw new Error('XINGYUE_TOKEN_EXPIRED');
  }
  if (!response.ok) {
    throw new Error(`xingyue API error: ${response.status}`);
  }

  const body = await response.json();
  return decryptXingyueResponse(body);
}

function inferSellingPoints(abstract, subcategory) {
  const source = `${abstract || ''} ${subcategory || ''}`;
  const points = [];
  const rules = [
    ['系统', '系统流'],
    ['重生', '重生逆袭'],
    ['穿越', '穿越开局'],
    ['游戏', '游戏入侵'],
    ['悬疑', '悬疑惊悚'],
    ['末日', '末日生存'],
    ['修仙', '修仙升级'],
    ['神明', '神明设定'],
    ['高武', '都市高武'],
  ];
  for (const [keyword, label] of rules) {
    if (source.includes(keyword) && !points.includes(label)) {
      points.push(label);
    }
  }
  return points.length ? points.slice(0, 3) : ['高热题材', '强设定', '追读潜力'];
}

function normalizeStatus(value) {
  if (value === '已完结' || String(value) === '1') return 'finished';
  return 'serial';
}

function mapXingyueBook(item, rankType, index) {
  const sellingPoints = inferSellingPoints(item.abstract, item.subcategory);
  return {
    id: item.id || item.book_id || `${rankType}_${index}`,
    title: item.book_name || item.title || '',
    author: item.author || '',
    intro: item.abstract || item.intro || '',
    cover_url: item.cover_url || '',
    book_url: item.book_id ? `${FANQIE_ORIGIN}/page/${item.book_id}` : '',
    word_count: Number(item.word_count) || 0,
    read_count: Number(item.read_count) || 0,
    status: normalizeStatus(item.status),
    rank_type: rankType,
    subcategory: item.subcategory || '热门',
    platform: 'fanqie',
    rank_position: Number(item.rank_position) || (index + 1),
    heat_score: Number(item.read_count) || Number(item.word_count) || 0,
    tags: [item.subcategory || '热门', ...sellingPoints],
    selling_points: sellingPoints,
    core_hook: sellingPoints.join(' · '),
    analysis: item.ai_analysis || {},
    chapters_collected: Number(item.chapters_collected) || 0,
    paid_chapters_count: Number(item.paid_chapters_count) || 0,
    updated_at: item.updated_at || '',
  };
}

// --- Public API ---

export async function fetchRankingsTotal({ rankType, page = 1, perPage = 30, platform = 'fanqie' }) {
  const data = await callXingyueApi('/v1/ai-rankings/total', {
    rank_type: rankType,
    page,
    per_page: perPage,
    platform,
  });
  const items = (data?.data || data || []).map((item, i) =>
    mapXingyueBook(item, rankType, (page - 1) * perPage + i)
  );
  return { items, total: data?.total || items.length, page: data?.current_page || page, per_page: perPage };
}

export async function fetchCategories({ rankType, platform = 'fanqie' }) {
  const data = await callXingyueApi('/v1/ai-rankings/categories', { rank_type: rankType, platform });
  const list = Array.isArray(data) ? data : (data?.data || []);
  return list.map(c => ({
    subcategory: c.name || c.value || c.subcategory || '',
    book_count: c.book_count || 0,
    read_count: c.read_count || 0,
  }));
}

export async function fetchCategoryTotals({ rankType, platform = 'fanqie' }) {
  const data = await callXingyueApi('/v1/ai-rankings/category-totals', { rank_type: rankType, platform });
  return Array.isArray(data) ? data : (data?.data || []);
}

export async function fetchHotWords({ rankType, subcategory = '', platform = 'fanqie', limit = 20 }) {
  const params = { rank_type: rankType, subcategory, platform, limit };
  if (!subcategory) delete params.subcategory;
  const data = await callXingyueApi('/v1/ai-rankings/hot-words', params);
  return Array.isArray(data) ? data : (data?.hot_words || data?.data || []);
}

export async function fetchInspiration({ rankType, subcategory = '' }) {
  const params = { rank_type: rankType };
  if (subcategory) params.subcategory = subcategory;
  const data = await callXingyueApi('/v1/ai-rankings/inspiration', params);
  return Array.isArray(data) ? data : (data?.data || []);
}

export async function fetchBooksByIds({ ids, rankType, platform = 'fanqie' }) {
  const idSet = new Set(ids.split(',').map(s => s.trim()).filter(Boolean));
  if (idSet.size === 0) return [];

  const results = [];
  const maxPages = 10;
  const perPage = 100;
  for (let page = 1; page <= maxPages; page++) {
    const { items } = await fetchRankingsTotal({ rankType, page, perPage, platform });
    for (const book of items) {
      if (idSet.has(String(book.id))) {
        results.push(book);
        if (results.length >= idSet.size) return results;
      }
    }
    if (items.length < perPage) break;
  }
  return results;
}

export async function searchBooks({ rankType, keyword, limit = 100, platform = 'fanqie' }) {
  const kw = keyword.toLowerCase();
  const results = [];
  for (let page = 1; page <= 5; page++) {
    const { items } = await fetchRankingsTotal({ rankType, page, perPage: 30, platform });
    for (const book of items) {
      if (
        (book.title && book.title.toLowerCase().includes(kw)) ||
        (book.author && book.author.toLowerCase().includes(kw)) ||
        (book.intro && book.intro.toLowerCase().includes(kw))
      ) {
        results.push(book);
        if (results.length >= limit) return { items: results, total: results.length, page: 1, per_page: limit };
      }
    }
    if (items.length < 30) break;
  }
  return { items: results, total: results.length, page: 1, per_page: limit };
}

export async function fetchLiveData({ rankType, limit = 20, platform = 'fanqie' }) {
  const [rankResult, categories] = await Promise.all([
    fetchRankingsTotal({ rankType, page: 1, perPage: limit, platform }),
    fetchCategories({ rankType, platform }),
  ]);
  // Hot words are per-category on xingyue; use first category if available
  let hotWords = [];
  if (categories.length > 0) {
    hotWords = await fetchHotWords({ rankType, subcategory: categories[0].subcategory, limit, platform });
  }
  return {
    books: rankResult.items,
    categories,
    words: hotWords,
    total: rankResult.total,
    source: 'xingyue',
  };
}
