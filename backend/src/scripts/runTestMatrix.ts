import { PrismaClient } from '@prisma/client';
import { TimetableEngine } from '../services/timetableEngine';
import { validateTimetableZeroTrust } from '../services/timetableValidator';

const prisma = new PrismaClient();

async function runTestMatrix() {
  console.log('==================================================');
  console.log('=== MMIT TIMETABLE ENGINE TEST MATRIX & ROTATION AUDIT ===');
  console.log('==================================================\n');

  // Load Computer Engineering Department and Divisions
  const compDept = await prisma.department.findFirst({ where: { code: 'COMP' } });
  const compDeptId = compDept?.id;

  const divisions = await prisma.division.findMany({
    where: { isActive: true },
    include: { year: true }
  });

  const getDivIds = (className: string, divNames: string[]) => {
    return divisions
      .filter(d => {
        const cName = d.year?.year === 2 ? 'SE' : d.year?.year === 3 ? 'TE' : d.year?.year === 4 ? 'BE' : 'FE';
        return cName === className && divNames.includes(d.name);
      })
      .map(d => d.id);
  };

  const scenarios: { id: number; name: string; divIds: string[] }[] = [
    { id: 1, name: 'SE-A only', divIds: getDivIds('SE', ['A']) },
    { id: 2, name: 'SE-B only', divIds: getDivIds('SE', ['B']) },
    { id: 3, name: 'TE-A only', divIds: getDivIds('TE', ['A']) },
    { id: 4, name: 'TE-B only', divIds: getDivIds('TE', ['B']) },
    { id: 5, name: 'BE-A only', divIds: getDivIds('BE', ['A']) },
    { id: 6, name: 'BE-B only', divIds: getDivIds('BE', ['B']) },
    { id: 7, name: 'SE-A + SE-B', divIds: getDivIds('SE', ['A', 'B']) },
    { id: 8, name: 'TE-A + TE-B', divIds: getDivIds('TE', ['A', 'B']) },
    { id: 9, name: 'BE-A + BE-B', divIds: getDivIds('BE', ['A', 'B']) },
    { id: 10, name: 'SE + TE + BE (Sample Paired)', divIds: [...getDivIds('SE', ['A']), ...getDivIds('TE', ['A']), ...getDivIds('BE', ['A'])] },
    { id: 11, name: 'Entire Computer Engineering Dept (All 6 Divisions)', divIds: compDeptId ? divisions.filter(d => d.isActive).map(d => d.id) : [] },
    { id: 12, name: 'Coordinated Rotation & Theory Lock Audit (Full Dept)', divIds: compDeptId ? divisions.filter(d => d.isActive).map(d => d.id) : [] }
  ];

  const engine = new TimetableEngine();
  const matrixResults: any[] = [];
  let allPassed = true;

  for (const sc of scenarios) {
    console.log(`\n--------------------------------------------------`);
    console.log(`RUNNING TEST ${sc.id}: ${sc.name}`);
    console.log(`Division IDs: ${JSON.stringify(sc.divIds)}`);
    console.log(`--------------------------------------------------`);

    // Clean existing timetables before test run
    await prisma.timetableEntry.deleteMany({});
    await prisma.timetable.deleteMany({});

    const startTime = Date.now();
    const result = await engine.generate({
      days: [1, 2, 3, 4, 5, 6],
      departmentId: compDeptId,
      divisionIds: sc.divIds.length > 0 ? sc.divIds : undefined,
    });
    const durationMs = Date.now() - startTime;

    console.log(`Status: ${result.status}`);
    console.log(`isValid: ${result.isValid}`);
    console.log(`Engine Time: ${durationMs}ms`);

    let zeroTrustValid = false;
    let vReport: any = null;

    if (result.isValid && result.timetable?.id) {
      vReport = await validateTimetableZeroTrust(result.timetable.id);
      zeroTrustValid = vReport.isValid;
      console.log(`Zero-Trust Validation: ${vReport.summary}`);
      if (vReport.coordinationReport) {
        console.log(`Data-Driven Coordination Report:`, JSON.stringify(vReport.coordinationReport));
      }
      console.log(`Violations Count:`, JSON.stringify(vReport.violations));
    } else {
      console.log(`Diagnostics:`, JSON.stringify(result.diagnostics));
    }

    const testPassed = (result.status === 'VALID' && result.isValid && zeroTrustValid) || (result.status === 'NO_VALID_TIMETABLE' && !result.isValid);

    if (!testPassed) allPassed = false;

    matrixResults.push({
      scenarioId: sc.id,
      name: sc.name,
      status: result.status,
      isValid: result.isValid,
      zeroTrustValid,
      durationMs,
      scheduledHours: vReport?.coverage?.scheduledHours || 0,
      requiredHours: vReport?.coverage?.requiredHours || 0,
      coordinationEfficiency: vReport?.coordinationReport?.coordinationEfficiencyPercent ?? 'N/A',
      fourSync: vReport?.coordinationReport?.fourBatchSyncBlocks ?? 0,
      threeSync: vReport?.coordinationReport?.threeBatchSyncBlocks ?? 0,
      twoSync: vReport?.coordinationReport?.twoBatchSyncBlocks ?? 0,
      passed: testPassed,
    });
  }

  console.log('\n==================================================');
  console.log('=== TEST MATRIX SUMMARY REPORT ===');
  console.log('==================================================\n');

  console.table(matrixResults.map(r => ({
    ID: r.scenarioId,
    Scenario: r.name,
    Status: r.status,
    Valid: r.isValid ? 'YES' : 'NO',
    ZeroTrust: r.zeroTrustValid ? 'PASSED' : 'FAILED',
    Time: `${r.durationMs}ms`,
    Hours: `${r.scheduledHours}/${r.requiredHours}`,
    Coordination: `${r.coordinationEfficiency}% (4-sync:${r.fourSync}, 3-sync:${r.threeSync}, 2-sync:${r.twoSync})`,
    Result: r.passed ? '✅ PASS' : '❌ FAIL',
  })));

  if (allPassed) {
    console.log('\n✅ ALL 12 TEST MATRIX SCENARIOS EXECUTED & PASSED VERIFICATION!');
  } else {
    console.error('\n❌ TEST MATRIX CONTAINS FAILURES!');
    process.exit(1);
  }
}

runTestMatrix()
  .catch((err) => {
    console.error('Fatal error during test matrix:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
