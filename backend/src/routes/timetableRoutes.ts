import { Router } from 'express';
import { generateTimetable, getTimetables, getTeacherTimetable, getDivisionTimetable, updateEntry, deleteTimetable, getAllEntries, validateTimetable } from '../controllers/timetableController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { Role } from '../models/Role';

const router = Router();

// Temporarily removed authenticateToken for development preview
router.get('/', getTimetables);
router.get('/validate', validateTimetable);
router.post('/generate', generateTimetable);
router.get('/:id/entries', getAllEntries);
router.get('/:id/teacher/:teacherId', getTeacherTimetable);
router.get('/:id/division/:divisionId', getDivisionTimetable);
router.put('/entry/:entryId', updateEntry);
router.delete('/:id', deleteTimetable);

export default router;
