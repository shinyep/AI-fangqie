import { Router } from 'express';
import {
  booksByIds,
  categories,
  categoryTotals,
  hotWords,
  inspiration,
  rankings,
  rankTypes,
  searchTotal,
  total,
} from '../controllers/aiRankController.js';

const router = Router();

router.get('/rank-types', rankTypes);
router.get('/ai-rankings', rankings);
router.get('/ai-rankings/categories', categories);
router.get('/ai-rankings/hot-words', hotWords);
router.get('/ai-rankings/books-by-ids', booksByIds);
router.get('/ai-rankings/total', total);
router.get('/ai-rankings/category-totals', categoryTotals);
router.get('/ai-rankings/inspiration', inspiration);
router.get('/ai-rankings/total/search', searchTotal);

export default router;
