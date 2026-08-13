import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Canonical subject workload derived from the authoritative Faculty Workload Master.
 * code → { lectureHours, practicalHours, tutorialHours, semester }
 * Only unique canonical course codes are listed here (no legacy aliases).
 */
const CANONICAL_WORKLOAD: Record<string, { lecture: number; practical: number; tutorial: number; semester?: number; labRequired?: boolean }> = {
  'CEF-260-COM':   { lecture: 0,  practical: 6,  tutorial: 0, semester: 3,  labRequired: true  },
  'PEC321COM':     { lecture: 3,  practical: 0,  tutorial: 0, semester: 5,  labRequired: false },
  'PCC-501-COM':   { lecture: 4,  practical: 0,  tutorial: 0, semester: 7,  labRequired: false },
  'OLE341COM':     { lecture: 2,  practical: 0,  tutorial: 0, semester: 5,  labRequired: false },
  'ELC342COM':     { lecture: 0,  practical: 0,  tutorial: 2, semester: 5,  labRequired: false },
  '410245(D)':     { lecture: 3,  practical: 0,  tutorial: 0, semester: 7,  labRequired: false },
  '410247':        { lecture: 0,  practical: 4,  tutorial: 0, semester: 7,  labRequired: true  },
  'PCC-503-COM':   { lecture: 4,  practical: 0,  tutorial: 0, semester: 7,  labRequired: false },
  'PCC-204-COM':   { lecture: 0,  practical: 8,  tutorial: 0, semester: 3,  labRequired: true  },
  'PCC303COM':     { lecture: 6,  practical: 0,  tutorial: 0, semester: 5,  labRequired: false },
  'PCC-504-COM':   { lecture: 4,  practical: 0,  tutorial: 0, semester: 7,  labRequired: false },
  'OEL-220-COM':   { lecture: 2,  practical: 0,  tutorial: 0, semester: 3,  labRequired: false },
  'EEM-240-COM':   { lecture: 0,  practical: 8,  tutorial: 4, semester: 3,  labRequired: true  },
  '410241':        { lecture: 3,  practical: 0,  tutorial: 0, semester: 7,  labRequired: false },
  'VEC-250-COM':   { lecture: 2,  practical: 0,  tutorial: 0, semester: 3,  labRequired: false },
  '410244(D)':     { lecture: 3,  practical: 0,  tutorial: 0, semester: 7,  labRequired: false },
  'PCC-203-COM':   { lecture: 3,  practical: 0,  tutorial: 0, semester: 3,  labRequired: false },
  '410246':        { lecture: 0,  practical: 8,  tutorial: 0, semester: 7,  labRequired: true  },
  '410242':        { lecture: 3,  practical: 0,  tutorial: 0, semester: 7,  labRequired: false },
  'PCC-502-COM':   { lecture: 4,  practical: 0,  tutorial: 0, semester: 7,  labRequired: false },
  'PEC322COM':     { lecture: 0,  practical: 8,  tutorial: 0, semester: 5,  labRequired: true  },
  '410245(C)':     { lecture: 3,  practical: 0,  tutorial: 0, semester: 7,  labRequired: false },
  'PCC-201-COMP':  { lecture: 3,  practical: 0,  tutorial: 0, semester: 3,  labRequired: false },
  'MDM-230-COM':   { lecture: 2,  practical: 0,  tutorial: 0, semester: 3,  labRequired: false },
  'PCC305COM':     { lecture: 0,  practical: 8,  tutorial: 0, semester: 5,  labRequired: true  },
  'PCC302COM':     { lecture: 3,  practical: 0,  tutorial: 0, semester: 5,  labRequired: false },
  '410243':        { lecture: 3,  practical: 0,  tutorial: 0, semester: 7,  labRequired: false },
  'PCC301COM':     { lecture: 3,  practical: 0,  tutorial: 0, semester: 5,  labRequired: false },
  'PCC304COM':     { lecture: 0,  practical: 8,  tutorial: 0, semester: 5,  labRequired: true  },
  'PCC-202-COM':   { lecture: 3,  practical: 0,  tutorial: 0, semester: 3,  labRequired: false },
  'PCC-205-COM':   { lecture: 0,  practical: 8,  tutorial: 0, semester: 3,  labRequired: true  },
  'MDM331COM':     { lecture: 0,  practical: 8,  tutorial: 4, semester: 5,  labRequired: true  },
  'PEC-521-COM':   { lecture: 3,  practical: 0,  tutorial: 0, semester: 7,  labRequired: false },
  'PCC-505-COM':   { lecture: 0,  practical: 4,  tutorial: 0, semester: 7,  labRequired: true  },
  'PEC-522-COM':   { lecture: 0,  practical: 2,  tutorial: 0, semester: 7,  labRequired: true  },
  'RM-601-COM':    { lecture: 4,  practical: 0,  tutorial: 0, semester: 7,  labRequired: false },
  // Project supervision subjects (flexible, no timetable slots)
  'PRJ-BE-401':    { lecture: 0,  practical: 0,  tutorial: 0, semester: 7,  labRequired: false },
  'PRJ-BE-402':    { lecture: 0,  practical: 0,  tutorial: 0, semester: 7,  labRequired: false },
  'PRJ-BE-403':    { lecture: 0,  practical: 0,  tutorial: 0, semester: 7,  labRequired: false },
  'PRJ-BE-404':    { lecture: 0,  practical: 0,  tutorial: 0, semester: 7,  labRequired: false },
};

const CANONICAL_NAMES: Record<string, string> = {
  'CEF-260-COM':  'Community Engagement Project',
  'PEC321COM':    'Elective I',
  'PCC-501-COM':  'Probability and Statistics',
  'OLE341COM':    'Open Elective',
  'ELC342COM':    'Technical Seminar',
  '410245(D)':    'Elective IV (D)',
  '410247':       'Laboratory Practice IV',
  'PCC-503-COM':  'Machine Learning',
  'PCC-204-COM':  'Data Structures Laboratory',
  'PCC303COM':    'Theory of Computation',
  'PCC-504-COM':  'Distributed Computing',
  'OEL-220-COM':  'Open Elective 1',
  'EEM-240-COM':  'Entrepreneurship Development',
  '410241':       'Design and Analysis of Algorithms',
  'VEC-250-COM':  'Universal Human Values and Professional Ethics',
  '410244(D)':    'Elective III',
  'PCC-203-COM':  'Operating Systems',
  '410246':       'Laboratory Practice III',
  '410242':       'Machine Learning',
  'PCC-502-COM':  'Advanced Algorithms',
  'PEC322COM':    'Elective I Lab',
  '410245(C)':    'Elective IV (C)',
  'PCC-201-COMP': 'Data Structures',
  'MDM-230-COM':  'Digital Electronics and Logic Design',
  'PCC305COM':    'Computer Networks Lab',
  'PCC302COM':    'Computer Networks',
  '410243':       'Blockchain Technology',
  'PCC301COM':    'Artificial Intelligence',
  'PCC304COM':    'Artificial Intelligence Lab',
  'PCC-202-COM':  'Object Oriented Programming and Computer Graphics',
  'PCC-205-COM':  'Object Oriented Programming and Computer Graphics Laboratory',
  'MDM331COM':    'Robotics and Automation',
  'PEC-521-COM':  'Elective I',
  'PCC-505-COM':  'Computational Laboratory-I',
  'PEC-522-COM':  'Skill Based Laboratory-I',
  'RM-601-COM':   'Research Methodology',
  'PRJ-BE-401':   'BE Major Project Supervision',
  'PRJ-BE-402':   'BE Major Project Supervision',
  'PRJ-BE-403':   'BE Major Project Supervision',
  'PRJ-BE-404':   'BE Major Project Supervision',
};

export async function seedSubjectWorkload() {
  console.log('[SubjectSeed] Updating canonical subject workload hours...');

  const compDept = await prisma.department.findFirst({
    where: { OR: [{ code: 'COMP' }, { name: 'Computer Engineering' }] }
  });
  if (!compDept) {
    console.error('[SubjectSeed] Computer Engineering department not found!');
    return;
  }

  let updatedCount = 0;
  let createdCount = 0;

  for (const [code, wl] of Object.entries(CANONICAL_WORKLOAD)) {
    const existing = await prisma.subject.findUnique({ where: { code } });

    if (existing) {
      await prisma.subject.update({
        where: { code },
        data: {
          lectureHours:   wl.lecture,
          practicalHours: wl.practical,
          tutorialHours:  wl.tutorial,
          labRequired:    wl.labRequired ?? existing.labRequired,
          isActive: true
        }
      });
      updatedCount++;
    } else {
      // Should not happen since all codes already exist, but create if missing
      const canonicalName = CANONICAL_NAMES[code] ?? code;
      await prisma.subject.create({
        data: {
          code,
          name:           canonicalName,
          semester:       wl.semester ?? 3,
          credits:        wl.lecture + wl.practical + wl.tutorial,
          departmentId:   compDept.id,
          labRequired:    wl.labRequired ?? false,
          lectureHours:   wl.lecture,
          practicalHours: wl.practical,
          tutorialHours:  wl.tutorial,
        }
      });
      createdCount++;
      console.log(`[SubjectSeed] Created missing subject: ${code} - ${canonicalName}`);
    }
  }

  console.log(`[SubjectSeed] Updated ${updatedCount} existing subjects.`);
  console.log(`[SubjectSeed] Created ${createdCount} new subjects.`);

  // Now link FacultyAssignment.subjectId for all rows that have a matching Subject by courseCode
  console.log('[SubjectSeed] Linking FacultyAssignment.subjectId by courseCode...');
  const allSubjects = await prisma.subject.findMany();
  const subjectByCode = new Map(allSubjects.map(s => [s.code, s.id]));

  const assignments = await prisma.facultyAssignment.findMany();
  let linkedCount = 0;
  let unmatchedCodes = new Set<string>();

  for (const a of assignments) {
    const subjectId = subjectByCode.get(a.courseCode as string);
    if (subjectId) {
      await prisma.facultyAssignment.update({
        where: { id: a.id },
        data: { subjectId }
      });
      linkedCount++;
    } else {
      unmatchedCodes.add(a.courseCode as string);
    }
  }

  console.log(`[SubjectSeed] Linked ${linkedCount} / ${assignments.length} assignments to Subject records.`);
  if (unmatchedCodes.size > 0) {
    console.warn(`[SubjectSeed] ⚠ ${unmatchedCodes.size} assignment course codes have NO Subject match:`, [...unmatchedCodes]);
  } else {
    console.log('[SubjectSeed] ✓ All assignments linked — 100% subject mapping achieved.');
  }
}

// Run standalone
import { PrismaClient as PC } from '@prisma/client';
const p = new PC();
seedSubjectWorkload().then(() => {
  console.log('[SubjectSeed] Done.');
}).catch(console.error).finally(() => p.$disconnect().catch(() => prisma.$disconnect()));
