import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ExpandedSession {
  sessionId: string;
  facultyAssignmentId: string;
  departmentId: string;
  semester: number;
  className: string;
  divisionId: string;
  divisionName: string;
  batchId: string | null;
  batchName: string | null;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  type: 'LECTURE' | 'PRACTICAL' | 'TUTORIAL';
  duration: 1 | 2;
  /**
   * 'LAB'       – must use a lab room
   * 'CLASSROOM' – must use a classroom (non-lab)
   * 'ANY'       – tutorials: may use labs or classrooms per allowedLocations
   */
  requiredRoomType: 'LAB' | 'CLASSROOM' | 'ANY';
  allowedRoomIds: string[];
}

export async function expandFacultyAssignmentsToSessions(options: {
  departmentId?: string;
  divisionIds?: string[];
  semesterFilter?: number;
} = {}): Promise<ExpandedSession[]> {
  const where: any = {
    status: 'ACTIVE',
    subject: { isCanonical: true }
  };

  if (options.departmentId && options.departmentId !== 'ALL') {
    where.OR = [
      { departmentId: options.departmentId },
      { teacher: { departmentId: options.departmentId } }
    ];
  }
  if (options.divisionIds?.length) {
    where.divisionId = { in: options.divisionIds };
  }

  const [assignments, rooms] = await Promise.all([
    prisma.facultyAssignment.findMany({
      where,
      include: {
        teacher: true,
        subject: true,
        division: { include: { year: true } },
        batch: true,
        allowedLocations: true,
      }
    }),
    prisma.room.findMany({ where: { isActive: true } }),
  ]);

  // Get batches ONLY for the involved divisions
  const involvedDivIds = [...new Set(assignments.map(a => a.divisionId))];
  const allBatches = await prisma.batch.findMany({
    where: { divisionId: { in: involvedDivIds } },
    orderBy: { name: 'asc' },
  });

  const labRooms       = rooms.filter(r => r.isLab);
  const classroomRooms = rooms.filter(r => !r.isLab);
  const roomByNumber   = new Map(rooms.map(r => [r.roomNumber.toUpperCase(), r]));

  // Build maps: divisionId → { batchesByName, batchesById }
  const divBatchesByName = new Map<string, Map<string, { id: string; name: string }>>();
  const divBatchesById   = new Map<string, Map<string, { id: string; name: string }>>();
  for (const b of allBatches) {
    if (!divBatchesByName.has(b.divisionId)) {
      divBatchesByName.set(b.divisionId, new Map());
      divBatchesById.set(b.divisionId, new Map());
    }
    divBatchesByName.get(b.divisionId)!.set(b.name.trim().toUpperCase(), { id: b.id, name: b.name });
    divBatchesById.get(b.divisionId)!.set(b.id, { id: b.id, name: b.name });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MMIT BATCH ASSIGNMENT ALGORITHM
  //
  // FacultyAssignment.batchName is a CSV string listing the batch(es) this
  // teacher is responsible for. Examples:
  //   "A1,A4"        → teacher handles batches A1 and A4
  //   "A1,A2,A3,A4"  → teacher handles all 4 batches
  //   "A1,A2,B1,B2"  → handles A1,A2 (B1,B2 are another division — filtered out)
  //
  // For a practical session with N blocks and M assigned batches:
  //   - Round-robin assign each block to one batch
  //   - Block i → batch[i % M]
  //   - Each batch gets ⌊N/M⌋ or ⌈N/M⌉ blocks from this teacher
  //
  // This produces batch-specific sessions, enabling coordinated scheduling:
  //   teacher1: A1→AI Lab, A2→AI Lab
  //   teacher2: A3→DS Lab, A4→DS Lab
  //   → all 4 batches in same time-block → coordinated rotation achieved
  // ──────────────────────────────────────────────────────────────────────────

  function resolveBatchesForAssignment(
    a: typeof assignments[0]
  ): Array<{ id: string; name: string }> {
    const divId = a.divisionId;
    const batchNameMap = divBatchesByName.get(divId) || new Map<string, { id: string; name: string }>();
    const batchIdMap   = divBatchesById.get(divId)   || new Map<string, { id: string; name: string }>();

    // 1. If the assignment has a specific batchId → use it
    if (a.batchId && batchIdMap.has(a.batchId)) {
      return [batchIdMap.get(a.batchId)!];
    }

    // 2. Parse batchName CSV string → filter to valid batches of THIS division only
    //    (cross-division batch names like 'B1,B2' in SE-A are silently filtered out)
    const rawBatchName = (a as any).batchName as string | null;
    if (rawBatchName && rawBatchName.trim() && !['All', 'ALL', '-', ''].includes(rawBatchName.trim())) {
      const parsedNames = rawBatchName.split(',').map((n: string) => n.trim().toUpperCase());
      const resolved = parsedNames
        .map((name: string) => batchNameMap.get(name))
        .filter((b): b is { id: string; name: string } => Boolean(b));
      if (resolved.length > 0) return resolved;
    }

    // 3. Fallback: if no batch info, return all batches of the division
    return [...batchNameMap.values()];
  }

  const sessions: ExpandedSession[] = [];
  let counter = 0;

  for (const a of assignments) {
    const semester = (a.semester && a.semester !== 1) ? a.semester : a.subject.semester;
    if (options.semesterFilter && semester !== options.semesterFilter) {
      continue;
    }

    const base = {
      facultyAssignmentId: a.id,
      departmentId:        a.departmentId || a.teacher.departmentId,
      semester,
      className:    a.className || (a.division?.year?.year ? `Year ${a.division.year.year}` : 'SE'),
      divisionId:   a.divisionId,
      divisionName: a.divisionName || a.division.name,
      subjectId:    a.subjectId,
      subjectCode:  a.courseCode || a.subject.code,
      subjectName:  a.courseName || a.subject.name,
      teacherId:    a.teacherId,
      teacherName:  a.teacher.name,
    };

    // ── Resolve allowed rooms ─────────────────────────────────────────────────
    let allowedClassrooms: string[] = classroomRooms.map(r => r.id);
    let allowedLabs:       string[] = labRooms.map(r => r.id);
    let allowedAny:        string[] = rooms.map(r => r.id);

    if (a.allowedLocations && a.allowedLocations.length > 0) {
      const specifiedRooms = a.allowedLocations
        .map(loc => roomByNumber.get(loc.roomNumber.toUpperCase()))
        .filter((r): r is NonNullable<typeof r> => Boolean(r));

      if (specifiedRooms.length > 0) {
        const specLabIds = [...new Set(specifiedRooms.filter(r => r.isLab).map(r => r.id))];
        const specClsIds = [...new Set(specifiedRooms.filter(r => !r.isLab).map(r => r.id))];
        const specAllIds = [...new Set(specifiedRooms.map(r => r.id))];

        allowedLabs       = specLabIds.length > 0 ? specLabIds : labRooms.map(r => r.id);
        allowedClassrooms = specClsIds.length > 0 ? specClsIds : classroomRooms.map(r => r.id);
        allowedAny        = specAllIds.length > 0 ? specAllIds : rooms.map(r => r.id);
      }
    }

    // ── 1. THEORY (LECTURE) Sessions ──────────────────────────────────────────
    // Theory is ALWAYS division-wide (batchId = null)
    for (let i = 0; i < a.theoryHours; i++) {
      sessions.push({
        ...base,
        sessionId:        `SESS_${a.id}_TH_${i + 1}_${++counter}`,
        batchId:          null,
        batchName:        null,
        type:             'LECTURE',
        duration:         1,
        requiredRoomType: 'CLASSROOM',
        allowedRoomIds:   allowedClassrooms,
      });
    }

    // ── 2. TUTORIAL Sessions ───────────────────────────────────────────────────
    // MMIT: tutorials are batch-wise and may run in labs or classrooms (requiredRoomType='ANY')
    if (a.tutorialHours > 0) {
      const divBatches = [...(divBatchesByName.get(a.divisionId)?.values() || [])];
      if (divBatches.length > 0) {
        const assignedBatches = resolveBatchesForAssignment(a);
        if (assignedBatches.length > 0) {
          for (let i = 0; i < a.tutorialHours; i++) {
            const batch = assignedBatches[i % assignedBatches.length];
            sessions.push({
              ...base,
              sessionId:        `SESS_${a.id}_TU_${i + 1}_${++counter}`,
              batchId:          batch.id,
              batchName:        batch.name,
              type:             'TUTORIAL',
              duration:         1,
              requiredRoomType: 'ANY',
              allowedRoomIds:   allowedAny,
            });
          }
        } else {
          for (let i = 0; i < a.tutorialHours; i++) {
            sessions.push({
              ...base,
              sessionId:        `SESS_${a.id}_TU_${i + 1}_${++counter}`,
              batchId:          null,
              batchName:        null,
              type:             'TUTORIAL',
              duration:         1,
              requiredRoomType: 'ANY',
              allowedRoomIds:   allowedAny,
            });
          }
        }
      } else {
        for (let i = 0; i < a.tutorialHours; i++) {
          sessions.push({
            ...base,
            sessionId:        `SESS_${a.id}_TU_${i + 1}_${++counter}`,
            batchId:          null,
            batchName:        null,
            type:             'TUTORIAL',
            duration:         1,
            requiredRoomType: 'ANY',
            allowedRoomIds:   allowedAny,
          });
        }
      }
    }

    // ── 3. PRACTICAL Sessions ─────────────────────────────────────────────────
    if (a.practicalHours > 0) {
      const numBlocks = Math.floor(a.practicalHours / 2);
      const divBatches = [...(divBatchesByName.get(a.divisionId)?.values() || [])];

      if (divBatches.length > 0) {
        // Division with batches → use MMIT batch assignment
        const assignedBatches = resolveBatchesForAssignment(a);

        if (assignedBatches.length > 0) {
          // Round-robin: each block → one batch from assignedBatches
          for (let i = 0; i < numBlocks; i++) {
            const batch = assignedBatches[i % assignedBatches.length];
            sessions.push({
              ...base,
              sessionId:        `SESS_${a.id}_PR_${i + 1}_${++counter}`,
              batchId:          batch.id,
              batchName:        batch.name,
              type:             'PRACTICAL',
              duration:         2,
              requiredRoomType: 'LAB',
              allowedRoomIds:   allowedLabs,
            });
          }
        } else {
          // No resolved batches — create division-wide practical blocks
          for (let i = 0; i < numBlocks; i++) {
            sessions.push({
              ...base,
              sessionId:        `SESS_${a.id}_PR_${i + 1}_${++counter}`,
              batchId:          null,
              batchName:        null,
              type:             'PRACTICAL',
              duration:         2,
              requiredRoomType: 'LAB',
              allowedRoomIds:   allowedLabs,
            });
          }
        }
      } else {
        // Division with no batches — division-wide practical blocks
        for (let i = 0; i < numBlocks; i++) {
          sessions.push({
            ...base,
            sessionId:        `SESS_${a.id}_PR_${i + 1}_${++counter}`,
            batchId:          null,
            batchName:        null,
            type:             'PRACTICAL',
            duration:         2,
            requiredRoomType: 'LAB',
            allowedRoomIds:   allowedLabs,
          });
        }
      }
    }
  }

  return sessions;
}
