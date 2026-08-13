import { PrismaClient } from '@prisma/client';
import { TimetableEngine } from './src/services/timetableEngine';

const prisma = new PrismaClient();

async function main() {
  const compDept = await prisma.department.findFirst({ where: { code: 'COMP' } });
  const engine = new TimetableEngine();
  const result = await engine.generate({
    days: [1, 2, 3, 4, 5, 6],
    departmentId: compDept?.id
  });
  
  if (!result.isValid || !result.timetable?.id) {
    console.error('Failed to generate:', result.message);
    process.exit(1);
  }
  
  const entries = await prisma.timetableEntry.findMany({
    where: { timetableId: result.timetable.id },
    include: {
      subject: true,
      teacher: true,
      division: { include: { year: true } },
      batch: true,
      room: true
    },
    orderBy: [{ dayOfWeek: 'asc' }, { slotIndex: 'asc' }]
  });

  const divisions = await prisma.division.findMany({
    where: { isActive: true },
    include: { year: true }
  });

  const divOrder = ['SE-A', 'SE-B', 'TE-A', 'TE-B', 'BE-A', 'BE-B'];
  const divMap = new Map();

  for (const d of divisions) {
    const className = d.year?.year === 2 ? 'SE' : d.year?.year === 3 ? 'TE' : d.year?.year === 4 ? 'BE' : 'FE';
    const key = `${className}-${d.name}`;
    divMap.set(key, entries.filter(e => e.divisionId === d.id));
  }

  let out = `==== FULL AUDIT OUTPUT ====\n`;
  for (const divKey of divOrder) {
    const divEntries = divMap.get(divKey) || [];
    out += `${divKey}\n`;
    for (let day = 1; day <= 6; day++) {
      let dayStr = `D${day}: `;
      for (let slot = 1; slot <= 8; slot++) {
        if (slot === 3 || slot === 6) continue;
        const slotE = divEntries.filter(e => e.dayOfWeek === day && e.slotIndex === slot);
        if (slotE.length === 0) continue;
        if (slotE.length === 1 && !slotE[0].batchId) {
           dayStr += `S${slot}[Th:${slotE[0].subject.code} ${slotE[0].teacher.shortCode || slotE[0].teacher.name} ${slotE[0].room.roomNumber}] `;
        } else {
           dayStr += `S${slot}[Pr: `;
           for (const e of slotE) {
             dayStr += `${e.batch?.name}-${e.subject.code}-${e.teacher.shortCode || e.teacher.name}-${e.room.roomNumber} `;
           }
           dayStr = dayStr.trim() + `] `;
        }
      }
      out += dayStr.trim() + '\n';
    }
  }
  console.log(out);
}

main().finally(() => prisma.$disconnect());
