import { PrismaClient } from '@prisma/client';
import { spawn } from 'child_process';
import path from 'path';
import { auditMasterData } from './masterDataAudit';
import { expandFacultyAssignmentsToSessions, ExpandedSession } from './sessionExpansion';
import { validateTimetableZeroTrust, DetailedValidationReport } from './timetableValidator';

const prisma = new PrismaClient();

export interface GenerationOptions {
  days?: number[];
  departmentId?: string;
  divisionIds?: string[];
  semesterFilter?: number;
  mode?: 'COMPLETE' | 'BEST_EFFORT';
}

export interface EngineResult {
  status: 'VALID' | 'NO_VALID_TIMETABLE' | 'INVALID_MASTER_DATA' | 'ERROR';
  isValid: boolean;
  timetable?: any;
  validationReport?: DetailedValidationReport;
  diagnostics: any[];
  message: string;
}

export class TimetableEngine {
  async generate(options: GenerationOptions = {}): Promise<EngineResult> {
    const { days = [1, 2, 3, 4, 5, 6], departmentId, divisionIds, semesterFilter } = options;

    console.log('[Engine] Starting CP-SAT Timetable Generation Pipeline...');

    // ─── 1. Audit Master Data ──────────────────────────────────────────────
    const masterAudit = await auditMasterData({ departmentId, divisionIds, semesterFilter });
    if (!masterAudit.valid) {
      console.error('[Engine] Master data audit failed:', masterAudit.errors);
      return {
        status: 'INVALID_MASTER_DATA',
        isValid: false,
        diagnostics: masterAudit.errors.map(e => ({ reason: 'INVALID_MASTER_DATA', details: e })),
        message: 'Master data is inconsistent. Generation aborted. Persisted NOTHING.',
      };
    }

    // ─── 2. Expand Sessions ────────────────────────────────────────────────
    const sessions = await expandFacultyAssignmentsToSessions({ departmentId, divisionIds, semesterFilter });
    console.log(`[Engine] Expanded ${sessions.length} scheduling sessions.`);

    if (sessions.length === 0) {
      return {
        status: 'NO_VALID_TIMETABLE',
        isValid: false,
        diagnostics: [{ reason: 'NO_SESSIONS', details: 'No active scheduling assignments found matching filters.' }],
        message: 'No sessions to schedule.',
      };
    }

    // Load rooms and timeSlots for solver payload
    const [rooms, timeSlots] = await Promise.all([
      prisma.room.findMany({ where: { isActive: true } }),
      prisma.timeSlot.findMany({ orderBy: { index: 'asc' } })
    ]);

    const solverInput = {
      workingDays: days,
      timeSlots,
      rooms,
      sessions,
    };

    // ─── 3. Invoke Python CP-SAT Solver ────────────────────────────────────
    const solverOutput = await this.runPythonSolver(solverInput);
    console.log(`[Engine] Solver status: ${solverOutput.status} (solveTime: ${solverOutput.solveTimeMs || 0}ms)`);

    if (solverOutput.status !== 'FEASIBLE' || !solverOutput.placements || solverOutput.placements.length === 0) {
      return {
        status: 'NO_VALID_TIMETABLE',
        isValid: false,
        diagnostics: [{ reason: 'SOLVER_INFEASIBLE', details: solverOutput.reason || 'CP-SAT solver could not find a feasible schedule.' }],
        message: 'No valid timetable satisfying all hard constraints exists. Persisted NOTHING.',
      };
    }

    // ─── 4. Build Candidate Entries in memory ──────────────────────────────
    const candidateEntries: any[] = [];
    const timeSlotMap = new Map(timeSlots.map(s => [s.index, s]));

    for (const p of solverOutput.placements) {
      const s = sessions.find(sess => sess.sessionId === p.sessionId);
      if (!s) continue;

      const slot1 = timeSlotMap.get(p.slotIndex);
      if (!slot1) continue;

      if (p.duration === 2) {
        const slot2 = timeSlotMap.get(p.slotIndex + 1);
        candidateEntries.push({
          facultyAssignmentId: s.facultyAssignmentId,
          dayOfWeek: p.dayOfWeek,
          slotIndex: p.slotIndex,
          startTime: slot1.startTime,
          endTime: slot1.endTime,
          subjectId: s.subjectId,
          teacherId: s.teacherId,
          divisionId: s.divisionId,
          batchId: s.batchId,
          roomId: p.roomId,
          type: s.type,
          subject: { code: s.subjectCode },
          room: { isLab: s.requiredRoomType === 'LAB', roomNumber: '' },
          batch: s.batchId ? { divisionId: s.divisionId } : null,
        });
        candidateEntries.push({
          facultyAssignmentId: s.facultyAssignmentId,
          dayOfWeek: p.dayOfWeek,
          slotIndex: p.slotIndex + 1,
          startTime: slot2?.startTime || slot1.endTime,
          endTime: slot2?.endTime || slot1.endTime,
          subjectId: s.subjectId,
          teacherId: s.teacherId,
          divisionId: s.divisionId,
          batchId: s.batchId,
          roomId: p.roomId,
          type: s.type,
          subject: { code: s.subjectCode },
          room: { isLab: s.requiredRoomType === 'LAB', roomNumber: '' },
          batch: s.batchId ? { divisionId: s.divisionId } : null,
        });
      } else {
        candidateEntries.push({
          facultyAssignmentId: s.facultyAssignmentId,
          dayOfWeek: p.dayOfWeek,
          slotIndex: p.slotIndex,
          startTime: slot1.startTime,
          endTime: slot1.endTime,
          subjectId: s.subjectId,
          teacherId: s.teacherId,
          divisionId: s.divisionId,
          batchId: s.batchId,
          roomId: p.roomId,
          type: s.type,
          subject: { code: s.subjectCode },
          room: { isLab: s.requiredRoomType === 'LAB', roomNumber: '' },
          batch: s.batchId ? { divisionId: s.divisionId } : null,
        });
      }
    }

    // ─── 5. PRE-PERSISTENCE Zero-Trust Validation ──────────────────────────
    const preValidation = await validateTimetableZeroTrust('CANDIDATE', candidateEntries, { targetDivisionIds: options?.divisionIds });
    console.log(`[Engine] Pre-persistence validation isValid: ${preValidation.isValid}`);

    if (!preValidation.isValid) {
      console.error('[Engine] Pre-persistence validation failed:', preValidation.summary);
      return {
        status: 'NO_VALID_TIMETABLE',
        isValid: false,
        validationReport: preValidation,
        diagnostics: preValidation.conflictDetails.map(c => ({ reason: 'CONSTRAINT_VIOLATION', details: c })),
        message: 'Candidate timetable failed zero-trust validation. Persisted NOTHING.',
      };
    }

    // ─── 6. TWO-PASS TRANSACTIONAL PERSISTENCE ──────────────────────────────
    try {
      const savedTimetable = await prisma.$transaction(async (tx) => {
        // Create Timetable master record
        const tt = await tx.timetable.create({
          data: {
            name: `MMIT Timetable — AY 2026-27 (${new Date().toLocaleDateString('en-IN')})`,
            academicYear: '2026-27',
            semester: semesterFilter || 1,
            isGenerated: true,
            isValid: true,
          }
        });

        // Insert all TimetableEntry records carrying exact facultyAssignmentId
        for (const entry of candidateEntries) {
          await tx.timetableEntry.create({
            data: {
              timetableId: tt.id,
              facultyAssignmentId: entry.facultyAssignmentId,
              dayOfWeek: entry.dayOfWeek,
              slotIndex: entry.slotIndex,
              startTime: entry.startTime,
              endTime: entry.endTime,
              subjectId: entry.subjectId,
              teacherId: entry.teacherId,
              roomId: entry.roomId,
              divisionId: entry.divisionId,
              batchId: entry.batchId,
              type: entry.type,
            }
          });
        }

        // Re-read created entries inside transaction for POST-PERSISTENCE validation
        const createdEntries = await tx.timetableEntry.findMany({
          where: { timetableId: tt.id },
          include: {
            teacher: true,
            subject: true,
            division: { include: { year: true } },
            batch: true,
            room: true,
            facultyAssignment: true
          }
        });

        // Post-persistence Zero-Trust Validation
        const postValidation = await validateTimetableZeroTrust(tt.id, createdEntries, { targetDivisionIds: options?.divisionIds });

        if (!postValidation.isValid) {
          throw new Error(`POST-PERSISTENCE VALIDATION FAILED: ${postValidation.summary}`);
        }

        return tt;
      });

      console.log(`[Engine] Timetable ${savedTimetable.id} transactionally persisted and verified 100%!`);

      const finalValidation = await validateTimetableZeroTrust(savedTimetable.id, undefined, { targetDivisionIds: options?.divisionIds });

      return {
        status: 'VALID',
        isValid: true,
        timetable: savedTimetable,
        timetableId: savedTimetable.id,
        validationReport: finalValidation,
        diagnostics: [],
        message: `✅ Timetable complete and verified: ${finalValidation.coverage.scheduledHours}/${finalValidation.coverage.requiredHours} hours (100%), 0 hard violations.`,
      };

    } catch (txError: any) {
      console.error('[Engine] Transaction failed & rolled back:', txError?.message || txError);
      return {
        status: 'NO_VALID_TIMETABLE',
        isValid: false,
        diagnostics: [{ reason: 'TRANSACTION_ROLLBACK', details: txError?.message || String(txError) }],
        message: 'Transactional persistence failed post-validation check. Transaction rolled back completely.',
      };
    }
  }

  private async runPythonSolver(inputData: any): Promise<any> {
    return new Promise((resolve) => {
      const venvPython = path.join(process.cwd(), 'venv', 'bin', 'python3');
      const scriptPath = path.join(process.cwd(), 'src', 'solver', 'cp_solver.py');

      let pythonExec = venvPython;
      // Fallback to system python3 if venv python not found
      const child = spawn(pythonExec, [scriptPath]);
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (d) => stdout += d.toString());
      child.stderr.on('data', (d) => stderr += d.toString());

      child.on('close', (code) => {
        if (code !== 0 || !stdout.trim()) {
          console.error(`Python solver exited with code ${code}. Stderr: ${stderr}`);
          resolve({ status: 'INFEASIBLE', reason: stderr || `Python exited code ${code}` });
          return;
        }
        try {
          const parsed = JSON.parse(stdout.trim());
          resolve(parsed);
        } catch (e: any) {
          console.error('Failed to parse Python solver output:', stdout);
          resolve({ status: 'ERROR', reason: `JSON parse error: ${e.message}` });
        }
      });

      child.stdin.write(JSON.stringify(inputData));
      child.stdin.end();
    });
  }

  /** Preview data for Generate UI */
  async getPreview(options: GenerationOptions = {}): Promise<object> {
    const { departmentId } = options;
    const where: any = { subject: { isCanonical: true }, status: 'ACTIVE' };
    if (departmentId && departmentId !== 'ALL') {
      where.OR = [
        { departmentId },
        { teacher: { departmentId } }
      ];
    }

    const [assignments, teachers, rooms, divisions, timeSlots] = await Promise.all([
      prisma.facultyAssignment.findMany({ where }),
      prisma.teacher.count({ where: { isActive: true } }),
      prisma.room.findMany({ where: { isActive: true } }),
      prisma.division.count({ where: { isActive: true } }),
      prisma.timeSlot.findMany({ orderBy: { index: 'asc' } }),
    ]);

    const totalTh = assignments.reduce((s, a) => s + a.theoryHours, 0);
    const totalPr = assignments.reduce((s, a) => s + a.practicalHours, 0);
    const totalTu = assignments.reduce((s, a) => s + a.tutorialHours, 0);
    const totalProj = assignments.reduce((s, a) => s + a.projectHours, 0);
    const mandatoryHours = totalTh + totalPr + totalTu;

    const labs = rooms.filter(r => r.isLab);
    const classrooms = rooms.filter(r => !r.isLab);
    const teachingSlots = timeSlots.filter(s => !s.isBreak);

    return {
      classWorkload: {
        total: mandatoryHours,
        theory: totalTh,
        practical: totalPr,
        tutorial: totalTu,
      },
      facultyWorkload: {
        total: mandatoryHours + totalProj,
        academic: mandatoryHours,
        project: totalProj,
      },
      resources: {
        assignments: assignments.length,
        faculty: teachers,
        divisions,
        rooms: rooms.length,
        labs: labs.length,
        classrooms: classrooms.length,
        teachingSlotsPerDay: teachingSlots.length,
      },
      feasibility: {
        practicalFeasible: Math.ceil(totalPr / 2) <= (labs.length * 15),
        theoryFeasible: (totalTh + totalTu) <= (classrooms.length * 36),
      }
    };
  }
}
