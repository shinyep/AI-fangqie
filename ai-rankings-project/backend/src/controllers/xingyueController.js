import * as xingyueService from '../services/xingyueService.js';

function requireParam(res, value, name) {
  if (value) return true;
  res.status(400).json({
    code: 400,
    status: 'validation.required',
    message: `${name} is required`,
    data: { [name]: ['validation.required'] },
  });
  return false;
}

function handleError(err, res) {
  if (err.message === 'XINGYUE_TOKEN_EXPIRED') {
    return res.status(401).json({ code: 401, status: 'token_expired', message: 'Ai智能写作系统API授权已过期，请更新token', data: {} });
  }
  console.error('[XINGYUE]', err.message);
  res.status(500).json({ code: 500, status: 'error', message: err.message, data: {} });
}

export async function live(req, res) {
  try {
    const { rank_type: rankType = 'male_reading', limit = 20, platform = 'fanqie' } = req.query;
    if (!requireParam(res, rankType, 'rank_type')) return;
    const result = await xingyueService.fetchLiveData({ rankType, limit: Number(limit), platform });
    res.json(result);
  } catch (err) { handleError(err, res); }
}

export async function rankings(req, res) {
  try {
    const { rank_type: rankType, page = 1, per_page: perPage = 30, platform = 'fanqie' } = req.query;
    if (!requireParam(res, rankType, 'rank_type')) return;
    const result = await xingyueService.fetchRankingsTotal({ rankType, page: Number(page), perPage: Number(perPage), platform });
    res.json(result);
  } catch (err) { handleError(err, res); }
}

export async function categories(req, res) {
  try {
    const { rank_type: rankType, platform = 'fanqie' } = req.query;
    if (!requireParam(res, rankType, 'rank_type')) return;
    res.json(await xingyueService.fetchCategories({ rankType, platform }));
  } catch (err) { handleError(err, res); }
}

export async function categoryTotals(req, res) {
  try {
    const { rank_type: rankType, platform = 'fanqie' } = req.query;
    if (!requireParam(res, rankType, 'rank_type')) return;
    res.json(await xingyueService.fetchCategoryTotals({ rankType, platform }));
  } catch (err) { handleError(err, res); }
}

export async function hotWords(req, res) {
  try {
    const { rank_type: rankType, subcategory = '', platform = 'fanqie', limit = 20 } = req.query;
    if (!requireParam(res, rankType, 'rank_type')) return;
    res.json(await xingyueService.fetchHotWords({ rankType, subcategory, platform, limit: Number(limit) }));
  } catch (err) { handleError(err, res); }
}

export async function inspiration(req, res) {
  try {
    const { rank_type: rankType, subcategory = '' } = req.query;
    if (!requireParam(res, rankType, 'rank_type')) return;
    res.json(await xingyueService.fetchInspiration({ rankType, subcategory }));
  } catch (err) { handleError(err, res); }
}

export async function updateConfig(req, res) {
  try {
    const { token, expires_at: expiresAt } = req.body;
    if (!token) {
      return res.status(400).json({ code: 400, message: 'token is required' });
    }
    xingyueService.setToken(token, expiresAt || 0);
    res.json({ success: true });
  } catch (err) { handleError(err, res); }
}
