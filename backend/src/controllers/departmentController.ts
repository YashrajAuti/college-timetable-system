import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getDepartments = async (req: Request, res: Response) => {
  try {
    const departments = await prisma.department.findMany({
      where: { isActive: true }
    });
    res.json(departments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching departments', error });
  }
};

export const getDepartmentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const department = await prisma.department.findFirst({ where: { id: String(id), isActive: true } });
    if (!department) return res.status(404).json({ message: 'Department not found' });
    res.json(department);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching department', error });
  }
};

export const createDepartment = async (req: Request, res: Response) => {
  try {
    const { name, code } = req.body;
    const department = await prisma.department.create({
      data: { name, code }
    });
    res.status(201).json(department);
  } catch (error) {
    res.status(500).json({ message: 'Error creating department', error });
  }
};

export const updateDepartment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code } = req.body;
    const department = await prisma.department.update({
      where: { id: String(id) },
      data: { name, code }
    });
    res.json(department);
  } catch (error) {
    res.status(500).json({ message: 'Error updating department', error });
  }
};

export const deleteDepartment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.department.update({ 
      where: { id: String(id) },
      data: { isActive: false }
    });
    res.json({ message: 'Department soft-deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting department', error });
  }
};
