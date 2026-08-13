import { PrismaClient } from '@prisma/client';
import { TimetableEngine } from '../services/timetableEngine';
import { validateTimetableZeroTrust } from '../services/timetableValidator';

const prisma = new PrismaClient();

const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SLOT_TIMES = [
  '',
  '08:30–09:30',
  '09:30–10:30',
  '10:30–10:45 [RECESS]',
  '10:45–11:45',
  '11:45–12:45',
  '12:45–13:30 [LUNCH]',
  '13:30–14:30',
  '14:30–15:30'
];

async function main() {
  console.log('==================================================');
  console.log('=== GENERATING FULL DEPARTMENT TIMETABLE (6 DIVISIONS) ===');
  console.log('==================================================\n');

  // Clean database generated entries before fresh run
  await prisma.timetableEntry.deleteMany({});
  await prisma.timetable.deleteMany({});

  const compDept = await prisma.department.findFirst({ where: { code: 'COMP' } });
  const divisions = await prisma.division.findMany({
    where: { isActive: true },
    include: { year: true }
  });

  const engine = new TimetableEngine();
  const result = await engine.generate({
    days: [1, 2, 3, 4, 5, 6],
    departmentId: compDept?.id
  });

  if (!result.isValid || !result.timetable?.id) {
    console.error('❌ Failed to generate timetable:', result.message);
    process.exit(1);
  }

  console.log(`✅ Timetable ${result.timetable.id} generated and verified 100%!`);
  const vReport = await validateTimetableZeroTrust(result.timetable.id);
  console.log(`Validation Summary: ${vReport.summary}`);
  console.log(`Data-Driven Coordination Report:`, JSON.stringify(vReport.coordinationReport, null, 2));

  // Fetch all created entries
  const allEntries = await prisma.timetableEntry.findMany({
    where: { timetableId: result.timetable.id },
    include: {
      subject: true,
      teacher: true,
      division: { include: { year: true } },
      batch: true,
      room: true,
      facultyAssignment: { include: { allowedLocations: true } }
    },
    orderBy: [{ dayOfWeek: 'asc' }, { slotIndex: 'asc' }]
  });

  // Group by division
  const divOrder = ['SE-A', 'SE-B', 'TE-A', 'TE-B', 'BE-A', 'BE-B'];
  const divMap = new Map<string, typeof allEntries>();

  for (const d of divisions) {
    const className = d.year?.year === 2 ? 'SE' : d.year?.year === 3 ? 'TE' : d.year?.year === 4 ? 'BE' : 'FE';
    const key = `${className}-${d.name}`;
    const divEntries = allEntries.filter(e => e.divisionId === d.id);
    divMap.set(key, divEntries);
  }

  for (const divKey of divOrder) {
    const entries = divMap.get(divKey) || [];
    console.log(`\n====================================================================================================`);
    console.log(`=== COMPLETE TIMETABLE FOR DIVISION: ${divKey} (${entries.length} Total Slot Entries) ===`);
    console.log(`====================================================================================================`);

    for (let day = 1; day <= 6; day++) {
      console.log(`\n--- ${DAY_NAMES[day].toUpperCase()} ---`);
      
      for (let slot = 1; slot <= 8; slot++) {
        if (slot === 3) {
          console.log(`  Slot 3 (${SLOT_TIMES[3]}): *** SHORT RECESS ***`);
          continue;
        }
        if (slot === 6) {
          console.log(`  Slot 6 (${SLOT_TIMES[6]}): *** LUNCH BREAK ***`);
          continue;
        }

        const slotEntries = entries.filter(e => e.dayOfWeek === day && e.slotIndex === slot);
        if (slotEntries.length === 0) {
          console.log(`  Slot ${slot} (${SLOT_TIMES[slot]}): FREE / UNASSIGNED`);
        } else if (slotEntries.length === 1 && !slotEntries[0].batchId) {
          // Division-wide Theory Lecture
          const e = slotEntries[0];
          console.log(`  Slot ${slot} (${SLOT_TIMES[slot]}): [THEORY - ALL BATCHES] Subject: ${e.subject.code} (${e.subject.name}) | Faculty: ${e.teacher.shortCode || e.teacher.name} | Room: ${e.room.roomNumber}`);
        } else {
          // Batch-wise Sessions (Practicals / Tutorials)
          console.log(`  Slot ${slot} (${SLOT_TIMES[slot]}): [BATCH-WISE SESSIONS]`);
          for (const e of slotEntries) {
            const bName = e.batch?.name || 'Batch?';
            const allowedR = e.facultyAssignment?.allowedLocations.map(l => l.roomNumber).join('/') || e.room.roomNumber;
            console.log(`     • Batch ${bName.padEnd(3)} → ${e.type.padEnd(9)} | Subject: ${e.subject.code.padEnd(12)} (${e.subject.name}) | Faculty: ${(e.teacher.shortCode || e.teacher.name).padEnd(10)} | Room: ${e.room.roomNumber} (Allowed: ${allowedR})`);
          }
        }
      }
    }
  }

  console.log('\n====================================================================================================');
  console.log('=== END OF COMPLETE TIMETABLE OUTPUT FOR ALL 6 DIVISIONS ===');
  console.log('====================================================================================================');
}

main()
  .catch(err => {
    console.error('Fatal error during timetable output generation:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
