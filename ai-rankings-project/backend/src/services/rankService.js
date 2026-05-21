import { getDb } from '../models/database.js';

function buildBookQuery({ rankType, subcategory, platform, keyword }) {
  const where = ['b.rank_type = ?', 'b.platform = ?'];
  const params = [rankType, platform];

  if (subcategory) {
    where.push('b.subcategory = ?');
    params.push(subcategory);
  }

  if (keyword) {
    where.push('(b.title LIKE ? OR b.author LIKE ? OR b.intro LIKE ? OR b.subcategory LIKE ?)');
    const likeKeyword = `%${keyword}%`;
    params.push(likeKeyword, likeKeyword, likeKeyword, likeKeyword);
  }

  return { where: where.join(' AND '), params };
}

function normalizeBook(book) {
  return {
    ...book,
    tags: book.tags ? JSON.parse(book.tags) : [],
    selling_points: book.selling_points ? JSON.parse(book.selling_points) : [],
    analysis: book.analysis ? JSON.parse(book.analysis) : {},
  };
}

export function getRankTypes() {
  return getDb()
    .prepare('SELECT type_key, label, icon, sort_order FROM rank_type ORDER BY sort_order ASC')
    .all()
    .map((row) => ({
      ...row,
      source: row.type_key === 'male_reading' || row.type_key === 'female_reading' ? 'xingyue' : 'local',
    }));
}

export function getRankings({ rankType, subcategory = '', limit = 50, platform = 'fanqie' }) {
  const { where, params } = buildBookQuery({ rankType, subcategory, platform });
  const rows = getDb()
    .prepare(`
      SELECT b.*, rt.label AS rank_label
      FROM book b
      JOIN rank_type rt ON rt.type_key = b.rank_type
      WHERE ${where}
      ORDER BY b.rank_position ASC, b.heat_score DESC
      LIMIT ?
    `)
    .all(...params, Number(limit));

  return rows.map(normalizeBook);
}

export function getRankingCategories({ rankType = '', platform = 'fanqie' }) {
  const db = getDb();
  if (rankType) {
    return db
      .prepare(`
        SELECT subcategory, COUNT(*) AS book_count, SUM(read_count) AS read_count
        FROM book
        WHERE rank_type = ? AND platform = ? AND subcategory != ''
        GROUP BY subcategory
        ORDER BY read_count DESC, book_count DESC, subcategory ASC
      `)
      .all(rankType, platform);
  }

  return db
    .prepare(`
      SELECT DISTINCT subcategory
      FROM book
      WHERE platform = ? AND subcategory != ''
      ORDER BY subcategory ASC
    `)
    .all(platform);
}

export function getHotWords({ rankType, subcategory = '', platform = 'fanqie', limit = 20 }) {
  const where = ['rank_type = ?', 'platform = ?'];
  const params = [rankType, platform];

  if (subcategory) {
    where.push('(subcategory = ? OR subcategory = "")');
    params.push(subcategory);
  }

  return getDb()
    .prepare(`
      SELECT word, count, rank_type, subcategory
      FROM hot_word
      WHERE ${where.join(' AND ')}
      ORDER BY count DESC, word ASC
      LIMIT ?
    `)
    .all(...params, Number(limit));
}

export function getBooksByIds({ ids, platform = 'fanqie', sort = '' }) {
  const parsedIds = ids
    .split(',')
    .map((id) => Number(id.trim()))
    .filter(Boolean);

  if (!parsedIds.length) {
    return [];
  }

  const placeholders = parsedIds.map(() => '?').join(',');
  const orderBy = sort === 'heat' ? 'heat_score DESC' : 'rank_position ASC';
  const rows = getDb()
    .prepare(`
      SELECT *
      FROM book
      WHERE id IN (${placeholders}) AND platform = ?
      ORDER BY ${orderBy}
    `)
    .all(...parsedIds, platform);

  return rows.map(normalizeBook);
}

export function getRankingTotal({ rankType, page = 1, perPage = 30, platform = 'fanqie' }) {
  const offset = (Number(page) - 1) * Number(perPage);
  const { where, params } = buildBookQuery({ rankType, platform });
  const db = getDb();
  const total = db.prepare(`SELECT COUNT(*) AS count FROM book b WHERE ${where}`).get(...params).count;
  const items = db
    .prepare(`
      SELECT b.*, rt.label AS rank_label
      FROM book b
      JOIN rank_type rt ON rt.type_key = b.rank_type
      WHERE ${where}
      ORDER BY b.rank_position ASC
      LIMIT ? OFFSET ?
    `)
    .all(...params, Number(perPage), offset)
    .map(normalizeBook);

  return {
    items,
    total,
    page: Number(page),
    per_page: Number(perPage),
  };
}

export function getCategoryTotals({ rankType, platform = 'fanqie' }) {
  return getDb()
    .prepare(`
      SELECT subcategory, COUNT(*) AS total, SUM(read_count) AS read_count
      FROM book
      WHERE rank_type = ? AND platform = ? AND subcategory != ''
      GROUP BY subcategory
      ORDER BY read_count DESC, total DESC, subcategory ASC
    `)
    .all(rankType, platform);
}

export function searchRankings({ rankType, keyword, limit = 100, platform = 'fanqie' }) {
  const { where, params } = buildBookQuery({ rankType, keyword, platform });
  const rows = getDb()
    .prepare(`
      SELECT b.*, rt.label AS rank_label
      FROM book b
      JOIN rank_type rt ON rt.type_key = b.rank_type
      WHERE ${where}
      ORDER BY b.heat_score DESC, b.rank_position ASC
      LIMIT ?
    `)
    .all(...params, Number(limit));

  return rows.map(normalizeBook);
}
