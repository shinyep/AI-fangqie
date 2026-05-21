import { Router } from 'express';
import { crawl, analyze, listJobs, jobDetail, deleteJob } from '../controllers/novelOutlineController.js';

const router = Router();

router.post('/novel-outline/crawl', crawl);
router.post('/novel-outline/analyze', analyze);
router.get('/novel-outline/jobs', listJobs);
router.get('/novel-outline/jobs/:id', jobDetail);
router.delete('/novel-outline/jobs/:id', deleteJob);

export default router;
