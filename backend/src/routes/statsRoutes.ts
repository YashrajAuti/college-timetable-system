import { Router } from 'express';
import { getDashboardStats } from '../controllers/statsController';

const router = Router();

// Temporarily public for preview
router.get('/', getDashboardStats);

export default router;
