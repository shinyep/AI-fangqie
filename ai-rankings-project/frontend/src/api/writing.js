import request from './request.js';

export function fetchWritingStyles() {
  return request.get('/writing/styles');
}

export function generateText(data) {
  return request.post('/writing/generate', data);
}

export function continueText(data) {
  return request.post('/writing/continue', data);
}

export function expandText(data) {
  return request.post('/writing/expand', data);
}

export function summarizeChapter(data) {
  return request.post('/writing/chapter-summary', data);
}

export function extractWritingStyle(data) {
  return request.post('/writing/extract-style', data);
}

export function expandTextV2(data) {
  return request.post('/writing/expand-v2', data);
}

export function parseIntent(data) {
  return request.post('/writing/parse-intent', data);
}
