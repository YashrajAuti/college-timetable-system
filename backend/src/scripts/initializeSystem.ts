/**
 * MMIT System Initialization Script
 * - Marks legacy subjects as isCanonical=false and sets canonicalSubjectId
 * - Links FacultyAssignments that reference legacy subjects to canonical subjects
 * - Seeds SystemConfig with default settings
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Authoritative legacy → canonical mapping
const LEGACY_MAP: Record<string, string> = {
  'DS': 'PCC-201-COMP',
  'OOPCG': 'PCC-202-COM',
  'OS': 'PCC-203-COM',
  'DSL': 'PCC-204-COM',
  'OOPCGL': 'PCC-205-COM',
  'AI': 'PCC301COM',
  'CN': 'PCC302COM',
  'TOC': 'PCC303COM',
  'DAA': '410241',
  'ML': '410242',
  'PCC-201-COM': 'PCC-201-COMP',
  'EEM-231-COM': 'EEM-240-COM',
  'MDM-221-COM': 'MDM-230-COM',
  'CEP-241-COM': 'CEF-260-COM',
};

const DEFAULT_SETTINGS: Record<string, unknown> = {
  collegeName: 'Marathwada Mitramandal\'s Institute of Technology',
  collegeShortName: 'MMIT',
  academicYear: '2026-27',
  currentSemester: 3,
  workingDays: [1, 2, 3, 4, 5], // Mon-Fri
  allowSaturday: false,
  timeSlots: [
    { index: 1, startTime: '08:30', endTime: '09:30', isBreak: false },
    { index: 2, startTime: '09:30', endTime: '10:30', isBreak: false },
    { index: 3, startTime: '10:30', endTime: '10:45', isBreak: true, breakName: 'Short Recess' },
    { index: 4, startTime: '10:45', endTime: '11:45', isBreak: false },
    { index: 5, startTime: '11:45', endTime: '12:45', isBreak: false },
    { index: 6, startTime: '12:45', endTime: '13:30', isBreak: true, breakName: 'Lunch Break' },
    { index: 7, startTime: '13:30', endTime: '14:30', isBreak: false },
    { index: 8, startTime: '14:30', endTime: '15:30', isBreak: false },
  ],
  // Practical 2-hour blocks (pairs of consecutive non-break slot indices)
  practicalBlocks: [
    [1, 2],  // 08:30–10:30
    [4, 5],  // 10:45–12:45
    [7, 8],  // 13:30–15:30
  ],
  generation: {
    allowParallelBatches: true,
    balanceFacultyWorkload: true,
    minimizeStudentGaps: true,
    minimizeFacultyGaps: true,
    preferFixedRooms: true,
    preferConsecutivePracticals: true,
    maxFacultyHoursPerDay: 6,
    maxTheoryPeriodsPerDay: 4,
    maxPracticalBlocksPerDay: 2,
    solverTimeoutSeconds: 120,
  },
};

async function main() {
  console.log('=== MMIT System Initialization ===\n');

  // 1. Mark all subjects as canonical by default, then mark legacy ones
  console.log('[1] Setting all subjects to isCanonical=true...');
  await prisma.subject.updateMany({ data: { isCanonical: true, canonicalSubjectId: null } });

  // 2. Mark legacy subjects and link to canonical
  console.log('[2] Marking legacy subjects and linking to canonical...');
  let legacyCount = 0;
  let migrated = 0;

  for (const [legacyCode, canonicalCode] of Object.entries(LEGACY_MAP)) {
    const legacy = await prisma.subject.findUnique({ where: { code: legacyCode } });
    const canonical = await prisma.subject.findUnique({ where: { code: canonicalCode } });

    if (!legacy) {
      console.log(`  SKIP: Legacy code ${legacyCode} not found in DB`);
      continue;
    }
    if (!canonical) {
      console.log(`  WARN: Canonical code ${canonicalCode} not found for legacy ${legacyCode}`);
      continue;
    }

    await prisma.subject.update({
      where: { id: legacy.id },
      data: { isCanonical: false, canonicalSubjectId: canonical.id }
    });
    legacyCount++;

    // Migrate assignments from legacy to canonical subject
    const assignmentCount = await prisma.facultyAssignment.count({
      where: { subjectId: legacy.id }
    });
    if (assignmentCount > 0) {
      await prisma.facultyAssignment.updateMany({
        where: { subjectId: legacy.id },
        data: { subjectId: canonical.id }
      });
      migrated += assignmentCount;
      console.log(`  MIGRATED: ${legacyCode} → ${canonicalCode} (${assignmentCount} assignments)`);
    } else {
      console.log(`  MARKED: ${legacyCode} → ${canonicalCode} (no assignments to migrate)`);
    }
  }

  console.log(`  Done: ${legacyCount} legacy subjects marked, ${migrated} assignments migrated\n`);

  // 3. Verify all assignments now point to canonical subjects
  console.log('[3] Verifying assignment → canonical subject links...');
  const nonCanonical = await prisma.facultyAssignment.findMany({
    include: { subject: true },
    where: { subject: { isCanonical: false } }
  });
  if (nonCanonical.length > 0) {
    console.log(`  WARN: ${nonCanonical.length} assignments still point to legacy subjects:`);
    for (const a of nonCanonical) {
      console.log(`    Assignment ${a.id} → Subject ${a.subject.code} (legacy)`);
    }
  } else {
    console.log('  OK: All assignments point to canonical subjects\n');
  }

  // 4. Seed SystemConfig
  console.log('[4] Seeding SystemConfig defaults...');
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await prisma.systemConfig.upsert({
      where: { key },
      create: { key, value: JSON.stringify(value) },
      update: { value: JSON.stringify(value) }
    });
    console.log(`  SET: ${key}`);
  }

  // 5. Summary stats
  const [totalSubjects, canonicalSubjects, legacySubjects, totalAssignments] = await Promise.all([
    prisma.subject.count(),
    prisma.subject.count({ where: { isCanonical: true } }),
    prisma.subject.count({ where: { isCanonical: false } }),
    prisma.facultyAssignment.count(),
  ]);

  console.log('\n=== Initialization Complete ===');
  console.log(`Total subjects:     ${totalSubjects}`);
  console.log(`Canonical subjects: ${canonicalSubjects}`);
  console.log(`Legacy subjects:    ${legacySubjects}`);
  console.log(`Total assignments:  ${totalAssignments}`);

  // Mandatory hours count
  const assignments = await prisma.facultyAssignment.findMany();
  const totalTh = assignments.reduce((s, a) => s + a.theoryHours, 0);
  const totalPr = assignments.reduce((s, a) => s + a.practicalHours, 0);
  const totalTu = assignments.reduce((s, a) => s + a.tutorialHours, 0);
  const totalProj = assignments.reduce((s, a) => s + a.projectHours, 0);
  console.log(`\nMandatory class hours:  ${totalTh + totalPr + totalTu} (Theory:${totalTh} Practical:${totalPr} Tutorial:${totalTu})`);
  console.log(`Faculty project hours:  ${totalProj}`);
  console.log(`Total faculty workload: ${totalTh + totalPr + totalTu + totalProj}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
