import * as characterService from '../services/characterService.js';

function handleError(err, res) {
  console.error('[CHARACTER]', err.message);
  res.status(500).json({ code: 500, status: 'error', message: err.message, data: {} });
}

export function list(req, res) {
  try {
    const { keyword = '', limit = 100, offset = 0 } = req.query;
    res.json(characterService.listCharacters({ keyword, limit: Number(limit), offset: Number(offset) }));
  } catch (err) { handleError(err, res); }
}

export function detail(req, res) {
  try {
    const char = characterService.getCharacter(Number(req.params.id));
    if (!char) return res.status(404).json({ code: 404, message: 'Character not found' });
    res.json(char);
  } catch (err) { handleError(err, res); }
}

export function create(req, res) {
  try {
    if (!req.body.name?.trim()) {
      return res.status(400).json({ code: 400, message: 'name is required' });
    }
    res.json(characterService.createCharacter(req.body));
  } catch (err) { handleError(err, res); }
}

export function update(req, res) {
  try {
    const char = characterService.updateCharacter(Number(req.params.id), req.body);
    if (!char) return res.status(404).json({ code: 404, message: 'Character not found' });
    res.json(char);
  } catch (err) { handleError(err, res); }
}

export function remove(req, res) {
  try {
    const result = characterService.deleteCharacter(Number(req.params.id));
    if (result.changes === 0) return res.status(404).json({ code: 404, message: 'Character not found' });
    res.json({ success: true });
  } catch (err) { handleError(err, res); }
}
