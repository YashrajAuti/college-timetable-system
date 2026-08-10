import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const divisions = await prisma.division.findMany({
    include: {
      batches: true,
      assignments: {
        include: { subject: true, teacher: true, batch: true }
      }
    }
  });

  for (const div of divisions) {
    console.log(`\nDivision: ${div.name}`);
    let theoryHours = 0;
    
    div.assignments.forEach(a => {
      if (a.type === 'LECTURE') {
        theoryHours += a.weeklyHours;
        console.log(`  Theory: ${a.subject.name} - ${a.weeklyHours} hrs/wk (Teacher: ${a.teacher.name})`);
      }
    });
    
    console.log(`  Total Theory Hours: ${theoryHours}`);

    for (const batch of div.batches) {
      let batchPracticalHours = 0;
      console.log(`  Batch: ${batch.name}`);
      div.assignments.forEach(a => {
        if (a.type === 'PRACTICAL' && a.batchId === batch.id) {
          batchPracticalHours += a.weeklyHours;
          console.log(`    Practical: ${a.subject.name} - ${a.weeklyHours} hrs/wk (Teacher: ${a.teacher.name})`);
        }
      });
      console.log(`    Total Practical Hours for ${batch.name}: ${batchPracticalHours}`);
      console.log(`    => Total weekly workload for a student in ${batch.name}: ${theoryHours + batchPracticalHours} hours`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
