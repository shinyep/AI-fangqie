import { getHotNews, getNewsDates, getNewsSources } from '../services/hotNewsService.js';

export function sources(req, res) {
  res.json(getNewsSources());
}

export function dates(req, res) {
  const { source = 'douyin', limit = 7 } = req.query;
  res.json(getNewsDates({ source, limit }));
}

export function list(req, res) {
  const { source = 'douyin', date = '', limit = 100 } = req.query;
  res.json(getHotNews({ source, date, limit }));
}
