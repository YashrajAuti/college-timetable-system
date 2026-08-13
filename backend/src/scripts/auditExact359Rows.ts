import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const assignments = await prisma.facultyAssignment.findMany({
    include: { teacher: true }
  });

  let th = 0, pr = 0, tu = 0, proj = 0;

  assignments.forEach(a => {
    const aTh = a.theoryHours || (a.type === 'LECTURE' ? a.weeklyHours : 0);
    const aPr = a.practicalHours || (a.type === 'PRACTICAL' ? a.weeklyHours : 0);
    const aTu = a.tutorialHours || (a.type === 'TUTORIAL' ? a.weeklyHours : 0);
    const aProj = a.projectHours || 0;

    th += aTh;
    pr += aPr;
    tu += aTu;
    proj += aProj;
  });

  console.log(`=== Exact Workload Audit Across ${assignments.length} Rows ===`);
  console.log(`Theory: ${th} hrs`);
  console.log(`Practical: ${pr} hrs`);
  console.log(`Tutorial: ${tu} hrs`);
  console.log(`Mandatory Timetable Workload (Th + Pr + Tu): ${th + pr + tu} hrs`);
  console.log(`Flexible Project Workload: ${proj} hrs`);
  console.log(`Faculty Workload Directory Total: ${th + pr + tu + proj} hrs`);
}

main().finally(() => prisma.$disconnect());
