import { getDb } from '../models/database.js';

export function getNewsSources() {
  return {
    date: new Date().toISOString().slice(0, 10),
    sources: getDb()
      .prepare('SELECT name, source_key AS value, icon FROM news_source ORDER BY id ASC')
      .all(),
  };
}

export function getNewsDates({ source, limit = 7 }) {
  const rows = getDb()
    .prepare(`
      SELECT DISTINCT news_date
      FROM hot_news
      WHERE source = ?
      ORDER BY news_date DESC
      LIMIT ?
    `)
    .all(source, Number(limit));

  return {
    source,
    latest_date: rows[0]?.news_date || '',
    dates: rows.map((row) => row.news_date),
  };
}

export function getHotNews({ source, date = '', limit = 100 }) {
  const newsDate =
    date ||
    getDb()
      .prepare('SELECT news_date FROM hot_news WHERE source = ? ORDER BY news_date DESC LIMIT 1')
      .get(source)?.news_date;

  if (!newsDate) {
    return {
      date: '',
      items: [],
    };
  }

  const items = getDb()
    .prepare(`
      SELECT id, news_date AS crawl_date, row_number() OVER (ORDER BY hot_index DESC, id ASC) AS rank,
             source, title, url, hot_index
      FROM hot_news
      WHERE source = ? AND news_date = ?
      ORDER BY hot_index DESC, id ASC
      LIMIT ?
    `)
    .all(source, newsDate, Number(limit));

  return {
    date: newsDate,
    items,
  };
}
