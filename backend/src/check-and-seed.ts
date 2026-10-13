import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { TimetableEngine } from './services/timetableEngine';

const prisma = new PrismaClient();

async function checkAndSeed() {
  try {
    console.log('[Startup] Checking database status...');

    // Push Prisma schema if tables do not exist
    try {
      await prisma.$queryRaw`SELECT 1 FROM FacultyAssignment LIMIT 1`;
    } catch {
      console.log('[Startup] Tables not found. Pushing schema...');
      execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
    }

    const assignmentCount = await prisma.facultyAssignment.count();
    const teacherCount = await prisma.teacher.count();

    if (teacherCount === 0) {
      console.log(`[Startup] Empty database detected. Seeding base structural data (departments, rooms, divisions, teachers)...`);
      execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' });
    }

    if (assignmentCount < 168) {
      console.log(`[Startup] Incomplete / legacy allocations detected (${assignmentCount} < 168). Seeding full canonical 168 faculty allocations...`);
      execSync('npx tsx src/seed-canonical-168.ts', { stdio: 'inherit' });
      console.log('[Startup] Canonical 168 faculty allocations initialization complete! ✅');
    } else {
      console.log(`[Startup] Database ready: ${teacherCount} teachers, ${assignmentCount} canonical faculty assignments found.`);
    }

    // Ensure strictly the 4 canonical classrooms and 9 laboratories
    const requiredRooms = [
      { number: 'E101', isLab: false, name: 'SE-A Classroom' },
      { number: 'E102', isLab: false, name: 'TE-A Classroom' },
      { number: 'E103', isLab: false, name: 'TE-B Classroom' },
      { number: 'E104', isLab: false, name: 'SE-B Classroom' },
      { number: 'C101', isLab: true,  name: 'DBMS Lab' },
      { number: 'C102', isLab: true,  name: 'Software Testing Lab' },
      { number: 'C103', isLab: true,  name: 'Hardware Lab' },
      { number: 'C104', isLab: true,  name: 'OOPCG Lab' },
      { number: 'C105', isLab: true,  name: 'Digital / Microprocessor Lab' },
      { number: 'C106', isLab: true,  name: 'Programming Lab' },
      { number: 'C108', isLab: true,  name: 'Server Room' },
      { number: 'C110', isLab: true,  name: 'Data Structure Lab' },
      { number: 'C111', isLab: true,  name: 'Signal Processing Lab' }
    ];

    const dept = await prisma.department.findFirst();
    if (dept) {
      for (const r of requiredRooms) {
        await prisma.room.upsert({
          where: { roomNumber: r.number },
          create: {
            roomNumber: r.number,
            capacity: r.isLab ? 30 : 60,
            departmentId: dept.id,
            isLab: r.isLab,
            isActive: true,
            building: 'Main Building'
          },
          update: {
            isLab: r.isLab,
            isActive: true,
          }
        });
      }

      // Reassign any assignments referencing non-classroom/phantom rooms
      await prisma.assignmentAllowedLocation.updateMany({
        where: { roomNumber: 'C107' },
        data: { roomNumber: 'C111', roomName: 'Signal Processing Lab' }
      });
      await prisma.assignmentAllowedLocation.updateMany({
        where: { roomNumber: 'E105' },
        data: { roomNumber: 'C105', roomName: 'Digital / Microprocessor Lab' }
      });
      await prisma.assignmentAllowedLocation.updateMany({
        where: { roomNumber: 'E106' },
        data: { roomNumber: 'C106', roomName: 'Programming Lab' }
      });

      // Remove phantom rooms (C107 is HOD Cabin, E105 & E106 do not exist)
      await prisma.roomAvailability.deleteMany({
        where: { room: { roomNumber: { in: ['C107', 'E105', 'E106'] } } }
      });
      await prisma.roomMapping.deleteMany({
        where: { room: { roomNumber: { in: ['C107', 'E105', 'E106'] } } }
      });
      await prisma.room.deleteMany({
        where: { roomNumber: { in: ['C107', 'E105', 'E106'] } }
      });
    }

    // Ensure TE-B RoA allowed locations use E103 (never locked to E102)
    const teBDiv = await prisma.division.findFirst({
      where: { name: 'B', year: { year: 3 } }
    });
    if (teBDiv) {
      await prisma.assignmentAllowedLocation.updateMany({
        where: {
          roomNumber: 'E102',
          assignment: {
            divisionId: teBDiv.id,
            subject: { name: { contains: 'Robotics' } }
          }
        },
        data: {
          roomNumber: 'E103',
          roomName: 'Classroom E103 (TE-B Primary)'
        }
      });
    }

    // ─── Auto-generate timetable if none exist ──────────────────────────────
    const timetableCount = await prisma.timetable.count();
    if (timetableCount === 0) {
      console.log('[Startup] No timetables found. Auto-generating one for the QR viewer...');
      try {
        const targetDivs = await prisma.division.findMany({
          where: { year: { year: { in: [2, 3, 4] } }, name: { in: ['A', 'B'] } }
        });
        const targetDivisionIds = targetDivs.map((d: any) => d.id);

        const engine = new TimetableEngine();
        const result = await engine.generate({ days: [1, 2, 3, 4, 5], divisionIds: targetDivisionIds });

        if (result.isValid && result.timetableId) {
          console.log(`[Startup] ✅ Auto-generated timetable successfully! ID: ${result.timetableId}`);
        } else {
          console.warn(`[Startup] ⚠️ Auto-generation attempted but returned: ${result.status} — ${result.message}`);
        }
      } catch (genError) {
        console.warn('[Startup] ⚠️ Timetable auto-generation failed (non-fatal):', genError);
      }
    } else {
      console.log(`[Startup] ${timetableCount} timetable(s) already exist. Skipping auto-generation.`);
    }

  } catch (error) {
    console.error('[Startup] Warning: Check-and-seed encountered an issue:', error);
    // Don't crash the server start process
  } finally {
    await prisma.$disconnect();
  }
}

checkAndSeed();
