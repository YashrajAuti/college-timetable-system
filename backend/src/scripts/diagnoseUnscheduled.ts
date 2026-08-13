import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const assignments = await prisma.facultyAssignment.findMany({
    include: { teacher: true, subject: true, division: true, batch: true }
  });

  console.log(`Total FacultyAssignments in DB: ${assignments.length}`);

  let sumReqHours = 0;
  assignments.forEach((a, i) => {
    const th = a.theoryHours || (a.type === 'LECTURE' ? a.weeklyHours : 0);
    const pr = a.practicalHours || (a.type === 'PRACTICAL' ? a.weeklyHours : 0);
    const tu = a.tutorialHours || (a.type === 'TUTORIAL' ? a.weeklyHours : 0);
    const proj = a.projectHours || (a.type === 'PROJECT' || a.type === 'SEMINAR' ? a.weeklyHours : 0);
    const tot = a.totalHours || (th + pr + tu + proj);

    sumReqHours += tot;
    if (i < 20) {
      console.log(`[${i+1}] ${a.teacher?.name} | Code: ${a.courseCode} | Class: ${a.className} | Div: ${a.divisionName} | Batch: ${a.batchName || '-'} | Type: ${a.type} | Th:${th} Pr:${pr} Tu:${tu} Proj:${proj} Total:${tot}`);
    }
  });

  console.log(`\nSum of totalHours across all ${assignments.length} FacultyAssignment rows: ${sumReqHours}`);
}

main().finally(() => prisma.$disconnect());
