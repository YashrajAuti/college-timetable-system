# MMIT College Timetable Management System — Coordinated Batch Rotation & Final Architecture Documentation

## 1. Coordinated Batch Rotation Architecture Overview

The timetable generation backend of the MMIT College Timetable Management System uses a **Google OR-Tools CP-SAT Optimization Solver**, **Strict Master-Data Auditing**, **Immutable `facultyAssignmentId` Chaining**, **Hard Division-Theory Locking**, **Soft Coordinated Batch Rotation Preferences**, **Independent Zero-Trust Validation**, and **Two-Pass Transactional Persistence with Automatic Rollback**.

```
Master Data Audit (masterDataAudit.ts)
           ↓ (Must pass 100% or INVALID_MASTER_DATA)
Session Expansion (sessionExpansion.ts)
           ↓ (251 explicit sessions with immutable facultyAssignmentId & allowedRoomIds)
Python CP-SAT Solver (src/solver/cp_solver.py)
           ↓ (Hard Division Theory Lock + Soft Coordinated Batch Rotation Quadratic Objective)
Pre-Persistence Zero-Trust Validation (timetableValidator.ts)
           ↓ (Validates 22 failure criteria + Data-Driven Coordination Report)
Prisma Transaction ($transaction)
  ├── Create Timetable Record
  ├── Create TimetableEntry Records
  └── Re-read & Post-Persistence Zero-Trust Validation
           ↓
PASS → COMMIT DB Transaction
FAIL → AUTOMATIC ROLLBACK (NO_VALID_TIMETABLE)
```

---

## 2. Core Scheduling Principles & Rules Enforced

1. **Division Theory Lock (HARD)**: Theory lectures occupy ALL batches ($A1 + A2 + A3 + A4$) of a division simultaneously. NO batch session (theory, practical, or tutorial) is permitted for that division during division-wide theory slots.
2. **Coordinated Practical Rotation (SOFT OBJECTIVE)**: Practicals are batch-wise. The CP-SAT solver applies a quadratic soft objective term $(\text{ActiveBatches})^2$ to maximize simultaneous batch rotation across compatible labs ($C101, C102, C103, C104, C105, C106, C108, C110$) during 2-hour practical blocks $(1, 2)$, $(4, 5)$, $(7, 8)$.
3. **Different Practical Subjects**: Batches perform DIFFERENT practical subjects simultaneously in different labs with different assigned faculty.
4. **Strict Room / Software Compatibility (HARD)**: Session $s$ may ONLY occupy room $r \in \text{allowedRoomIds}(s)$ (derived from 197 `AssignmentAllowedLocation` database records).
5. **Tutorial Coordination**: 1-hour tutorials can align alongside 2-hour practical blocks. The batch's remaining 1 hour remains FREE; division theory lectures CANNOT occupy that slot.
6. **Break Slot Protection (HARD)**: Recess (Slot 3) and Lunch (Slot 6) are 100% protected (0 sessions).

---

## 3. Benchmark Test Matrix & Coordination Results (12 Scenarios)

```
┌─────────┬────┬──────────────────────────────────────────────────────────┬──────────┬───────┬───────────┬─────────┬─────────┬────────────────────────────────────────────────────────┬─────────┐
│ (index) │ ID │                         Scenario                         │  Status  │ Valid │ ZeroTrust │  Time   │  Hours  │                      Coordination                      │ Result  │
├─────────┼────┼──────────────────────────────────────────────────────────┼──────────┼───────┼───────────┼─────────┼─────────┼────────────────────────────────────────────────────────┼─────────┤
│    0    │ 1  │                       'SE-A only'                        │ 'VALID'  │ 'YES' │ 'PASSED'  │ '41ms'  │ '71/71' │ '93% (4-sync:7, 3-sync:0, 2-sync:0)'                   │ '✅ PASS' │
│    1    │ 2  │                       'SE-B only'                        │ 'VALID'  │ 'YES' │ 'PASSED'  │ '28ms'  │ '71/71' │ '93% (4-sync:7, 3-sync:0, 2-sync:0)'                   │ '✅ PASS' │
│    2    │ 3  │                       'TE-A only'                        │ 'VALID'  │ 'YES' │ 'PASSED'  │ '20ms'  │ '56/56' │ '83% (4-sync:3, 3-sync:2, 2-sync:1)'                   │ '✅ PASS' │
│    3    │ 4  │                       'TE-B only'                        │ 'VALID'  │ 'YES' │ 'PASSED'  │ '16ms'  │ '56/56' │ '83% (4-sync:3, 3-sync:2, 2-sync:1)'                   │ '✅ PASS' │
│    4    │ 5  │                       'BE-A only'                        │ 'VALID'  │ 'YES' │ 'PASSED'  │ '16ms'  │ '53/53' │ '75% (4-sync:2, 3-sync:1, 2-sync:1)'                   │ '✅ PASS' │
│    5    │ 6  │                       'BE-B only'                        │ 'VALID'  │ 'YES' │ 'PASSED'  │ '16ms'  │ '52/52' │ '75% (4-sync:2, 3-sync:1, 2-sync:1)'                   │ '✅ PASS' │
│    6    │ 7  │                      'SE-A + SE-B'                       │ 'VALID'  │ 'YES' │ 'PASSED'  │ '31ms'  │'142/142'│ '93% (4-sync:14, 3-sync:0, 2-sync:0)'                  │ '✅ PASS' │
│    7    │ 8  │                      'TE-A + TE-B'                       │ 'VALID'  │ 'YES' │ 'PASSED'  │ '28ms'  │'112/112'│ '83% (4-sync:6, 3-sync:4, 2-sync:2)'                   │ '✅ PASS' │
│    8    │ 9  │                      'BE-A + BE-B'                       │ 'VALID'  │ 'YES' │ 'PASSED'  │ '22ms'  │'105/105'│ '75% (4-sync:4, 3-sync:2, 2-sync:2)'                   │ '✅ PASS' │
│    9    │ 10 │              'SE + TE + BE (Sample Paired)'              │ 'VALID'  │ 'YES' │ 'PASSED'  │ '36ms'  │'180/180'│ '85% (4-sync:8, 3-sync:2, 2-sync:1)'                   │ '✅ PASS' │
│   10    │ 11 │  'Entire Computer Engineering Dept (All 6 Divisions)'   │ 'VALID'  │ 'YES' │ 'PASSED'  │ '39ms'  │'359/359'│ '85% (4-sync:15, 3-sync:3, 2-sync:3)'                  │ '✅ PASS' │
│   11    │ 12 │ 'Coordinated Rotation & Theory Lock Audit (Full Dept)' │ 'VALID'  │ 'YES' │ 'PASSED'  │ '40ms'  │'359/359'│ '85% (4-sync:15, 3-sync:3, 2-sync:3)'                  │ '✅ PASS' │
└─────────┴────┴──────────────────────────────────────────────────────────┴──────────┴───────┴───────────┴─────────┴─────────┴────────────────────────────────────────────────────────┴─────────┘
```

---

## 4. Zero-Trust Hard Constraint Metrics (Scenario 12 — Full Department)

```json
{
  "missingHours": 0,
  "extraHours": 0,
  "theoryMismatch": 0,
  "practicalMismatch": 0,
  "tutorialMismatch": 0,
  "wrongDepartment": 0,
  "wrongSemester": 0,
  "wrongCourseYear": 0,
  "wrongDivision": 0,
  "wrongBatch": 0,
  "wrongSubject": 0,
  "wrongFaculty": 0,
  "facultyConflicts": 0,
  "divisionConflicts": 0,
  "batchConflicts": 0,
  "roomConflicts": 0,
  "roomTypeViolations": 0,
  "capacityViolations": 0,
  "breakViolations": 0,
  "invalidDuration": 0,
  "practicalNotConsecutive": 0,
  "unauthorizedFaculty": 0,
  "unauthorizedRoom": 0,
  "duplicateSessions": 0,
  "orphanEntries": 0
}
```

---

## 5. Execution Commands

### Run Full 12-Scenario Test Matrix & Rotation Audit
```bash
cd backend && ./node_modules/.bin/tsx src/scripts/runTestMatrix.ts
```

### Run TypeScript Compilation
```bash
cd backend && ./node_modules/.bin/tsc --noEmit
cd frontend && ./node_modules/.bin/tsc --noEmit
```
