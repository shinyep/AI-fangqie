import { Router } from 'express';
import * as creativeToolController from '../controllers/creativeToolController.js';
import * as outlineSaveController from '../controllers/outlineSaveController.js';

const router = Router();
router.get('/creative-tools/models', creativeToolController.listModels);

router.get('/creative-tools', creativeToolController.list);
router.post('/creative-tools/generate', creativeToolController.generate);
router.post('/creative-tools/refine', creativeToolController.refine);
router.post('/creative-tools/split', creativeToolController.split);
router.post('/creative-tools/scene-cards', creativeToolController.generateSceneCards);
router.post('/creative-tools/task-sheet', creativeToolController.generateTaskSheet);
router.post('/creative-tools/assess', creativeToolController.assessQuality);
router.post('/creative-tools/single-chapter', creativeToolController.generateSingleChapter);

router.post('/creative-tools/outline/save', outlineSaveController.save);
router.get('/creative-tools/outline/list/:bookId', outlineSaveController.list);
router.delete('/creative-tools/outline/:id', outlineSaveController.remove);

export default router;