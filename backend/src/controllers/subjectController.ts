import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getSubjects = async (req: Request, res: Response) => {
  try {
    const subjects = await prisma.subject.findMany({
      where: { isActive: true },
      include: { department: true }
    });
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching subjects', error });
  }
};

export const createSubject = async (req: Request, res: Response) => {
  try {
    const { name, code, semester, credits, departmentId, labRequired } = req.body;
    const subject = await prisma.subject.create({
      data: { name, code, semester, credits, departmentId, labRequired }
    });
    res.status(201).json(subject);
  } catch (error) {
    res.status(500).json({ message: 'Error creating subject', error });
  }
};

export const updateSubject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code, semester, credits, departmentId, labRequired } = req.body;
    const subject = await prisma.subject.update({
      where: { id },
      data: { name, code, semester, credits, departmentId, labRequired }
    });
    res.json(subject);
  } catch (error) {
    res.status(500).json({ message: 'Error updating subject', error });
  }
};

export const deleteSubject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.subject.update({
      where: { id },
      data: { isActive: false }
    });
    res.json({ message: 'Subject soft-deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting subject', error });
  }
};
