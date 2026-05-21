import { Router } from 'express';
import * as ctrl from '../controllers/wordCardController.js';

const router = Router();

router.get('/word-cards/types', ctrl.types);
router.get('/word-cards', ctrl.list);
router.get('/word-cards/:id', ctrl.detail);
router.post('/word-cards', ctrl.create);
router.put('/word-cards/:id', ctrl.update);
router.delete('/word-cards/:id', ctrl.remove);

export default router;
