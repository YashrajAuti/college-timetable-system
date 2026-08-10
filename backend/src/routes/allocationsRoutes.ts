import { Router } from 'express';
import { getAllocations, createAllocation, deleteAllocation, updateAllocation } from '../controllers/allocationsController';

const router = Router();

router.get('/', getAllocations);
router.post('/', createAllocation);
router.put('/:id', updateAllocation);
router.delete('/:id', deleteAllocation);

export default router;
