import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getTeachers = async (req: Request, res: Response) => {
  try {
    const { departmentId } = req.query;

    const whereCondition: any = { isActive: true };
    
    if (departmentId && typeof departmentId === 'string' && departmentId !== 'ALL') {
      whereCondition.OR = [
        { departmentId: departmentId },
        { departments: { some: { departmentId: departmentId } } }
      ];
    }

    const teachers = await prisma.teacher.findMany({
      where: whereCondition,
      include: {
        department: true,
        departments: {
          include: {
            department: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json(teachers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching teachers', error });
  }
};

export const createTeacher = async (req: Request, res: Response) => {
  try {
    const { name, employeeId, email, departmentId, designation } = req.body;

    if (!name || !employeeId || !departmentId) {
      return res.status(400).json({ message: 'Name, Faculty Code, and Department are required.' });
    }

    const existingCode = await prisma.teacher.findUnique({
      where: { employeeId: employeeId.trim().toUpperCase() }
    });

    if (existingCode) {
      return res.status(400).json({ message: 'Faculty code already exists.' });
    }

    const cleanEmail = email ? email.trim() : `${employeeId.toLowerCase()}@mmit.edu.in`;

    const teacher = await prisma.teacher.create({
      data: {
        name: name.trim(),
        employeeId: employeeId.trim().toUpperCase(),
        email: cleanEmail,
        departmentId,
        designation: designation || 'Faculty',
        departments: {
          create: {
            departmentId: departmentId
          }
        }
      },
      include: {
        department: true,
        departments: {
          include: {
            department: true
          }
        }
      }
    });

    res.status(201).json(teacher);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Faculty code already exists.' });
    }
    res.status(500).json({ message: 'Error creating teacher', error });
  }
};

export const updateTeacher = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, employeeId, email, departmentId, designation } = req.body;

    if (employeeId) {
      const existingCode = await prisma.teacher.findFirst({
        where: {
          employeeId: employeeId.trim().toUpperCase(),
          NOT: { id }
        }
      });

      if (existingCode) {
        return res.status(400).json({ message: 'Faculty code already exists.' });
      }
    }

    const teacher = await prisma.teacher.update({
      where: { id },
      data: {
        name: name?.trim(),
        employeeId: employeeId?.trim().toUpperCase(),
        email: email?.trim(),
        departmentId,
        designation
      },
      include: {
        department: true,
        departments: {
          include: {
            department: true
          }
        }
      }
    });

    // Ensure TeacherDepartment entry exists for updated departmentId
    if (departmentId) {
      await prisma.teacherDepartment.upsert({
        where: {
          teacherId_departmentId: {
            teacherId: id,
            departmentId: departmentId
          }
        },
        create: {
          teacherId: id,
          departmentId: departmentId
        },
        update: {}
      });
    }

    res.json(teacher);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Faculty code already exists.' });
    }
    res.status(500).json({ message: 'Error updating teacher', error });
  }
};

export const deleteTeacher = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.teacher.update({
      where: { id },
      data: { isActive: false }
    });
    res.json({ message: 'Teacher deactivated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting teacher', error });
  }
};
