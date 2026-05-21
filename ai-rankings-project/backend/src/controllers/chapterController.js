import * as chapterService from '../services/chapterService.js';

function handleError(err, res) {
  console.error('[CHAPTER]', err.message);
  res.status(500).json({ code: 500, message: err.message });
}

export function list(req, res) {
  try { res.json(chapterService.listChapters(Number(req.params.projectId))); } catch (err) { handleError(err, res); }
}

export function detail(req, res) {
  try {
    const c = chapterService.getChapter(Number(req.params.id));
    if (!c) return res.status(404).json({ code: 404, message: 'Chapter not found' });
    res.json(c);
  } catch (err) { handleError(err, res); }
}

export function create(req, res) {
  try {
    const { project_id, chapter_index } = req.body;
    if (!project_id) return res.status(400).json({ code: 400, message: 'project_id required' });
    if (chapter_index === undefined) return res.status(400).json({ code: 400, message: 'chapter_index required' });
    res.json(chapterService.createChapter(req.body));
  } catch (err) { handleError(err, res); }
}

export function update(req, res) {
  try {
    const c = chapterService.updateChapter(Number(req.params.id), req.body);
    if (!c) return res.status(404).json({ code: 404, message: 'Chapter not found' });
    res.json(c);
  } catch (err) { handleError(err, res); }
}

export function remove(req, res) {
  try {
    const r = chapterService.deleteChapter(Number(req.params.id));
    if (r.changes === 0) return res.status(404).json({ code: 404, message: 'Chapter not found' });
    res.json({ success: true });
  } catch (err) { handleError(err, res); }
}
