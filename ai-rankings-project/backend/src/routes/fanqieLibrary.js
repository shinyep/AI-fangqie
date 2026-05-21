import { Router } from 'express';
import { crawl, liveRankings } from '../controllers/fanqieLibraryController.js';

const router = Router();

router.post('/fanqie/library/crawl', crawl)
router.get('/fanqie/library/live', liveRankings);

export default router;
