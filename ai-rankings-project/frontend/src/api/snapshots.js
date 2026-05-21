import request from './request.js';

export function createSnapshot(chapterId, data) {
  return request.post(`/api/v1/chapters/${chapterId}/snapshots`, data);
}

export function getSnapshots(chapterId) {
  return request.get(`/api/v1/chapters/${chapterId}/snapshots`);
}

export function restoreSnapshot(chapterId, snapshotId) {
  return request.post(`/api/v1/chapters/${chapterId}/snapshots/${snapshotId}/restore`);
}

export function deleteSnapshot(chapterId, snapshotId) {
  return request.delete(`/api/v1/chapters/${chapterId}/snapshots/${snapshotId}`);
}
