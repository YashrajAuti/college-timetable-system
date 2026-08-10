import { TimetableEngine } from './services/timetableEngine';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const engine = new TimetableEngine({ days: [1, 2, 3, 4, 5] }); // Mon-Fri
  const timetable = await engine.generate();
  
  if (timetable) {
    console.log(`Timetable generated successfully with ID: ${timetable.id}`);
    
    // Print a quick summary of the timetable (Monday)
    const entries = await prisma.timetableEntry.findMany({
      where: { timetableId: timetable.id, dayOfWeek: 1 },
      include: { subject: true, teacher: true, room: true, batch: true },
      orderBy: { slotIndex: 'asc' }
    });
    
    console.log("\n--- Monday Schedule ---");
    for (const e of entries) {
      if (e.type === 'PRACTICAL' || e.type === 'TUTORIAL') {
        console.log(`Slot ${e.slotIndex} [${e.startTime}-${e.endTime}] | Batch ${e.batch?.name} | ${e.subject.code} (${e.teacher.code}) @ ${e.room.name}`);
      } else {
        console.log(`Slot ${e.slotIndex} [${e.startTime}-${e.endTime}] | THEORY | ${e.subject.code} (${e.teacher.code}) @ ${e.room.name}`);
      }
    }
  } else {
    console.log("Failed to generate timetable.");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
