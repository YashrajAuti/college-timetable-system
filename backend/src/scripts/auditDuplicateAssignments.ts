import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const assignments = await prisma.facultyAssignment.findMany({
    include: { teacher: true }
  });

  console.log(`Total FacultyAssignments in DB: ${assignments.length}`);

  // Group by (className, divisionName, courseCode, type)
  const groupMap = new Map<string, any[]>();

  assignments.forEach(a => {
    const key = `${a.className || 'SE'}-${a.divisionName || 'A'}-${a.courseCode}-${a.type}`;
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(a);
  });

  console.log('\n--- Duplicate or Overlapping Subject Assignments ---');
  groupMap.forEach((list, key) => {
    if (list.length > 1) {
      console.log(`\nOverlapping Group [${key}]: ${list.length} assignment rows`);
      list.forEach(a => {
        console.log(`  - ID: ${a.id} | Teacher: ${a.teacher?.name} | Batches: "${a.batchName}" | Th:${a.theoryHours} Pr:${a.practicalHours} Tu:${a.tutorialHours} Proj:${a.projectHours} Tot:${a.totalHours}`);
      });
    }
  });
}

main().finally(() => prisma.$disconnect());
