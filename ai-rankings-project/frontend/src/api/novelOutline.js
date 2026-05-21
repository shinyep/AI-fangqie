import request from './request.js';

export function crawlNovelOutline(data) {
  return request.post('/novel-outline/crawl', data, { timeout: 120000 });
}

export function analyzeChapters(data) {
  return request.post('/novel-outline/analyze', data, { timeout: 120000 });
}

export function fetchOutlineJobs() {
  return request.get('/novel-outline/jobs');
}

export function fetchOutlineJob(id) {
  return request.get('/novel-outline/jobs/' + id);
}

export function deleteOutlineJob(id) {
  return request.delete('/novel-outline/jobs/' + id);
}
