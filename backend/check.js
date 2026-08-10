const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.facultyAssignment.findMany({ include: { subject: true, division: true, batch: true } })
  .then(res => console.log(res.length, res[0]))
  .finally(()=>p.$disconnect());
