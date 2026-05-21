import { Router } from 'express';
import * as promptController from '../controllers/promptController.js';

const router = Router();

router.get('/prompts/categories', promptController.categories);
router.get('/prompts', promptController.list);

// Style presets for Writing.vue (MUST be before /prompts/:id)
router.get('/prompts/style-presets', async (req, res) => {
  try {
    const { getStylePresets } = await import('../services/labelService.js');
    res.json(getStylePresets());
  } catch (err) {
    res.json([]);
  }
});

router.get('/prompts/:id', promptController.detail);
router.post('/prompts', promptController.create);
router.put('/prompts/:id', promptController.update);
router.post('/prompts/:id/favorite', promptController.favorite);
router.delete('/prompts/:id', promptController.remove);

export default router;