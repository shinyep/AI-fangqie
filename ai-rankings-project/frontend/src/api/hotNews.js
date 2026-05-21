import request from './request.js';

export function fetchNewsSources() {
  return request.get('/hot-news/sources');
}

export function fetchNewsDates(params) {
  return request.get('/hot-news/dates', { params });
}

export function fetchHotNews(params) {
  return request.get('/hot-news', { params });
}
