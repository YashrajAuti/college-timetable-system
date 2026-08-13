import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("=== Testing Parallel Practical Bundling Strategy ===");

  const assignments = await prisma.facultyAssignment.findMany({
    include: { teacher: true, subject: true, division: true, batch: true, allowedLocations: true }
  });

  console.log(`Total assignments: ${assignments.length}`);

  // Group practical assignments by Class and Division
  const divPracticalMap = new Map<string, any[]>();
  const divTheoryMap = new Map<string, any[]>();

  assignments.forEach(a => {
    const divKey = `${a.className || 'SE'}-${a.divisionName || 'A'}`;
    const pr = a.practicalHours || (a.type === 'PRACTICAL' ? a.weeklyHours : 0);
    const th = a.theoryHours || (a.type === 'LECTURE' ? a.weeklyHours : 0);

    if (pr > 0) {
      if (!divPracticalMap.has(divKey)) divPracticalMap.set(divKey, []);
      divPracticalMap.get(divKey)!.push(a);
    }
    if (th > 0) {
      if (!divTheoryMap.has(divKey)) divTheoryMap.set(divKey, []);
      divTheoryMap.get(divKey)!.push(a);
    }
  });

  console.log('\n--- Practical Assignments per Division ---');
  divPracticalMap.forEach((pList, divKey) => {
    console.log(`\nDivision [${divKey}]: ${pList.length} practical assignments`);
    pList.forEach(a => {
      console.log(`  - ${a.teacher?.name} | ${a.courseCode} | ${a.courseName} | Batches: ${a.batchName} | Pr: ${a.practicalHours || a.weeklyHours}h`);
    });
  });
}

main().finally(() => prisma.$disconnect());
