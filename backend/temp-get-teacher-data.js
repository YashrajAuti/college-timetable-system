const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const assignments = await prisma.facultyAssignment.findMany({
    include: { teacher: true, subject: true, division: true, batch: true }
  });

  const teacherLoad = {};
  assignments.forEach(a => {
    const t = a.teacher.name;
    if(!teacherLoad[t]) teacherLoad[t] = { total: 0, details: [] };
    teacherLoad[t].total += a.weeklyHours;
    teacherLoad[t].details.push(`${a.subject.name} (${a.type}) - ${a.division.name}${a.batch ? ' B:'+a.batch.name : ''} - ${a.weeklyHours}h`);
  });

  console.log(JSON.stringify(teacherLoad, null, 2));
}

main().catch(console.error).finally(()=>prisma.$disconnect());
