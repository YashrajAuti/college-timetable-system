import { PrismaClient } from '@prisma/client';
import { TimetableEngine } from '../services/timetableEngine';
import fs from 'fs';
import path from 'path';

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
    console.log('No timetable found in DB. Generating full department timetable...');
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

  let mdContent = `# MMIT Complete 6-Division Timetable Output Audit\n\n`;
  mdContent += `**Timetable ID**: \`${latestTt.id}\`  \n`;
  mdContent += `**Academic Year**: \`${latestTt.academicYear}\` | **Total Preserved Entries**: \`${entries.length}\`  \n\n`;

  for (const divKey of divOrder) {
    const divEntries = divMap.get(divKey) || [];
    mdContent += `\n---\n\n## Division: ${divKey} (${divEntries.length} Saved Entries)\n\n`;

    for (let day = 1; day <= 6; day++) {
      mdContent += `### ${DAY_NAMES[day]}\n\n`;
      mdContent += `| Time Slot | Type | Details (Subject, Faculty, Batch, Room) |\n`;
      mdContent += `| :--- | :--- | :--- |\n`;

      for (let slot = 1; slot <= 8; slot++) {
        if (slot === 3) {
          mdContent += `| **03** (10:30–10:45) | **SHORT RECESS** | ☕ *Short Break — Zero Sessions Allowed* |\n`;
          continue;
        }
        if (slot === 6) {
          mdContent += `| **06** (12:45–13:30) | **LUNCH BREAK** | 🍱 *Lunch Break — Zero Sessions Allowed* |\n`;
          continue;
        }

        const slotEntries = divEntries.filter(e => e.dayOfWeek === day && e.slotIndex === slot);
        if (slotEntries.length === 0) {
          mdContent += `| **0${slot}** (${SLOT_TIMES[slot]}) | *FREE* | Unassigned / Free Slot |\n`;
        } else if (slotEntries.length === 1 && !slotEntries[0].batchId) {
          const e = slotEntries[0];
          mdContent += `| **0${slot}** (${SLOT_TIMES[slot]}) | **THEORY (ALL BATCHES)** | **${e.subject.code}** (${e.subject.name}) — **${e.teacher.shortCode || e.teacher.name}** @ Room **${e.room.roomNumber}** |\n`;
        } else {
          const batchDetails = slotEntries.map(e => {
            const bName = e.batch?.name || 'Batch?';
            const allowedR = e.facultyAssignment?.allowedLocations.map(l => l.roomNumber).join('/') || e.room.roomNumber;
            return `Batch **${bName}**: ${e.type} **${e.subject.code}** (${e.subject.name}) — **${e.teacher.shortCode || e.teacher.name}** @ **${e.room.roomNumber}** *(Allowed: ${allowedR})*`;
          }).join('<br/>');
          mdContent += `| **0${slot}** (${SLOT_TIMES[slot]}) | **BATCH-WISE** | ${batchDetails} |\n`;
        }
      }
      mdContent += `\n`;
    }
  }

  const outputPath = path.join(process.cwd(), 'full_timetable_report.md');
  fs.writeFileSync(outputPath, mdContent);
  console.log(`✅ Timetable report written to: ${outputPath}`);
}

main().then(() => prisma.$disconnect());
