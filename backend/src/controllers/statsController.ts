import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const { departmentId } = req.query;

    const isAll = !departmentId || departmentId === 'ALL';

    const teacherFilter: any = { isActive: true };
    const subjectFilter: any = {};
    const roomFilter: any = {};

    if (!isAll && typeof departmentId === 'string') {
      teacherFilter.OR = [
        { departmentId: departmentId },
        { departments: { some: { departmentId: departmentId } } }
      ];
      subjectFilter.departmentId = departmentId;
      roomFilter.departmentId = departmentId;
    }

    const [departmentsCount, teachersCount, subjectsCount, roomsCount, labsCount, timetablesCount] = await Promise.all([
      prisma.department.count({ where: { isActive: true } }),
      prisma.teacher.count({ where: teacherFilter }),
      prisma.subject.count({ where: subjectFilter }),
      prisma.room.count({ where: { ...roomFilter, isLab: false } }),
      prisma.room.count({ where: { ...roomFilter, isLab: true } }),
      prisma.timetable.count()
    ]);

    const latestTimetable = await prisma.timetable.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    let workloadData = [
      { name: 'Mon', day: 1, lectures: 18, labs: 8 },
      { name: 'Tue', day: 2, lectures: 20, labs: 10 },
      { name: 'Wed', day: 3, lectures: 22, labs: 8 },
      { name: 'Thu', day: 4, lectures: 19, labs: 12 },
      { name: 'Fri', day: 5, lectures: 16, labs: 6 },
      { name: 'Sat', day: 6, lectures: 10, labs: 4 },
    ];

    if (latestTimetable) {
      const entryWhere: any = { timetableId: latestTimetable.id };
      if (!isAll && typeof departmentId === 'string') {
        entryWhere.subject = { departmentId: departmentId };
      }

      const entries = await prisma.timetableEntry.findMany({
        where: entryWhere
      });
      
      if (entries.length > 0) {
        // Reset counters if real entries exist
        workloadData.forEach(w => { w.lectures = 0; w.labs = 0; });
        for (const entry of entries) {
          const dayItem = workloadData.find(w => w.day === entry.dayOfWeek);
          if (dayItem) {
            if (entry.type === 'LECTURE') {
              dayItem.lectures++;
            } else {
              dayItem.labs++;
            }
          }
        }
      }
    }

    res.json({
      metrics: {
        departments: departmentsCount,
        teachers: teachersCount,
        subjects: subjectsCount,
        classrooms: roomsCount,
        labs: labsCount,
        rooms: roomsCount + labsCount,
        timetables: timetablesCount
      },
      workloadData
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats', error });
  }
};
