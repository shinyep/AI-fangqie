import request from './request.js';

export function fetchCategories() {
  return request.get('/categories');
}
