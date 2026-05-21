import * as wordCardService from '../services/wordCardService.js';

function handleError(err, res) {
  console.error('[WORDCARD]', err.message);
  res.status(500).json({ code: 500, message: err.message });
}

export function list(req, res) {
  try {
    const { card_type = '', keyword = '', limit = 100 } = req.query;
    res.json(wordCardService.listCards({ card_type, keyword, limit: Number(limit) }));
  } catch (err) { handleError(err, res); }
}

export function types(req, res) {
  try { res.json(wordCardService.getCardTypes()); } catch (err) { handleError(err, res); }
}

export function detail(req, res) {
  try {
    const c = wordCardService.getCard(Number(req.params.id));
    if (!c) return res.status(404).json({ code: 404, message: 'Card not found' });
    res.json(c);
  } catch (err) { handleError(err, res); }
}

export function create(req, res) {
  try {
    if (!req.body.name?.trim() || !req.body.content?.trim()) return res.status(400).json({ code: 400, message: 'name and content required' });
    res.json(wordCardService.createCard(req.body));
  } catch (err) { handleError(err, res); }
}

export function update(req, res) {
  try {
    const c = wordCardService.updateCard(Number(req.params.id), req.body);
    if (!c) return res.status(404).json({ code: 404, message: 'Card not found' });
    res.json(c);
  } catch (err) { handleError(err, res); }
}

export function remove(req, res) {
  try {
    const r = wordCardService.deleteCard(Number(req.params.id));
    if (r.changes === 0) return res.status(404).json({ code: 404, message: 'Card not found' });
    res.json({ success: true });
  } catch (err) { handleError(err, res); }
}
