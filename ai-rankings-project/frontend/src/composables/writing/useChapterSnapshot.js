import { ref } from 'vue';
import { createSnapshot, getSnapshots, restoreSnapshot } from '../../api/snapshots.js';

/**
 * 章节快照管理
 * 在应用 AI 修改前自动创建快照，支持回退
 */
export function useChapterSnapshot() {
  const snapshots = ref([]);
  const loadingSnapshots = ref(false);
  const restoringId = ref(null);

  async function loadSnapshots(chapterId) {
    if (!chapterId) return;
    loadingSnapshots.value = true;
    try {
      snapshots.value = await getSnapshots(chapterId);
    } catch {
      snapshots.value = [];
    } finally {
      loadingSnapshots.value = false;
    }
  }

  async function takeSnapshot(chapterId, content, label = '') {
    if (!chapterId || !content) return null;
    try {
      const snapshot = await createSnapshot(chapterId, {
        content,
        word_count: content.replace(/\s/g, '').length,
        label: label || `自动快照 ${new Date().toLocaleString('zh-CN')}`,
      });
      snapshots.value.unshift(snapshot);
      return snapshot;
    } catch {
      return null;
    }
  }

  async function restoreToSnapshot(chapterId, snapshotId) {
    if (!chapterId || !snapshotId) return null;
    restoringId.value = snapshotId;
    try {
      const result = await restoreSnapshot(chapterId, snapshotId);
      return result;
    } catch {
      return null;
    } finally {
      restoringId.value = null;
    }
  }

  return {
    snapshots,
    loadingSnapshots,
    restoringId,
    loadSnapshots,
    takeSnapshot,
    restoreToSnapshot,
  };
}
