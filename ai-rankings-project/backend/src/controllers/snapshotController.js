import * as snapshotService from '../services/snapshotService.js';

function handleError(err, res) {
  console.error('[SNAPSHOT]', err.message);
  const status = err.message.includes('不存在') ? 404 : 500;
  res.status(status).json({ code: status, status: 'error', message: err.message, data: {} });
}

export async function create(req, res) {
  try {
    const chapterId = parseInt(req.params.chapterId, 10);
    const { content, word_count, label } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ code: 400, message: 'content is required' });
    }
    const result = snapshotService.createSnapshot(chapterId, {
      content: content.trim(),
      word_count: word_count || 0,
      label: label || '',
    });
    res.json(result);
  } catch (err) { handleError(err, res); }
}

export async function list(req, res) {
  try {
    const chapterId = parseInt(req.params.chapterId, 10);
    const snapshots = snapshotService.getSnapshotsByChapterId(chapterId);
    res.json(snapshots);
  } catch (err) { handleError(err, res); }
}

export async function restore(req, res) {
  try {
    const chapterId = parseInt(req.params.chapterId, 10);
    const snapshotId = parseInt(req.params.snapshotId, 10);
    const result = snapshotService.restoreSnapshot(chapterId, snapshotId);
    res.json(result);
  } catch (err) { handleError(err, res); }
}

export async function remove(req, res) {
  try {
    const snapshotId = parseInt(req.params.snapshotId, 10);
    const result = snapshotService.deleteSnapshot(snapshotId);
    res.json(result);
  } catch (err) { handleError(err, res); }
}
