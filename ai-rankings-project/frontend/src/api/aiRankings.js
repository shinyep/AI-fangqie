import request from './request.js';

export function fetchRankTypes() {
  return request.get('/rank-types');
}

export function fetchRankings(params) {
  return request.get('/ai-rankings', { params });
}

export function fetchRankingCategories(params) {
  return request.get('/ai-rankings/categories', { params });
}

export function fetchHotWords(params) {
  return request.get('/ai-rankings/hot-words', { params });
}

export function fetchCategoryTotals(params) {
  return request.get('/ai-rankings/category-totals', { params });
}

export function fetchInspirations(params) {
  return request.get('/ai-rankings/inspiration', { params });
}

export function searchRankings(params) {
  return request.get('/ai-rankings/total/search', { params });
}
