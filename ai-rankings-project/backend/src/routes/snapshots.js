import { Router } from 'express';
import * as snapshotController from '../controllers/snapshotController.js';

const router = Router();

router.post('/chapters/:chapterId/snapshots', snapshotController.create);
router.get('/chapters/:chapterId/snapshots', snapshotController.list);
router.post('/chapters/:chapterId/snapshots/:snapshotId/restore', snapshotController.restore);
router.delete('/chapters/:chapterId/snapshots/:snapshotId', snapshotController.remove);

export default router;
