import { Router } from 'express';
import { getSettings, updateSettings, resetSettings, getSystemStats } from '../controllers/settingsController';

const router = Router();

router.get('/', getSettings);
router.put('/', updateSettings);
router.post('/reset', resetSettings);
router.get('/stats', getSystemStats);

export default router;
