import * as svc from '../services/outlineSaveService.js';

export async function save(req, res) {
  try {
    const { book_id, chapter_index, chapter_title, outline_data } = req.body;
    if (!book_id || chapter_index == null || !outline_data) return res.status(400).json({ code: 400, message: 'book_id, chapter_index, outline_data required' });
    const result = svc.saveOutline({ book_id, chapter_index, chapter_title, outline_data });
    res.json(result);
  } catch (e) { console.error(e); res.status(500).json({ code: 500, message: e.message }); }
}

export function list(req, res) {
  try {
    const bookId = Number(req.params.bookId);
    if (!bookId) return res.status(400).json({ code: 400, message: 'bookId required' });
    res.json(svc.listOutlines(bookId));
  } catch (e) { console.error(e); res.status(500).json({ code: 500, message: e.message }); }
}

export function remove(req, res) {
  try {
    const id = Number(req.params.id);
    svc.deleteOutline(id);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ code: 500, message: e.message }); }
}
