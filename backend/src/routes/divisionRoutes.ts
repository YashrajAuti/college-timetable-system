import { Router } from 'express';
import { getDivisions, deleteDivision } from '../controllers/divisionController';

const router = Router();

router.get('/', getDivisions);
router.delete('/:id', deleteDivision);

export default router;
