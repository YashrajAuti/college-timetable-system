import { PrismaClient } from '@prisma/client';
import { TimetableEngine } from '../services/timetableEngine';

const prisma = new PrismaClient();

async function main() {
  console.log("=== Detailed Trace of Subtask Placement Failures ===");
  
  const assignments = await prisma.facultyAssignment.findMany({
    include: { teacher: true, subject: true, division: true, batch: true, allowedLocations: true }
  });

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

  // Group subtasks by Division and print totals
  const divTasksMap = new Map<string, any[]>();
  for (const t of tasks) {
    const key = `${t.assignment.className || 'SE'}-${t.assignment.divisionName || 'A'}`;
    if (!divTasksMap.has(key)) divTasksMap.set(key, []);
    divTasksMap.get(key)!.push(t);
  }

  console.log('\n--- Subtasks per Division ---');
  divTasksMap.forEach((tList, div) => {
    let totHours = tList.reduce((sum, t) => sum + t.duration, 0);
    console.log(`Division [${div}]: ${tList.length} subtasks, total ${totHours} required hours`);
  });
}

main().finally(() => prisma.$disconnect());
