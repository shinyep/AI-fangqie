import {
  getBooksByIds,
  getCategoryTotals,
  getHotWords,
  getRankingCategories,
  getRankings,
  getRankingTotal,
  getRankTypes,
  searchRankings,
} from '../services/rankService.js';
import { getInspirations } from '../services/inspirationService.js';
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

function isXingyueType(rankType) {
  return xingyueService.isXingyueRankType(rankType);
}

function handleXingyueError(err, res) {
  if (err.message === 'XINGYUE_TOKEN_EXPIRED') {
    return res.status(401).json({ code: 401, status: 'token_expired', message: 'Token expired', data: {} });
  }
  console.error('[XINGYUE]', err.message);
  return false;
}

export function rankTypes(req, res) {
  res.json(getRankTypes());
}

export function rankings(req, res) {
  const { rank_type: rankType, subcategory = '', limit = 50, platform = 'fanqie' } = req.query;
  if (!requireParam(res, rankType, 'rank_type')) return;

  if (isXingyueType(rankType)) {
    xingyueService.fetchRankingsTotal({ rankType, page: 1, perPage: Number(limit), platform })
      .then(result => res.json(result.items || result))
      .catch(err => { if (!handleXingyueError(err, res)) res.status(500).json({ code: 500, message: err.message }); });
    return;
  }

  res.json(getRankings({ rankType, subcategory, limit, platform }));
}

export function categories(req, res) {
  const { rank_type: rankType = '', platform = 'fanqie' } = req.query;

  if (isXingyueType(rankType)) {
    xingyueService.fetchCategories({ rankType, platform })
      .then(result => res.json(result))
      .catch(err => { if (!handleXingyueError(err, res)) res.json(getRankingCategories({ rankType: '', platform })); });
    return;
  }

  res.json(getRankingCategories({ rankType, platform }));
}

export function hotWords(req, res) {
  const { rank_type: rankType, subcategory = '', platform = 'fanqie', limit = 20 } = req.query;
  if (!requireParam(res, rankType, 'rank_type')) return;

  if (isXingyueType(rankType)) {
    xingyueService.fetchHotWords({ rankType, subcategory, platform, limit: Number(limit) })
      .then(result => res.json(result))
      .catch(err => { if (!handleXingyueError(err, res)) res.json([]); });
    return;
  }

  res.json(getHotWords({ rankType, subcategory, platform, limit }));
}

export function booksByIds(req, res) {
  const { ids = '', rank_type: rankType = 'hot', platform = 'fanqie', sort = '' } = req.query;
  if (!requireParam(res, ids, 'ids')) return;

  if (isXingyueType(rankType)) {
    xingyueService.fetchBooksByIds({ ids, rankType, platform })
      .then(result => res.json(result))
      .catch(err => { if (!handleXingyueError(err, res)) res.json([]); });
    return;
  }

  res.json(getBooksByIds({ ids, platform, sort }));
}

export function total(req, res) {
  const { rank_type: rankType, page = 1, per_page: perPage = 30, platform = 'fanqie' } = req.query;
  if (!requireParam(res, rankType, 'rank_type')) return;

  if (isXingyueType(rankType)) {
    xingyueService.fetchRankingsTotal({ rankType, page: Number(page), perPage: Number(perPage), platform })
      .then(result => res.json(result))
      .catch(err => { if (!handleXingyueError(err, res)) res.status(500).json({ code: 500, message: err.message }); });
    return;
  }

  res.json(getRankingTotal({ rankType, page, perPage, platform }));
}

export function categoryTotals(req, res) {
  const { rank_type: rankType, platform = 'fanqie' } = req.query;
  if (!requireParam(res, rankType, 'rank_type')) return;

  if (isXingyueType(rankType)) {
    xingyueService.fetchCategoryTotals({ rankType, platform })
      .then(result => res.json(result))
      .catch(err => { if (!handleXingyueError(err, res)) res.json([]); });
    return;
  }

  res.json(getCategoryTotals({ rankType, platform }));
}

export function inspiration(req, res) {
  const { rank_type: rankType, subcategory = '' } = req.query;
  if (!requireParam(res, rankType, 'rank_type')) return;

  if (isXingyueType(rankType)) {
    xingyueService.fetchInspiration({ rankType, subcategory })
      .then(result => res.json(result))
      .catch(err => { if (!handleXingyueError(err, res)) res.json(getInspirations({ rankType, subcategory })); });
    return;
  }

  res.json(getInspirations({ rankType, subcategory }));
}

export function searchTotal(req, res) {
  const { rank_type: rankType, keyword = '', limit = 100, platform = 'fanqie' } = req.query;
  if (!requireParam(res, rankType, 'rank_type')) return;
  if (!requireParam(res, keyword, 'keyword')) return;

  if (isXingyueType(rankType)) {
    xingyueService.searchBooks({ rankType, keyword, limit: Number(limit), platform })
      .then(result => res.json(result))
      .catch(err => { if (!handleXingyueError(err, res)) res.json({ items: [], total: 0, page: 1, per_page: Number(limit) }); });
    return;
  }

  res.json(searchRankings({ rankType, keyword, limit, platform }));
}
