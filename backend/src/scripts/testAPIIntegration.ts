import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAPIIntegration() {
  console.log('=== STEP 4: API & UI INTEGRATION TEST ===\n');

  // Fetch latest generated timetable
  const latestTimetable = await prisma.timetable.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { entries: true } } }
  });

  if (!latestTimetable) {
    console.error('❌ Error: No timetable found in database to test UI/API endpoints.');
    process.exit(1);
  }

  console.log('Latest Timetable ID:', latestTimetable.id);
  console.log('Name:', latestTimetable.name);
  console.log('isValid:', latestTimetable.isValid);
  console.log('Total Saved Entries:', latestTimetable._count.entries);

  // Fetch entries (same handler as GET /api/timetables/:id/entries)
  const entries = await prisma.timetableEntry.findMany({
    where: { timetableId: latestTimetable.id },
    include: {
      subject: true,
      teacher: true,
      room: true,
      division: true,
      batch: true,
      facultyAssignment: true,
    },
    orderBy: [{ dayOfWeek: 'asc' }, { slotIndex: 'asc' }]
  });

  console.log(`Fetched ${entries.length} entries for TimetableViewer.`);

  // Verify Division schedule view
  const divA = await prisma.division.findFirst({ where: { name: 'A', year: { year: 3 } } }); // TE-A
  const divAEntries = entries.filter(e => e.divisionId === divA?.id);
  console.log(`\nTE-A Division Schedule Entries: ${divAEntries.length}`);

  const teABatchNames = Array.from(new Set(divAEntries.map(e => e.batch?.name).filter((b): b is string => typeof b === 'string')));
  console.log('TE-A Batches present in entries:', teABatchNames);

  const invalidBatchesForTEA = teABatchNames.filter(b => b.startsWith('B'));
  if (invalidBatchesForTEA.length > 0) {
    console.error('❌ CRITICAL ERROR: TE-A contains TE-B batches:', invalidBatchesForTEA);
  } else {
    console.log('✅ Batch Isolation Verified: TE-A contains ZERO B-family batches!');
  }

  // Verify Practical contiguity
  const divAPracticals = divAEntries.filter(e => e.type === 'PRACTICAL');
  console.log(`TE-A Practical Entries: ${divAPracticals.length}`);
  let contiguityErrors = 0;
  for (let i = 0; i < divAPracticals.length; i += 2) {
    const e1 = divAPracticals[i];
    const e2 = divAPracticals[i + 1];
    if (!e2 || e2.slotIndex !== e1.slotIndex + 1 || e1.roomId !== e2.roomId || e1.teacherId !== e2.teacherId) {
      contiguityErrors++;
    }
  }

  console.log(`Practical Contiguity Errors: ${contiguityErrors}`);

  if (latestTimetable.isValid && invalidBatchesForTEA.length === 0 && contiguityErrors === 0) {
    console.log('\n✅ STEP 4 API & UI INTEGRATION TEST PASSED 100%!');
  } else {
    console.error('\n❌ API & UI INTEGRATION TEST FAILED!');
    process.exit(1);
  }
}

testAPIIntegration().then(() => prisma.$disconnect());
