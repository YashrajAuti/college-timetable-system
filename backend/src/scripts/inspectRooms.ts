import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const rooms = await prisma.room.findMany();
  console.log(`Total Rooms in DB: ${rooms.length}`);
  rooms.forEach(r => console.log(` - Room ${r.roomNumber}: capacity=${r.capacity}, isLab=${r.isLab}`));
}

main().finally(() => prisma.$disconnect());
