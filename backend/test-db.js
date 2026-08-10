const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const entries = await prisma.timetableEntry.findMany({
    where: { type: 'PRACTICAL', dayOfWeek: 1, subject: { code: 'DS' } },
    include: { subject: true, division: true, batch: true }
  });
  entries.sort((a, b) => a.slotIndex - b.slotIndex);
  for (const e of entries) {
    console.log(`${e.dayOfWeek} | ${e.subject.code} | ${e.batch.name} | Slot: ${e.slotIndex} | Teacher: ${e.teacherId}`);
  }
}
run();
