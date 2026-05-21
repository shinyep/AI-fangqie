import request from './request.js';

export function fetchModels() {
  return request.get('/creative-tools/models');
}

export function fetchToolList() {
  return request.get('/creative-tools');
}

export function generateTool(data) {
  return request.post('/creative-tools/generate', data);
}

export function generateSingleChapter(data) {
  return request.post('/creative-tools/single-chapter', data);
}

export function refineOutline(data) {
  return request.post('/creative-tools/refine', data);
}

export function splitOutline(data) {
  return request.post('/creative-tools/split', data);
}

export function generateSceneCards(data) {
  return request.post('/creative-tools/scene-cards', data);
}

export function generateTaskSheet(data) {
  return request.post('/creative-tools/task-sheet', data);
}

export function assessQuality(data) {
  return request.post('/creative-tools/assess', data);
}
// 细纲保存到书籍
export function saveOutline(data) { return request.post('/creative-tools/outline/save', data); }
export function listSavedOutlines(bookId) { return request.get('/creative-tools/outline/list/' + bookId); }
export function deleteSavedOutline(id) { return request.delete('/creative-tools/outline/' + id); }
