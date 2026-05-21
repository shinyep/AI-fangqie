import request from './request.js';

export function fetchXingyueLiveData(params) {
  return request.get('/xingyue/live', { params });
}

export function fetchXingyueRankings(params) {
  return request.get('/xingyue/rankings', { params });
}

export function fetchXingyueCategories(params) {
  return request.get('/xingyue/categories', { params });
}

export function fetchXingyueHotWords(params) {
  return request.get('/xingyue/hot-words', { params });
}
