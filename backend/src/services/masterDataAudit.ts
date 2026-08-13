import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface MasterDataAuditResult {
  valid: boolean;
  reason?: 'INVALID_MASTER_DATA';
  errors: string[];
  summary: {
    assignmentsAudited: number;
    divisionsAudited: number;
    batchesAudited: number;
    roomsAudited: number;
    teachersAudited: number;
    subjectsAudited: number;
  };
}

export async function auditMasterData(options: {
  departmentId?: string;
  divisionIds?: string[];
  semesterFilter?: number;
} = {}): Promise<MasterDataAuditResult> {
  const errors: string[] = [];

  // 1. Fetch master records
  const [departments, divisions, batches, subjects, teachers, assignments, rooms, timeSlots] = await Promise.all([
    prisma.department.findMany({ where: { isActive: true } }),
    prisma.division.findMany({ where: { isActive: true }, include: { year: { include: { course: true } }, batches: true } }),
    prisma.batch.findMany({ where: { isActive: true }, include: { division: true } }),
    prisma.subject.findMany({ where: { isActive: true } }),
    prisma.teacher.findMany({ where: { isActive: true } }),
    prisma.facultyAssignment.findMany({
      where: { status: 'ACTIVE' },
      include: { teacher: true, subject: true, division: { include: { batches: true } }, batch: true, department: true }
    }),
    prisma.room.findMany({ where: { isActive: true } }),
    prisma.timeSlot.findMany({ orderBy: { index: 'asc' } }),
  ]);

  const deptMap = new Map(departments.map(d => [d.id, d]));
  const divMap = new Map(divisions.map(d => [d.id, d]));
  const batchMap = new Map(batches.map(b => [b.id, b]));
  const subjMap = new Map(subjects.map(s => [s.id, s]));
  const teacherMap = new Map(teachers.map(t => [t.id, t]));

  // 2. Validate TimeSlots
  if (timeSlots.length === 0) {
    errors.push('No TimeSlot definitions found in database.');
  }

  // 3. Validate Divisions & Batches
  for (const b of batches) {
    if (!b.divisionId || !divMap.has(b.divisionId)) {
      errors.push(`Orphan Batch ${b.name} (${b.id}) has invalid divisionId ${b.divisionId}`);
    }
  }

  // 4. Filter assignments if filter options specified
  const targetAssignments = assignments.filter(a => {
    if (!a.subject.isCanonical) return false;
    if (options.departmentId && options.departmentId !== 'ALL' && a.departmentId !== options.departmentId && a.teacher.departmentId !== options.departmentId) return false;
    if (options.divisionIds?.length && !options.divisionIds.includes(a.divisionId)) return false;
    if (options.semesterFilter && a.semester !== options.semesterFilter && a.subject.semester !== options.semesterFilter) return false;
    return true;
  });

  // 5. Validate FacultyAssignment integrity & strict batch-division relationships
  for (const a of targetAssignments) {
    // Check Teacher
    if (!a.teacherId || !teacherMap.has(a.teacherId)) {
      errors.push(`FacultyAssignment ${a.id}: invalid teacherId ${a.teacherId}`);
    }
    // Check Subject
    if (!a.subjectId || !subjMap.has(a.subjectId)) {
      errors.push(`FacultyAssignment ${a.id}: invalid subjectId ${a.subjectId}`);
    }
    // Check Division
    if (!a.divisionId || !divMap.has(a.divisionId)) {
      errors.push(`FacultyAssignment ${a.id}: invalid divisionId ${a.divisionId}`);
    }

    const div = divMap.get(a.divisionId);

    // CRITICAL: Validate Batch foreign key
    if (a.batchId) {
      const batchObj = batchMap.get(a.batchId);
      if (!batchObj) {
        errors.push(`FacultyAssignment ${a.id}: batchId ${a.batchId} does not exist in Batch database.`);
      } else if (batchObj.divisionId !== a.divisionId) {
        errors.push(
          `CRITICAL BATCH MISMATCH in FacultyAssignment ${a.id}: Batch ${batchObj.name} belongs to Division ID ${batchObj.divisionId}, but Assignment specifies Division ID ${a.divisionId} (${div?.name || ''})!`
        );
      }
    }

    // Check Subject semester consistency
    const assignmentSemester = (a.semester && a.semester !== 1) ? a.semester : a.subject.semester;
    if (a.subject.isCanonical && a.subject.semester !== assignmentSemester) {
      errors.push(`FacultyAssignment ${a.id}: Subject ${a.subject.code} canonical semester (${a.subject.semester}) does not match assignment semester (${assignmentSemester}).`);
    }
  }

  // 6. Validate Rooms
  if (rooms.length === 0) {
    errors.push('No Rooms available in database.');
  }

  const valid = errors.length === 0;

  return {
    valid,
    reason: valid ? undefined : 'INVALID_MASTER_DATA',
    errors,
    summary: {
      assignmentsAudited: targetAssignments.length,
      divisionsAudited: divisions.length,
      batchesAudited: batches.length,
      roomsAudited: rooms.length,
      teachersAudited: teachers.length,
      subjectsAudited: subjects.length,
    }
  };
}
