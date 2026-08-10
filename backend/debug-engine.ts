import { TimetableEngine } from './src/services/timetableEngine';
import { PrismaClient } from '@prisma/client';

async function run() {
  const prisma = new PrismaClient();
  const timeSlots = await prisma.timeSlot.findMany({ orderBy: { index: 'asc' } });
  
  // Create a mock engine with the timeSlots
  const engine = new TimetableEngine({ days: [1], variant: 1 });
  (engine as any).timeSlots = timeSlots;
  
  const blocks = (engine as any).getPracticalBlocks(1);
  console.log('Returned blocks:');
  for (const b of blocks) {
    console.log(`Day ${b.day} | Slot1: ${b.slot1.index} | Slot2: ${b.slot2.index}`);
  }
}
run();
