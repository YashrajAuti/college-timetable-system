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
    const allocationFilter: any = {};

    if (!isAll && typeof departmentId === 'string') {
      teacherFilter.OR = [
        { departmentId: departmentId },
        { departments: { some: { departmentId: departmentId } } }
      ];
      subjectFilter.departmentId = departmentId;
      roomFilter.departmentId = departmentId;
      allocationFilter.OR = [
        { departmentId: departmentId },
        { teacher: { departmentId: departmentId } }
      ];
    }

    const [departmentsCount, teachersCount, subjectsCount, roomsCount, labsCount, timetablesCount, allocationsCount, allocationsList] = await Promise.all([
      prisma.department.count({ where: { isActive: true } }),
      prisma.teacher.count({ where: teacherFilter }),
      prisma.subject.count({ where: subjectFilter }),
      prisma.room.count({ where: { ...roomFilter, isLab: false } }),
      prisma.room.count({ where: { ...roomFilter, isLab: true } }),
      prisma.timetable.count(),
      prisma.facultyAssignment.count({ where: allocationFilter }),
      prisma.facultyAssignment.findMany({ where: allocationFilter })
    ]);

    let totalTheory = 0;
    let totalPractical = 0;
    let totalTutorial = 0;
    let totalProject = 0;

    allocationsList.forEach(a => {
      totalTheory += a.theoryHours || (a.type === 'LECTURE' ? a.weeklyHours : 0);
      totalPractical += a.practicalHours || (a.type === 'PRACTICAL' ? a.weeklyHours : 0);
      totalTutorial += a.tutorialHours || (a.type === 'TUTORIAL' ? a.weeklyHours : 0);
      totalProject += a.projectHours || (a.type === 'PROJECT' || a.type === 'SEMINAR' ? a.weeklyHours : 0);
    });

    const totalWorkload = totalTheory + totalPractical + totalTutorial + totalProject;

    // Day-wise distribution data (derived dynamically from entries or standard split)
    let workloadData = [
      { name: 'Mon', day: 1, lectures: Math.round(totalTheory * 0.22), labs: Math.round(totalPractical * 0.20), tutorial: Math.round(totalTutorial * 0.20) },
      { name: 'Tue', day: 2, lectures: Math.round(totalTheory * 0.24), labs: Math.round(totalPractical * 0.22), tutorial: Math.round(totalTutorial * 0.20) },
      { name: 'Wed', day: 3, lectures: Math.round(totalTheory * 0.22), labs: Math.round(totalPractical * 0.20), tutorial: Math.round(totalTutorial * 0.20) },
      { name: 'Thu', day: 4, lectures: Math.round(totalTheory * 0.18), labs: Math.round(totalPractical * 0.22), tutorial: Math.round(totalTutorial * 0.20) },
      { name: 'Fri', day: 5, lectures: Math.round(totalTheory * 0.14), labs: Math.round(totalPractical * 0.16), tutorial: Math.round(totalTutorial * 0.20) },
      { name: 'Sat', day: 6, lectures: Math.round(totalTheory * 0.00), labs: Math.round(totalPractical * 0.00), tutorial: 0 },
    ];

    const latestTimetable = await prisma.timetable.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (latestTimetable) {
      const entryWhere: any = { timetableId: latestTimetable.id };
      if (!isAll && typeof departmentId === 'string') {
        entryWhere.subject = { departmentId: departmentId };
      }

      const entries = await prisma.timetableEntry.findMany({ where: entryWhere });
      if (entries.length > 0) {
        workloadData.forEach(w => { w.lectures = 0; w.labs = 0; w.tutorial = 0; });
        for (const entry of entries) {
          const dayItem = workloadData.find(w => w.day === entry.dayOfWeek);
          if (dayItem) {
            if (entry.type === 'LECTURE') dayItem.lectures++;
            else if (entry.type === 'PRACTICAL') dayItem.labs++;
            else dayItem.tutorial++;
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
        timetables: timetablesCount,
        allocations: allocationsCount,
        totalTheory,
        totalPractical,
        totalTutorial,
        totalProject,
        totalWorkload
      },
      workloadData
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Error fetching stats', error });
  }
};
