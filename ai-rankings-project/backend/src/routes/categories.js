import { Router } from 'express';
import { categories, labels, tags } from '../controllers/categoryController.js';
import * as labelController from '../controllers/labelController.js';

const router = Router();

router.get('/categories', categories);
router.get('/tags', tags);
router.get('/label/list', labels);

// Label CRUD (new)
router.get('/labels', labelController.list);
router.get('/labels/flat', labelController.flatList);
router.post('/labels', labelController.create);
router.put('/labels/:id', labelController.update);
router.delete('/labels/:id', labelController.remove);

// Prompt-Label associations
router.get('/prompts/:promptId/labels', labelController.getPromptLabels);
router.put('/prompts/:promptId/labels', labelController.setPromptLabels);

export default router;