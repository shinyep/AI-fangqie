import { getDb } from '../models/database.js';
import { decodePuaText } from './fontDecoder.js';

const FANQIE_LIBRARY_API = 'https://fanqienovel.com/api/author/library/book_list/v/';
const FANQIE_ORIGIN = 'https://fanqienovel.com';

const DEFAULT_QUERY = {
  page_count: 20,
  page_index: 0,
  gender: -1,
  category_id: -1,
  creation_status: -1,
  word_count: -1,
  book_type: -1,
  sort: 0,
};

function normalizeStatus(value) {
  return Number(value) === 0 ? 'serial' : 'finished';
}

function parseChineseCount(value) {
  if (typeof value === 'number') return value;
  if (!value) return 0;

  const normalized = String(value)
    .replace(/人在读/g, '')
    .trim();
  const numeric = Number.parseFloat(normalized);
  if (Number.isNaN(numeric)) return 0;
  if (String(value).includes('万')) return Math.round(numeric * 10000);
  return Math.round(numeric);
}

function inferSellingPoints(book) {
  const source = `${book.abstract || ''} ${book.category || ''}`;
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

function normalizeBook(raw, index, rankType) {
  const bookId = raw.book_id || raw.bookId || '';
  const rawTitle = raw.book_name || raw.bookName || '';
  const title = decodePuaText(rawTitle) || `番茄小说 ${index + 1}`;
  const subcategory = decodePuaText(raw.category || raw.category_name || raw.tags?.[0] || '番茄热门');
  const rawIntro = raw.abstract || '';
  const intro = decodePuaText(rawIntro);
  const rawAuthor = raw.author || '';
  const author = decodePuaText(rawAuthor);
  const readCount = parseChineseCount(raw.read_count);
  const wordCount = parseChineseCount(raw.word_count);
  const sellingPoints = inferSellingPoints({ ...raw, category: subcategory, abstract: intro });
  const bookUrl = bookId ? `${FANQIE_ORIGIN}/page/${bookId}` : FANQIE_ORIGIN;

  return {
    title,
    author,
    cover_url: raw.thumb_url || '',
    book_url: bookUrl,
    intro,
    word_count: wordCount,
    read_count: readCount,
    status: normalizeStatus(raw.creation_status),
    rank_type: rankType,
    subcategory,
    platform: 'fanqie',
    rank_position: index + 1,
    heat_score: readCount || wordCount || 0,
    tags: [subcategory, ...sellingPoints],
    selling_points: sellingPoints,
    core_hook: sellingPoints.join(' · '),
    analysis: {
      source: 'fanqienovel.com/library',
      book_id: bookId,
      audience: subcategory,
      opening: intro ? `已解析简介: ${intro.slice(0, 120)}...` : '暂无简介',
      write_tip: `${subcategory}题材可重点观察标题承诺、前三章目标和章末追读点。`,
    },
  };
}

async function requestFanqieLibrary(query) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...DEFAULT_QUERY, ...query })) {
    params.set(key, String(value));
  }

  const response = await fetch(`${FANQIE_LIBRARY_API}?${params.toString()}`, {
    headers: {
      accept: 'application/json, text/plain, */*',
      referer: `${FANQIE_ORIGIN}/library`,
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`fanqie request failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  if (payload.code !== 0) {
    throw new Error(payload.message || 'fanqie response failed');
  }

  return payload.data || {};
}

function saveBooks(books) {
  const db = getDb();
  const clearRank = db.prepare('DELETE FROM book WHERE platform = ? AND rank_type = ?');
  const insertBook = db.prepare(`
    INSERT INTO book (
      title, author, cover_url, book_url, intro, word_count, read_count, status,
      rank_type, subcategory, platform, rank_position, heat_score, tags,
      selling_points, core_hook, analysis
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    if (books.length) {
      clearRank.run('fanqie', books[0].rank_type);
    }
    for (const book of books) {
      insertBook.run(
        book.title,
        book.author,
        book.cover_url,
        book.book_url,
        book.intro,
        book.word_count,
        book.read_count,
        book.status,
        book.rank_type,
        book.subcategory,
        book.platform,
        book.rank_position,
        book.heat_score,
        JSON.stringify(book.tags),
        JSON.stringify(book.selling_points),
        book.core_hook,
        JSON.stringify(book.analysis),
      );
    }
  })();
}

export async function crawlFanqieLibrary({ pageCount = 20, pageIndex = 0, sort = 0, rankType = 'hot' } = {}) {
  const data = await requestFanqieLibrary({
    page_count: Math.min(Math.max(Number(pageCount) || 20, 1), 50),
    page_index: Math.max(Number(pageIndex) || 0, 0),
    sort: Number(sort) || 0,
  });
  const rawBooks = data.book_list || [];
  const books = rawBooks.map((book, index) => normalizeBook(book, index, rankType));
  saveBooks(books);

  return {
    source: 'fanqie',
    total: data.total_count || books.length,
    saved: books.length,
    books,
  };
}

export async function fetchLiveRankings({ rankType = 'hot', limit = 20 } = {}) {
  const sortMap = {
    hot: 0,
    new: 1,
    finished: 2,
    recommend: 3,
    click: 4,
    collect: 5,
  };

  const sort = sortMap[rankType] ?? 0;
  const data = await requestFanqieLibrary({
    page_count: Math.min(Math.max(Number(limit) || 20, 1), 50),
    page_index: 0,
    sort,
  });

  const rawBooks = data.book_list || [];
  const books = rawBooks.map((book, index) => {
    const item = normalizeBook(book, index, rankType);
    item.id = item.analysis?.book_id || `live_${rankType}_${index}`;
    return item;
  });

  // 聚合分类统计
  const categoryMap = new Map();
  for (const book of books) {
    const sub = book.subcategory || '其他';
    if (!categoryMap.has(sub)) {
      categoryMap.set(sub, { subcategory: sub, book_count: 0, read_count: 0 });
    }
    const entry = categoryMap.get(sub);
    entry.book_count += 1;
    entry.read_count += book.read_count || 0;
  }
  const categories = Array.from(categoryMap.values())
    .sort((a, b) => b.read_count - a.read_count || b.book_count - a.book_count);

  // 从标签中提取热词
  const wordFreq = new Map();
  for (const book of books) {
    const words = [...(book.tags || []), ...(book.selling_points || [])];
    for (const w of words) {
      wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
    }
  }
  const words = Array.from(wordFreq.entries())
    .map(([word, count]) => ({ word, count, rank_type: rankType }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return {
    source: 'fanqie_live',
    total: data.total_count || books.length,
    books,
    categories,
    words,
  };
}