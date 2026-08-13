import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const assignments = await prisma.facultyAssignment.findMany({
    include: { teacher: true }
  });

  console.log(`Total FacultyAssignment rows: ${assignments.length}\n`);

  assignments.forEach((a, i) => {
    console.log(`[${i + 1}] ID: ${a.id} | Teacher: ${a.teacher?.name} | Code: ${a.courseCode} | Name: "${a.courseName}" | Class: ${a.className} | Div: "${a.divisionName}" | Batch: "${a.batchName}" | Th:${a.theoryHours} Pr:${a.practicalHours} Tu:${a.tutorialHours} Proj:${a.projectHours} Tot:${a.totalHours} | Type: ${a.type}`);
  });
}

main().finally(() => prisma.$disconnect());
