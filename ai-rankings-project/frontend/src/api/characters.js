import request from './request.js';

export function fetchCharacters(params) {
  return request.get('/characters', params);
}

export function fetchCharacterDetail(id) {
  return request.get('/characters/' + id);
}

export function createCharacter(data) {
  return request.post('/characters', data);
}

export function updateCharacter(id, data) {
  return request.put('/characters/' + id, data);
}

export function deleteCharacter(id) {
  return request.delete('/characters/' + id);
}
