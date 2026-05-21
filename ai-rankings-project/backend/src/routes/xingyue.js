import { Router } from 'express';
import * as ctrl from '../controllers/xingyueController.js';

const router = Router();

router.get('/xingyue/live', ctrl.live);
router.get('/xingyue/rankings', ctrl.rankings);
router.get('/xingyue/categories', ctrl.categories);
router.get('/xingyue/category-totals', ctrl.categoryTotals);
router.get('/xingyue/hot-words', ctrl.hotWords);
router.get('/xingyue/inspiration', ctrl.inspiration);
router.post('/xingyue/config', ctrl.updateConfig);

export default router;
