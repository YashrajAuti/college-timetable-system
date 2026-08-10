import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllocations = async (req: Request, res: Response) => {
  try {
    const allocations = await prisma.facultyAssignment.findMany({
      include: {
        teacher: true,
        subject: true,
        division: true,
        batch: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(allocations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching allocations', error });
  }
};

export const createAllocation = async (req: Request, res: Response) => {
  try {
    const { teacherId, divisionId, subjectId, type, batchId, weeklyHours, roomIds } = req.body;
    
    const allocation = await prisma.facultyAssignment.create({
      data: {
        teacherId,
        divisionId,
        subjectId,
        type,
        batchId: batchId || null,
        batchId: batchId || null,
        weeklyHours
      }
    });
    res.status(201).json(allocation);
  } catch (error) {
    res.status(500).json({ message: 'Error creating allocation', error });
  }
};

export const deleteAllocation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.facultyAssignment.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting allocation', error });
  }
};
export const updateAllocation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { teacherId, divisionId, subjectId, type, batchId, weeklyHours, roomIds } = req.body;
    
    const allocation = await prisma.facultyAssignment.update({
      where: { id },
      data: {
        teacherId,
        divisionId,
        subjectId,
        type,
        batchId: batchId || null,
        batchId: batchId || null,
        weeklyHours
      }
    });
    res.json(allocation);
  } catch (error) {
    res.status(500).json({ message: 'Error updating allocation', error });
  }
};
