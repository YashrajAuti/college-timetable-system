import { Router } from 'express';
import {
  generateTimetable,
  getTimetables,
  getTeacherTimetable,
  getDivisionTimetable,
  getRoomTimetable,
  updateEntry,
  deleteTimetable,
  getAllEntries,
  validateTimetableRoute,
  getTimetableCompleteness,
  getTimetablePreview,
} from '../controllers/timetableController';

const router = Router();

router.get('/', getTimetables);
router.get('/validate', validateTimetableRoute);
router.get('/preview', getTimetablePreview);
router.post('/generate', generateTimetable);
router.get('/:id/entries', getAllEntries);
router.get('/:id/completeness', getTimetableCompleteness);
router.get('/:id/teacher/:teacherId', getTeacherTimetable);
router.get('/:id/division/:divisionId', getDivisionTimetable);
router.get('/:id/room/:roomId', getRoomTimetable);
router.put('/entry/:entryId', updateEntry);
router.delete('/:id', deleteTimetable);

export default router;
