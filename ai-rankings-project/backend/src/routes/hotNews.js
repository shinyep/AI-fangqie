import { Router } from 'express';
import { dates, list, sources } from '../controllers/hotNewsController.js';

const router = Router();

router.get('/hot-news/sources', sources);
router.get('/hot-news/dates', dates);
router.get('/hot-news', list);

export default router;
