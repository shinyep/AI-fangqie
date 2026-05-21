import { getDb } from '../models/database.js';
import { getHotWords, getRankings } from './rankService.js';

export function getInspirations({ rankType, subcategory = '' }) {
  const where = ['rank_type = ?'];
  const params = [rankType];

  if (subcategory) {
    where.push('subcategory = ?');
    params.push(subcategory);
  }

  const stored = getDb()
    .prepare(`
      SELECT id, title, content, rank_type, subcategory, created_at
      FROM inspiration
      WHERE ${where.join(' AND ')}
      ORDER BY created_at DESC, id ASC
    `)
    .all(...params);

  if (stored.length) {
    return stored;
  }

  const books = getRankings({ rankType, subcategory, limit: 5 });
  const words = getHotWords({ rankType, subcategory, limit: 6 }).map((item) => item.word);
  const keywordText = words.length ? words.join('、') : '强冲突、快节奏、爽点明确';
  const categoryText = subcategory || books[0]?.subcategory || '热门题材';

  return [
    {
      id: 0,
      title: `[${categoryText}] 榜单融合灵感`,
      content: `结合当前${categoryText}榜单的高频元素：${keywordText}。建议主角开局获得清晰目标与即时反馈，用前三章建立冲突、金手指边界和持续期待。`,
      rank_type: rankType,
      subcategory: categoryText,
      created_at: new Date().toISOString(),
    },
  ];
}
