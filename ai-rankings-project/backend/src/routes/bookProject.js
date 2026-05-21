import { Router } from 'express';
import * as ctrl from '../controllers/bookProjectController.js';
import * as chapterCtrl from '../controllers/chapterController.js';

const router = Router();

router.get('/books', ctrl.list);
router.post('/books', ctrl.create);
router.get('/books/:id', ctrl.detail);
router.put('/books/:id', ctrl.update);
router.delete('/books/:id', ctrl.remove);

// 章节（嵌套在书籍下）
router.get('/books/:projectId/chapters', chapterCtrl.list);
router.post('/books/:projectId/chapters', (req, res) => {
  req.body.project_id = Number(req.params.projectId);
  chapterCtrl.create(req, res);
});
router.get('/books/:projectId/chapters/:id', chapterCtrl.detail);
router.put('/books/:projectId/chapters/:id', chapterCtrl.update);
router.delete('/books/:projectId/chapters/:id', chapterCtrl.remove);

export default router;
