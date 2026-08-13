import { PrismaClient } from '@prisma/client';
import { TimetableEngine } from '../services/timetableEngine';

const prisma = new PrismaClient();

async function testFailClosed() {
  console.log('=== STEP 5: FAIL-CLOSED IMPOSSIBLE-CASE TEST ===\n');

  // 1. Record original room states
  const originalRooms = await prisma.room.findMany({ select: { id: true, isLab: true } });
  const originalLabCount = originalRooms.filter(r => r.isLab).length;
  console.log(`Original Lab Rooms: ${originalLabCount} / Total Rooms: ${originalRooms.length}`);

  try {
    // 2. Simulate impossible condition: Mark ALL rooms as non-labs (isLab = false)
    console.log('Simulating impossible condition: Disabling ALL Lab rooms (isLab = false)...');
    await prisma.room.updateMany({ data: { isLab: false } });

    const disabledLabCount = await prisma.room.count({ where: { isLab: true } });
    console.log(`Available Lab Rooms after modification: ${disabledLabCount}`);

    // 3. Attempt timetable generation
    console.log('\nRunning timetable engine on impossible master data...');
    const engine = new TimetableEngine();
    const result = await engine.generate({ days: [1, 2, 3, 4, 5, 6] });

    console.log(`\nEngine Response Status: ${result.status}`);
    console.log(`Engine Response isValid: ${result.isValid}`);
    console.log(`Diagnostics returned: ${result.diagnostics.length}`);
    console.log(`Message: ${result.message}`);

    // 4. Verify ZERO records were persisted in DB
    const ttCount = await prisma.timetable.count();
    const entryCount = await prisma.timetableEntry.count();

    console.log(`\nDatabase Check:`);
    console.log(`  Saved Timetables: ${ttCount}`);
    console.log(`  Saved TimetableEntries: ${entryCount}`);

    const failClosedPassed =
      (result.status === 'NO_VALID_TIMETABLE' || result.status === 'INVALID_MASTER_DATA') &&
      result.isValid === false &&
      result.diagnostics.length > 0 &&
      ttCount === 0 &&
      entryCount === 0;

    if (failClosedPassed) {
      console.log('\n✅ FAIL-CLOSED BEHAVIOR VERIFIED 100%! ZERO INVALID DATA PERSISTED.');
    } else {
      console.error('\n❌ FAIL-CLOSED VERIFICATION FAILED!');
    }

  } finally {
    // 5. RESTORE TEST DATA EXACTLY TO ORIGINAL STATE
    console.log('\nRestoring room test data back to original state...');
    for (const r of originalRooms) {
      await prisma.room.update({
        where: { id: r.id },
        data: { isLab: r.isLab }
      });
    }

    const restoredLabCount = await prisma.room.count({ where: { isLab: true } });
    console.log(`Restored Lab Rooms: ${restoredLabCount} / Total Rooms: ${originalRooms.length}`);
    if (restoredLabCount === originalLabCount) {
      console.log('✅ TEST DATA RESTORED 100% UNCHANGED!');
    } else {
      console.error('❌ CRITICAL ERROR: Failed to restore original room test data!');
    }
  }
}

testFailClosed()
  .catch((err) => {
    console.error('Fatal error during fail-closed test:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
