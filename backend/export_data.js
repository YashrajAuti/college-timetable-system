const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function exportData() {
  const teachers = await prisma.teacher.findMany({ include: { department: true } });
  const subjects = await prisma.subject.findMany({ include: { department: true } });
  const rooms = await prisma.room.findMany({ include: { department: true } });
  
  const data = {
    teachers,
    subjects,
    rooms
  };
  
  fs.writeFileSync('C:/Users/Asus/.gemini/antigravity/scratch/backend_data.json', JSON.stringify(data, null, 2));
  console.log('Exported ' + teachers.length + ' teachers, ' + subjects.length + ' subjects, ' + rooms.length + ' rooms.');
}

exportData().catch(console.error).finally(() => prisma.$disconnect());
