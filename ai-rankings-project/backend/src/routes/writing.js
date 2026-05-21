import { Router } from 'express';
import * as writingController from '../controllers/writingController.js';

const router = Router();

router.get('/writing/styles', writingController.styles);
router.post('/writing/generate', writingController.generate);
router.post('/writing/continue', writingController.continueWrite);
router.post('/writing/expand', writingController.expand);
router.post('/writing/expand-v2', writingController.expandV2);
router.post('/writing/parse-intent', writingController.parseIntent);
router.post('/writing/chapter-summary', writingController.summarizeChapter);
router.post('/writing/extract-style', writingController.extractStyle);

export default router;
