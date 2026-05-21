import request from './request.js';

export function fetchProjects() { return request.get('/books'); }
export function fetchProject(id) { return request.get('/books/' + id); }
export function createProject(data) { return request.post('/books', data); }
export function updateProject(id, data) { return request.put('/books/' + id, data); }
export function deleteProject(id) { return request.delete('/books/' + id); }

export function fetchChapters(projectId) { return request.get('/books/' + projectId + '/chapters'); }
export function createChapter(data) { return request.post('/books/' + data.project_id + '/chapters', data); }
export function updateChapter(id, data) { return request.put('/books/' + data.project_id + '/chapters/' + id, data); }
export function deleteChapter(projectId, id) { return request.delete('/books/' + projectId + '/chapters/' + id); }
