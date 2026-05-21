import { Router } from 'express';
import * as characterController from '../controllers/characterController.js';

const router = Router();

router.get('/characters', characterController.list);
router.get('/characters/:id', characterController.detail);
router.post('/characters', characterController.create);
router.put('/characters/:id', characterController.update);
router.delete('/characters/:id', characterController.remove);

export default router;
