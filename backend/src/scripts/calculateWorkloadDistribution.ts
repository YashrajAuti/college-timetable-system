import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const assignments = await prisma.facultyAssignment.findMany({
    include: { teacher: true }
  });

  let th = 0, pr = 0, tu = 0, proj = 0;

  assignments.forEach(a => {
    th += a.theoryHours || 0;
    pr += a.practicalHours || 0;
    tu += a.tutorialHours || 0;
    proj += a.projectHours || 0;
  });

  const mandatory = th + pr + tu;
  const total = mandatory + proj;

  console.log(`=== Database Workload Totals ===`);
  console.log(`Total Assignment Rows: ${assignments.length}`);
  console.log(`Theory: ${th} hrs`);
  console.log(`Practical: ${pr} hrs`);
  console.log(`Tutorial: ${tu} hrs`);
  console.log(`Mandatory Timetable Workload (Th + Pr + Tu): ${mandatory} hrs`);
  console.log(`Project (Current): ${proj} hrs`);
  console.log(`Faculty Workload Total: ${total} hrs`);
}

main().finally(() => prisma.$disconnect());
