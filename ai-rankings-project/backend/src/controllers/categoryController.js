import { getDb } from '../models/database.js';

function buildTree(rows, parentId = 0) {
  return rows
    .filter((row) => row.parent_id === parentId)
    .map((row) => ({
      id: row.id,
      name: row.name,
      children: buildTree(rows, row.id),
    }));
}

export function categories(req, res) {
  const rows = getDb()
    .prepare('SELECT id, name, parent_id FROM ai_category ORDER BY parent_id ASC, sort_order ASC, id ASC')
    .all();
  res.json(buildTree(rows));
}

export function tags(req, res) {
  categories(req, res);
}

export async function labels(req, res) {
  try {
    const { getLabelTree } = await import('../services/labelService.js');
    res.json(getLabelTree());
  } catch (err) {
    console.error('[LABEL]', err.message);
    res.json([]);
  }
}