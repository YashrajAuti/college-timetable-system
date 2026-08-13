import { Router } from 'express';
import { getSubjects, createSubject, updateSubject, deleteSubject, getSubjectAudit } from '../controllers/subjectController';

const router = Router();

router.get('/audit', getSubjectAudit);
router.get('/', getSubjects);
router.post('/', createSubject);
router.put('/:id', updateSubject);
router.delete('/:id', deleteSubject);

export default router;
