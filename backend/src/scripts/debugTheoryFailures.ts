import { PrismaClient } from '@prisma/client';
import { TimetableEngine } from '../services/timetableEngine';

const prisma = new PrismaClient();

async function main() {
  console.log("=== Debugging Theory & Tutorial Subtask Scheduling Failures ===");
  
  const assignments = await prisma.facultyAssignment.findMany({
    include: { teacher: true, subject: true, division: true, batch: true, allowedLocations: true }
  });

  const theoryAssignments = assignments.filter(a => (a.theoryHours && a.theoryHours > 0) || a.type === 'LECTURE');
  console.log(`Theory Assignment Rows: ${theoryAssignments.length}`);

  let totalThReq = 0;
  theoryAssignments.forEach(a => {
    const th = a.theoryHours || (a.type === 'LECTURE' ? a.weeklyHours : 0);
    totalThReq += th;
    console.log(`  - ${a.teacher?.name} | Code: ${a.courseCode} | Class: ${a.className} | Div: "${a.divisionName}" | Th: ${th}h`);
  });

  console.log(`Total Theory Hours Required Across All Divisions: ${totalThReq} hrs`);
}

main().finally(() => prisma.$disconnect());
