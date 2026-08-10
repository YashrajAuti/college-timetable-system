import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { TimetableEngine } from '../services/timetableEngine';
import { ValidationEngine } from '../services/validationEngine';

const prisma = new PrismaClient();

export const validateTimetable = async (req: Request, res: Response) => {
  try {
    const result = await ValidationEngine.validateAll();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error running validation engine', error });
  }
};

export const generateTimetable = async (req: Request, res: Response) => {
  try {
    const { variant, scope, variantsToGenerate = 1 } = req.body;

    // Run validation first
    const validation = await ValidationEngine.validateAll();
    if (!validation.isValid) {
      res.status(400).json({ message: 'Validation failed', errors: validation.errors });
      return;
    }

    const engine = new TimetableEngine({ days: [1, 2, 3, 4, 5], variantsToGenerate, scope });
    
    // Generate (engine saves to DB automatically now)
    const timetable = await engine.generate();

    if (timetable) {
      res.status(200).json({ message: 'Timetable generated successfully!', timetableId: timetable.id });
    } else {
      res.status(409).json({ message: 'Failed to generate clash-free timetable.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error generating timetable', error });
  }
};

export const getTimetables = async (req: Request, res: Response) => {
  try {
    const timetables = await prisma.timetable.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(timetables);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching timetables', error });
  }
};

export const getTeacherTimetable = async (req: Request, res: Response) => {
  try {
    const { id, teacherId } = req.params;
    
    const entries = await prisma.timetableEntry.findMany({
      where: {
        timetableId: id,
        teacherId: teacherId
      },
      include: {
        subject: true,
        room: true,
        division: true,
        batch: true,
        teacher: true
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { slotIndex: 'asc' }
      ]
    });
    
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching teacher timetable', error });
  }
};

export const getAllEntries = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const entries = await prisma.timetableEntry.findMany({
      where: { timetableId: id },
      select: { divisionId: true, teacherId: true }
    });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching all entries', error });
  }
};

export const getDivisionTimetable = async (req: Request, res: Response) => {
  try {
    const { id, divisionId } = req.params;
    
    const entries = await prisma.timetableEntry.findMany({
      where: {
        timetableId: id,
        divisionId: divisionId
      },
      include: {
        subject: true,
        room: true,
        division: true,
        batch: true,
        teacher: true
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { slotIndex: 'asc' }
      ]
    });
    
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching division timetable', error });
  }
};

export const updateEntry = async (req: Request, res: Response) => {
  try {
    const { entryId } = req.params;
    const { dayOfWeek, slotIndex } = req.body;

    const updated = await prisma.timetableEntry.update({
      where: { id: entryId },
      data: { dayOfWeek, slotIndex }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error updating entry', error });
  }
};

export const deleteTimetable = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.timetable.delete({
      where: { id }
    });
    res.json({ message: 'Timetable deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting timetable', error });
  }
};
