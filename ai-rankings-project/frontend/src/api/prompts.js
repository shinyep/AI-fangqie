import request from './request.js';

export function fetchCategories() {
  return request.get('/prompts/categories');
}

export function fetchPrompts(params) {
  return request.get('/prompts', { params });
}

export function fetchPromptDetail(id) {
  return request.get('/prompts/' + id);
}

export function createPrompt(data) {
  return request.post('/prompts', data);
}

export function updatePrompt(id, data) {
  return request.put('/prompts/' + id, data);
}

export function toggleFavorite(id) {
  return request.post('/prompts/' + id + '/favorite');
}
export function deletePrompt(id) {
  return request.delete('/prompts/' + id);
}

// Labels (new)
export function fetchLabels() {
  return request.get('/labels');
}

export function fetchStylePresets() {
  return request.get('/prompts/style-presets');
}
