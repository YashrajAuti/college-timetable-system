import { PrismaClient } from '@prisma/client';
import { TimetableEngine } from '../services/timetableEngine';

const prisma = new PrismaClient();

async function main() {
  console.log("=== Detailed Analysis of Subtask Scheduling Failures ===");
  
  // Instantiates engine and inspects why subtasks fail
  const assignments = await prisma.facultyAssignment.findMany({
    include: { teacher: true, subject: true, division: true, batch: true, allowedLocations: true }
  });
  const timeSlots = await prisma.timeSlot.findMany({ orderBy: { index: 'asc' } });
  const rooms = await prisma.room.findMany();

  // Create Subtasks
  const tasks: any[] = [];
  for (const a of assignments) {
    const th = a.theoryHours || (a.type === 'LECTURE' ? a.weeklyHours : 0);
    const pr = a.practicalHours || (a.type === 'PRACTICAL' ? a.weeklyHours : 0);
    const tu = a.tutorialHours || (a.type === 'TUTORIAL' ? a.weeklyHours : 0);
    const proj = a.projectHours || (a.type === 'PROJECT' || a.type === 'SEMINAR' ? a.weeklyHours : 0);

    for (let i = 0; i < th; i++) tasks.push({ assignment: a, subType: 'LECTURE', duration: 1 });
    if (pr > 0) {
      const batchList = (a.batchName && !['All', 'ALL', '-'].includes(a.batchName.trim()))
        ? a.batchName.split(',').map((b: string) => b.trim())
        : ['ALL'];
      const sessionsCount = Math.max(1, Math.round(pr / 2));
      for (let s = 0; s < sessionsCount; s++) {
        const targetB = batchList[s % batchList.length];
        tasks.push({ assignment: a, subType: 'PRACTICAL', targetBatch: targetB, duration: 2 });
      }
    }
    for (let i = 0; i < tu; i++) tasks.push({ assignment: a, subType: 'TUTORIAL', duration: 1 });
    if (proj > 0) {
      const projCount = Math.max(1, Math.round(proj / 2));
      for (let i = 0; i < projCount; i++) tasks.push({ assignment: a, subType: 'PROJECT', duration: 2 });
    }
  }

  console.log(`Total Subtasks to schedule: ${tasks.length}`);

  // Inspect faculty workload per teacher to check if any teacher is assigned > 30 hours per week (which exceeds 5-day slot capacity of 30 slots!)
  const teacherLoadMap = new Map<string, number>();
  assignments.forEach(a => {
    const tName = a.teacher?.name || 'Faculty';
    const hrs = a.totalHours || a.weeklyHours || 0;
    teacherLoadMap.set(tName, (teacherLoadMap.get(tName) || 0) + hrs);
  });

  console.log('\n--- Faculty-wise Workload (Max slots in week = 30) ---');
  let overloadedTeachersCount = 0;
  teacherLoadMap.forEach((hrs, tName) => {
    if (hrs > 30) {
      overloadedTeachersCount++;
      console.log(`⚠️ OVERLOADED TEACHER: ${tName} has ${hrs} hrs/week (> 30 max slots in Mon-Fri schedule!)`);
    } else {
      console.log(`  ${tName}: ${hrs} hrs/week`);
    }
  });

  console.log(`\nOverloaded Teachers Count (>30 hrs/wk): ${overloadedTeachersCount}`);
}

main().finally(() => prisma.$disconnect());
