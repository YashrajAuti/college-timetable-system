import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getDivisions = async (req: Request, res: Response) => {
  try {
    const divisions = await prisma.division.findMany({
      where: { isActive: true },
      include: { 
        year: { include: { course: true } },
        batches: { where: { isActive: true } }
      }
    });
    res.json(divisions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching divisions', error });
  }
};

export const deleteDivision = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.division.update({ 
      where: { id: String(id) },
      data: { isActive: false }
    });
    res.json({ message: 'Division soft-deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting division', error });
  }
};
