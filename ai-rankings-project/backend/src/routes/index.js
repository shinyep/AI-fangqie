import { Router } from 'express';
import aiRankingRoutes from './aiRankings.js';
import bookProjectRoutes from './bookProject.js';
import categoryRoutes from './categories.js';
import characterRoutes from './characters.js';
import fanqieLibraryRoutes from './fanqieLibrary.js';
import creativeToolRoutes from './creativeTools.js';
import hotNewsRoutes from './hotNews.js';
import aiConfigRoutes from './aiConfig.js';
import novelOutlineRoutes from './novelOutline.js';
import promptRoutes from './prompts.js';
import wordCardRoutes from './wordCards.js';
import novelReviewRoutes from './novelReview.js';
import writingRoutes from './writing.js';
import xingyueRoutes from './xingyue.js';
import snapshotRoutes from './snapshots.js';

const router = Router();

router.get('/ping', (req, res) => {
  res.json('pong');
});

router.use(aiConfigRoutes);
router.use(aiRankingRoutes);
router.use(bookProjectRoutes);
router.use(characterRoutes);
router.use(categoryRoutes);
router.use(fanqieLibraryRoutes);
router.use(creativeToolRoutes);
router.use(hotNewsRoutes);
router.use(novelOutlineRoutes);
router.use(novelReviewRoutes);
router.use(promptRoutes);
router.use(wordCardRoutes);
router.use(writingRoutes);
router.use(xingyueRoutes);
router.use(snapshotRoutes);

export default router;
