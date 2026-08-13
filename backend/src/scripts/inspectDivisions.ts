import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const divisions = await prisma.division.findMany({ include: { year: { include: { course: true } } } });
  console.log(`Total Division records in DB: ${divisions.length}`);
  divisions.forEach(d => console.log(` - Division ID: ${d.id} | Name: "${d.name}" | Year: ${d.year?.year} | Course: ${d.year?.course?.name}`));

  console.log('\nDistinct divisionName strings in FacultyAssignment:');
  const distinctDivs = await prisma.facultyAssignment.groupBy({
    by: ['className', 'divisionName'],
    _count: { id: true },
    _sum: { totalHours: true }
  });

  distinctDivs.forEach(d => {
    console.log(` - Class: ${d.className} | Div: "${d.divisionName}" | Assignments: ${d._count.id} | Sum Hours: ${d._sum.totalHours}`);
  });
}

main().finally(() => prisma.$disconnect());
