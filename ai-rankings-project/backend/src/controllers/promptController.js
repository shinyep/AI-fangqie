import * as promptService from '../services/promptService.js';

function handleError(err, res) {
  console.error('[PROMPT]', err.message);
  res.status(500).json({ code: 500, status: 'error', message: err.message, data: {} });
}

export function categories(req, res) {
  try {
    res.json(promptService.getCategories());
  } catch (err) { handleError(err, res); }
}

export function list(req, res) {
  try {
    const { category = '', keyword = '', label_id = 0, limit = 50, offset = 0 } = req.query;
    res.json(promptService.listPrompts({
      category,
      keyword,
      label_id: Number(label_id) || 0,
      limit: Number(limit),
      offset: Number(offset),
    }));
  } catch (err) { handleError(err, res); }
}

export function detail(req, res) {
  try {
    const prompt = promptService.getPrompt(Number(req.params.id));
    if (!prompt) return res.status(404).json({ code: 404, message: 'Prompt not found' });
    res.json(prompt);
  } catch (err) { handleError(err, res); }
}

export function create(req, res) {
  try {
    const { title, content, category, tags, is_public } = req.body;
    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({ code: 400, message: 'title and content are required' });
    }
    const prompt = promptService.createPrompt({
      title: title.trim(),
      content: content.trim(),
      category: category || '通用工具',
      tags: tags || [],
      author: req.body.author || '',
      is_public: is_public !== undefined ? is_public : 1,
    });
    res.json(prompt);
  } catch (err) { handleError(err, res); }
}

export function update(req, res) {
  try {
    const prompt = promptService.updatePrompt(Number(req.params.id), req.body);
    if (!prompt) return res.status(404).json({ code: 404, message: 'Prompt not found' });
    res.json(prompt);
  } catch (err) { handleError(err, res); }
}

export function favorite(req, res) {
  try {
    const prompt = promptService.toggleFavorite(Number(req.params.id));
    if (!prompt) return res.status(404).json({ code: 404, message: 'Prompt not found' });
    res.json(prompt);
  } catch (err) { handleError(err, res); }
}

export function remove(req, res) {
  try {
    const result = promptService.deletePrompt(Number(req.params.id));
    if (result.changes === 0) return res.status(404).json({ code: 404, message: 'Prompt not found' });
    res.json({ success: true });
  } catch (err) { handleError(err, res); }
}
