import { PrismaClient } from '@prisma/client';
import { TimetableEngine } from '../services/timetableEngine';

const prisma = new PrismaClient();

async function main() {
  console.log("=== Debugging Engine SubTask Placement Failure Reasons ===");
  
  // Custom execution of engine to collect detailed rejection reasons
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
    for (let i = 0; i < Math.max(1, Math.round(proj / 2)); i++) tasks.push({ assignment: a, subType: 'PROJECT', duration: 2 });
  }

  console.log(`Total Subtasks: ${tasks.length}`);

  // Analyze breakdown by subType
  const typeCounts: Record<string, number> = {};
  tasks.forEach(t => typeCounts[t.subType] = (typeCounts[t.subType] || 0) + 1);
  console.log('Subtask Breakdown:', typeCounts);
}

main().finally(() => prisma.$disconnect());
