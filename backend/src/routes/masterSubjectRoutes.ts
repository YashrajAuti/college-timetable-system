import { Router } from 'express';
import { getMasterSubjects, createMasterSubject, deleteMasterSubject } from '../controllers/teacherSubjectMasterController';

const router = Router();

router.get('/', getMasterSubjects);
router.post('/', createMasterSubject);
router.delete('/:id', deleteMasterSubject);

export default router;
