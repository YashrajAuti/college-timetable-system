import { Router } from 'express';
import {
  getAllocations,
  createAllocation,
  deleteAllocation,
  updateAllocation,
  getWorkloadSummary,
  getWorkloadGraphs
} from '../controllers/allocationsController';

const router = Router();

router.get('/', getAllocations);
router.get('/summary', getWorkloadSummary);
router.get('/graphs', getWorkloadGraphs);
router.post('/', createAllocation);
router.put('/:id', updateAllocation);
router.delete('/:id', deleteAllocation);

export default router;
