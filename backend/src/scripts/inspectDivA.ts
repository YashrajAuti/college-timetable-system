import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const assignments = await prisma.facultyAssignment.findMany({
    where: { className: 'SE' },
    include: { teacher: true }
  });

  console.log(`SE Assignments Count: ${assignments.length}\n`);

  assignments.forEach((a, i) => {
    console.log(`[${i + 1}] Teacher: ${a.teacher?.name} | Code: ${a.courseCode} | Course: "${a.courseName}" | Div: ${a.divisionName} | Batch: ${a.batchName} | Th:${a.theoryHours} Pr:${a.practicalHours} Tu:${a.tutorialHours} Proj:${a.projectHours} Tot:${a.totalHours} | Type: ${a.type}`);
  });
}

main().finally(() => prisma.$disconnect());
