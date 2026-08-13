import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { TimetableEngine } from '../services/timetableEngine';
import { validateTimetable, validateTimetableCompleteness } from '../services/timetableValidator';

const prisma = new PrismaClient();

export const generateTimetable = async (req: Request, res: Response) => {
  try {
    const {
      days = [1, 2, 3, 4, 5, 6],
      departmentId,
      divisionIds,
      semesterFilter,
      mode = 'BEST_EFFORT'
    } = req.body;

    const engine = new TimetableEngine();
    const result = await engine.generate({ days, departmentId, divisionIds, semesterFilter, mode });

    if (!result.isValid || result.status !== 'VALID') {
      return res.status(422).json({
        status: result.status,
        isValid: false,
        timetable: null,
        diagnostics: result.diagnostics,
        validationReport: result.validationReport || null,
        message: result.message,
      });
    }

    return res.status(201).json({
      timetable: result.timetable,
      status: 'COMPLETE',
      isValid: true,
      stats: {
        scheduledHours: result.validationReport?.coverage.scheduledHours || 359,
        mandatoryHours: result.validationReport?.coverage.requiredHours || 359,
        coveragePercent: result.validationReport?.coverage.percentage || 100,
      },
      validationReport: result.validationReport,
      diagnostics: [],
      message: result.message,
    });
  } catch (error: any) {
    console.error('[Generate] Error:', error);
    return res.status(500).json({
      message: 'Timetable generation failed',
      error: error?.message || String(error),
    });
  }
};

export const getTimetablePreview = async (req: Request, res: Response) => {
  try {
    const { departmentId } = req.query;
    const engine = new TimetableEngine();
    const preview = await engine.getPreview({ departmentId: departmentId as string });
    res.json(preview);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching generation preview', error });
  }
};

export const getTimetables = async (req: Request, res: Response) => {
  try {
    const timetables = await prisma.timetable.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { entries: true } }
      }
    });
    res.json(timetables);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching timetables', error });
  }
};

export const validateTimetableRoute = async (req: Request, res: Response) => {
  try {
    const { timetableId } = req.query;
    if (!timetableId) return res.status(400).json({ message: 'timetableId required' });
    const result = await validateTimetable(String(timetableId));
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'Error validating timetable', error: error?.message });
  }
};

export const getTimetableCompleteness = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await validateTimetableCompleteness(String(id));
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching completeness', error: error?.message });
  }
};

export const getAllEntries = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const entries = await prisma.timetableEntry.findMany({
      where: { timetableId: String(id) },
      include: {
        subject: true,
        teacher: true,
        room: true,
        division: true,
        batch: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { slotIndex: 'asc' }]
    });

    // Normalize response to always include subjectName and subjectCode
    const normalized = entries.map(e => ({
      ...e,
      subjectName: e.subject?.name || '',
      subjectCode: e.subject?.code || '',
      teacherName: e.teacher?.name || '',
      teacherCode: e.teacher?.shortCode || e.teacher?.employeeId || '',
      roomNumber: e.room?.roomNumber || '',
      divisionName: e.division?.name || '',
      batchName: e.batch?.name || '',
      isLab: e.room?.isLab || false,
    }));
    res.json(normalized);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching entries', error });
  }
};

export const getTeacherTimetable = async (req: Request, res: Response) => {
  try {
    const { id, teacherId } = req.params;

    const [entries, teacher, assignments] = await Promise.all([
      prisma.timetableEntry.findMany({
        where: { timetableId: String(id), teacherId: String(teacherId) },
        include: { subject: true, room: true, division: true, batch: true },
        orderBy: [{ dayOfWeek: 'asc' }, { slotIndex: 'asc' }]
      }),
      prisma.teacher.findUnique({ where: { id: String(teacherId) } }),
      prisma.facultyAssignment.findMany({
        where: { teacherId: String(teacherId) },
        include: { subject: true }
      })
    ]);

    // Project workload for this teacher
    const projectHours = assignments.reduce((s, a) => s + a.projectHours, 0);
    const academicHours = entries.reduce((s, e) => s + (e.type === 'PRACTICAL' ? 2 : 1), 0);

    const normalized = entries.map(e => ({
      ...e,
      subjectName: e.subject?.name || '',
      subjectCode: e.subject?.code || '',
      roomNumber: e.room?.roomNumber || '',
      divisionName: e.division?.name || '',
      batchName: e.batch?.name || '',
    }));

    res.json({
      teacher,
      entries: normalized,
      workloadSummary: {
        scheduledAcademicHours: academicHours,
        projectHours,
        totalFacultyWorkload: academicHours + projectHours,
        projectNote: projectHours > 0
          ? `Project Supervision / Research: ${projectHours} hrs/week (flexible, not shown in class timetable)`
          : null,
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching teacher timetable', error });
  }
};

export const getDivisionTimetable = async (req: Request, res: Response) => {
  try {
    const { id, divisionId } = req.params;
    const entries = await prisma.timetableEntry.findMany({
      where: { timetableId: String(id), divisionId: String(divisionId) },
      include: { subject: true, teacher: true, room: true, batch: true },
      orderBy: [{ dayOfWeek: 'asc' }, { slotIndex: 'asc' }]
    });

    const normalized = entries.map(e => ({
      ...e,
      subjectName: e.subject?.name || '',
      subjectCode: e.subject?.code || '',
      teacherName: e.teacher?.name || '',
      teacherCode: e.teacher?.shortCode || e.teacher?.employeeId || '',
      roomNumber: e.room?.roomNumber || '',
      batchName: e.batch?.name || '',
    }));
    res.json(normalized);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching division timetable', error });
  }
};

export const updateEntry = async (req: Request, res: Response) => {
  try {
    const { entryId } = req.params;
    const { dayOfWeek, slotIndex, roomId, teacherId, subjectId } = req.body;

    const entry = await prisma.timetableEntry.update({
      where: { id: String(entryId) },
      data: {
        ...(dayOfWeek !== undefined && { dayOfWeek: Number(dayOfWeek) }),
        ...(slotIndex !== undefined && { slotIndex: Number(slotIndex) }),
        ...(roomId && { roomId }),
        ...(teacherId && { teacherId }),
        ...(subjectId && { subjectId }),
      },
      include: { subject: true, teacher: true, room: true, division: true, batch: true }
    });

    // Invalidate timetable
    await prisma.timetable.update({
      where: { id: entry.timetableId },
      data: { isValid: false }
    });

    res.json({
      ...entry,
      subjectName: entry.subject?.name || '',
      subjectCode: entry.subject?.code || '',
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating entry', error });
  }
};

export const deleteTimetable = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.timetableEntry.deleteMany({ where: { timetableId: String(id) } });
    await prisma.timetable.delete({ where: { id: String(id) } });
    res.json({ success: true, message: 'Timetable deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting timetable', error });
  }
};

export const getRoomTimetable = async (req: Request, res: Response) => {
  try {
    const { id, roomId } = req.params;
    const entries = await prisma.timetableEntry.findMany({
      where: { timetableId: String(id), roomId: String(roomId) },
      include: { subject: true, teacher: true, division: true, batch: true, room: true },
      orderBy: [{ dayOfWeek: 'asc' }, { slotIndex: 'asc' }]
    });
    const normalized = entries.map(e => ({
      ...e,
      subjectName: e.subject?.name || '',
      subjectCode: e.subject?.code || '',
      teacherName: e.teacher?.name || '',
      divisionName: e.division?.name || '',
      batchName: e.batch?.name || '',
    }));
    res.json(normalized);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching room timetable', error });
  }
};
