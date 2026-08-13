import { PrismaClient } from '@prisma/client';
import { TimetableEngine } from '../services/timetableEngine';

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
  let latestTt = await prisma.timetable.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { entries: true } } }
  });

  if (!latestTt || !latestTt.id || latestTt._count.entries === 0) {
    console.log('Generating full department timetable...');
    const compDept = await prisma.department.findFirst({ where: { code: 'COMP' } });
    const engine = new TimetableEngine();
    const result = await engine.generate({
      days: [1, 2, 3, 4, 5, 6],
      departmentId: compDept?.id
    });
    if (!result.isValid || !result.timetable?.id) {
      console.error('Failed to generate timetable:', result.message);
      process.exit(1);
    }
    latestTt = result.timetable;
  }

  if (!latestTt) {
    console.error('No timetable available.');
    process.exit(1);
  }

  const entries = await prisma.timetableEntry.findMany({
    where: { timetableId: latestTt.id },
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

  const divisions = await prisma.division.findMany({
    where: { isActive: true },
    include: { year: true }
  });

  const divOrder = ['SE-A', 'SE-B', 'TE-A', 'TE-B', 'BE-A', 'BE-B'];
  const divMap = new Map<string, typeof entries>();

  for (const d of divisions) {
    const className = d.year?.year === 2 ? 'SE' : d.year?.year === 3 ? 'TE' : d.year?.year === 4 ? 'BE' : 'FE';
    const key = `${className}-${d.name}`;
    const divEntries = entries.filter(e => e.divisionId === d.id);
    divMap.set(key, divEntries);
  }

  console.log(`====================================================================================================`);
  console.log(`=== MMIT TIMETABLE OUTPUT AUDIT FOR ALL 6 DIVISIONS (Timetable ID: ${latestTt.id}) ===`);
  console.log(`====================================================================================================\n`);

  for (const divKey of divOrder) {
    const divEntries = divMap.get(divKey) || [];
    console.log(`\n====================================================================================================`);
    console.log(`=== DIVISION: ${divKey} (${divEntries.length} Saved Slot Entries) ===`);
    console.log(`====================================================================================================`);

    for (let day = 1; day <= 6; day++) {
      console.log(`\n  --- ${DAY_NAMES[day].toUpperCase()} ---`);

      for (let slot = 1; slot <= 8; slot++) {
        if (slot === 3) {
          console.log(`    Slot 03 (${SLOT_TIMES[3]}): *** SHORT RECESS (Zero Sessions Allowed) ***`);
          continue;
        }
        if (slot === 6) {
          console.log(`    Slot 06 (${SLOT_TIMES[6]}): *** LUNCH BREAK (Zero Sessions Allowed) ***`);
          continue;
        }

        const slotEntries = divEntries.filter(e => e.dayOfWeek === day && e.slotIndex === slot);
        if (slotEntries.length === 0) {
          console.log(`    Slot 0${slot} (${SLOT_TIMES[slot]}): FREE / UNASSIGNED`);
        } else if (slotEntries.length === 1 && !slotEntries[0].batchId) {
          const e = slotEntries[0];
          console.log(`    Slot 0${slot} (${SLOT_TIMES[slot]}): [THEORY - ALL BATCHES] ${e.subject.code.padEnd(12)} (${e.subject.name}) | Faculty: ${(e.teacher.shortCode || e.teacher.name).padEnd(6)} | Room: ${e.room.roomNumber}`);
        } else {
          console.log(`    Slot 0${slot} (${SLOT_TIMES[slot]}): [BATCH-WISE SESSIONS]`);
          for (const e of slotEntries) {
            const bName = e.batch?.name || 'Batch?';
            const allowedR = e.facultyAssignment?.allowedLocations.map(l => l.roomNumber).join('/') || e.room.roomNumber;
            console.log(`       • Batch ${bName.padEnd(3)} → ${e.type.padEnd(9)} | Subject: ${e.subject.code.padEnd(12)} (${e.subject.name}) | Faculty: ${(e.teacher.shortCode || e.teacher.name).padEnd(6)} | Room: ${e.room.roomNumber} (Allowed: ${allowedR})`);
          }
        }
      }
    }
  }
}

main().then(() => prisma.$disconnect());
