import request from './request.js';

export function fetchCardTypes() { return request.get('/word-cards/types'); }
export function fetchCards(params) { return request.get('/word-cards', params); }
export function fetchCardDetail(id) { return request.get('/word-cards/' + id); }
export function createCard(data) { return request.post('/word-cards', data); }
export function updateCard(id, data) { return request.put('/word-cards/' + id, data); }
export function deleteCard(id) { return request.delete('/word-cards/' + id); }
