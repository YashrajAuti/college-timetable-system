import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getMasterSubjects = async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.query;
    const whereClause = teacherId ? { teacherId: String(teacherId) } : {};
    
    const records = await prisma.teacherSubjectMaster.findMany({
      where: whereClause,
      include: {
        teacher: true,
        division: { include: { year: true } },
        subject: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch master subjects' });
  }
};

export const createMasterSubject = async (req: Request, res: Response) => {
  try {
    const { teacherId, divisionId, subjectId } = req.body;
    const record = await prisma.teacherSubjectMaster.create({
      data: { teacherId, divisionId, subjectId },
      include: { teacher: true, division: true, subject: true }
    });
    res.status(201).json(record);
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'This mapping already exists.' });
    } else {
      res.status(500).json({ error: 'Failed to create mapping' });
    }
  }
};

export const deleteMasterSubject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.teacherSubjectMaster.delete({ where: { id: String(id) } });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete mapping' });
  }
};
