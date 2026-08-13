import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanInvalidTimetables() {
  console.log('=== PHASE 1: SAFE CLEANUP AUDIT ===\n');

  // 1. Record master data counts BEFORE deletion
  const masterBefore = {
    departments: await prisma.department.count(),
    courses: await prisma.course.count(),
    courseYears: await prisma.courseYear.count(),
    divisions: await prisma.division.count(),
    batches: await prisma.batch.count(),
    subjects: await prisma.subject.count(),
    teachers: await prisma.teacher.count(),
    facultyAssignments: await prisma.facultyAssignment.count(),
    rooms: await prisma.room.count(),
    systemConfig: await prisma.systemConfig.count(),
    timeSlots: await prisma.timeSlot.count(),
  };

  const genBefore = {
    timetables: await prisma.timetable.count(),
    timetableEntries: await prisma.timetableEntry.count(),
  };

  console.log('--- BEFORE DELETION ---');
  console.log('Generated Data:');
  console.log(`  Timetables: ${genBefore.timetables}`);
  console.log(`  TimetableEntries: ${genBefore.timetableEntries}`);
  console.log('Master Data (Must stay unchanged):');
  Object.entries(masterBefore).forEach(([key, val]) => {
    console.log(`  ${key}: ${val}`);
  });

  // 2. Perform safe deletion of ONLY generated timetable tables
  console.log('\nDeleting generated timetable data...');
  const deletedEntries = await prisma.timetableEntry.deleteMany({});
  const deletedTimetables = await prisma.timetable.deleteMany({});

  console.log(`Deleted ${deletedEntries.count} TimetableEntry records.`);
  console.log(`Deleted ${deletedTimetables.count} Timetable records.`);

  // 3. Record counts AFTER deletion
  const masterAfter = {
    departments: await prisma.department.count(),
    courses: await prisma.course.count(),
    courseYears: await prisma.courseYear.count(),
    divisions: await prisma.division.count(),
    batches: await prisma.batch.count(),
    subjects: await prisma.subject.count(),
    teachers: await prisma.teacher.count(),
    facultyAssignments: await prisma.facultyAssignment.count(),
    rooms: await prisma.room.count(),
    systemConfig: await prisma.systemConfig.count(),
    timeSlots: await prisma.timeSlot.count(),
  };

  const genAfter = {
    timetables: await prisma.timetable.count(),
    timetableEntries: await prisma.timetableEntry.count(),
  };

  console.log('\n--- AFTER DELETION ---');
  console.log('Generated Data:');
  console.log(`  Timetables: ${genAfter.timetables}`);
  console.log(`  TimetableEntries: ${genAfter.timetableEntries}`);
  console.log('Master Data:');
  Object.entries(masterAfter).forEach(([key, val]) => {
    console.log(`  ${key}: ${val}`);
  });

  // 4. Integrity Checks
  if (genAfter.timetables !== 0 || genAfter.timetableEntries !== 0) {
    console.error('\n❌ ERROR: Generated timetable records remain!');
    process.exit(1);
  }

  let masterCorrupted = false;
  for (const key of Object.keys(masterBefore) as (keyof typeof masterBefore)[]) {
    if (masterBefore[key] !== masterAfter[key]) {
      console.error(`❌ CRITICAL ERROR: Master data count changed for ${key}! Before: ${masterBefore[key]}, After: ${masterAfter[key]}`);
      masterCorrupted = true;
    }
  }

  if (masterCorrupted) {
    console.error('\n❌ ABORTING: Master data integrity compromised!');
    process.exit(1);
  }

  console.log('\n✅ PHASE 1 SAFE CLEANUP COMPLETED SUCCESSFULLY!');
  console.log('All generated timetables removed. Master data 100% preserved.');
}

cleanInvalidTimetables()
  .catch((err) => {
    console.error('Fatal error during cleanup:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
