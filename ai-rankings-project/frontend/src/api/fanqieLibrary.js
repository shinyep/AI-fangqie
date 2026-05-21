import request from './request.js';

export function crawlFanqieLibrary(data) {
  return request.post('/fanqie/library/crawl', data);
}

export function fetchLiveRankings(params) {
  return request.get('/fanqie/library/live', { params });
}