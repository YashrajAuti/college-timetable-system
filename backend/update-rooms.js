const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const mappingText = `
SE-A — Second Year Division A
Data Structures Laboratory (DSL) | A1 | C108, C101
Data Structures Laboratory (DSL) | A2 | C108, C101
Data Structures Laboratory (DSL) | A3 | C101, C108
Data Structures Laboratory (DSL) | A4 | C101
OOPCG Laboratory (OOPCGL) | A1 | C104
OOPCG Laboratory (OOPCGL) | A2 | C104
OOPCG Laboratory (OOPCGL) | A3 | C104
OOPCG Laboratory (OOPCGL) | A4 | C104
Entrepreneurship Development (ED) | A1 | C102, E101
Entrepreneurship Development (ED) | A2 | C102, E101
Entrepreneurship Development (ED) | A3 | C107, E101
Entrepreneurship Development (ED) | A4 | C107, E101
Community Engagement Project (CEP) | A1 | C105
Community Engagement Project (CEP) | A2 | C105
Community Engagement Project (CEP) | A3 | C105
Community Engagement Project (CEP) | A4 | C105

SE-B — Second Year Division B
Data Structures Laboratory (DSL) | B1 | C108, C102
Data Structures Laboratory (DSL) | B2 | C102, C108
Data Structures Laboratory (DSL) | B3 | C108, C102
Data Structures Laboratory (DSL) | B4 | C102, C108
OOPCG Laboratory (OOPCGL) | B1 | C104
OOPCG Laboratory (OOPCGL) | B2 | C104
OOPCG Laboratory (OOPCGL) | B3 | C104
OOPCG Laboratory (OOPCGL) | B4 | C104
Entrepreneurship Development (ED) | B1 | C107, E101
Entrepreneurship Development (ED) | B2 | C102, E101
Entrepreneurship Development (ED) | B3 | C107, E101
Entrepreneurship Development (ED) | B4 | C107, E101
Community Engagement Project (CEP) | B1 | C106
Community Engagement Project (CEP) | B2 | C106
Community Engagement Project (CEP) | B3 | C106
Community Engagement Project (CEP) | B4 | C106

TE-A — Third Year Division A
Artificial Intelligence Laboratory (AIL) | A1 | C105
Artificial Intelligence Laboratory (AIL) | A2 | C105
Artificial Intelligence Laboratory (AIL) | A3 | C105
Artificial Intelligence Laboratory (AIL) | A4 | C105
Computer Networks Laboratory (CNL) | A1 | C101
Computer Networks Laboratory (CNL) | A2 | C102, C101
Computer Networks Laboratory (CNL) | A3 | C101, C102
Computer Networks Laboratory (CNL) | A4 | C101
Elective-I Laboratory | A1 | C108
Elective-I Laboratory | A2 | C108
Elective-I Laboratory | A3 | C108
Elective-I Laboratory | A4 | C108
Robotics and Automation (RoA) | A1 | C103, E102
Robotics and Automation (RoA) | A2 | C103, E102
Robotics and Automation (RoA) | A3 | C104, C108, E102
Robotics and Automation (RoA) | A4 | C104, E102
Technical Seminar (TS) | A1 | C103
Technical Seminar (TS) | A2 | C105
Technical Seminar (TS) | A3 | C106
Technical Seminar (TS) | A4 | C101

TE-B — Third Year Division B
Artificial Intelligence Laboratory (AIL) | B1 | C110
Artificial Intelligence Laboratory (AIL) | B2 | C110
Artificial Intelligence Laboratory (AIL) | B3 | C110
Artificial Intelligence Laboratory (AIL) | B4 | C110
Computer Networks Laboratory (CNL) | B1 | C103, C102
Computer Networks Laboratory (CNL) | B2 | C103, C102
Computer Networks Laboratory (CNL) | B3 | C101, C103
Computer Networks Laboratory (CNL) | B4 | C103, C101
Elective-I Laboratory | B1 | C106
Elective-I Laboratory | B2 | C106
Elective-I Laboratory | B3 | C106
Elective-I Laboratory | B4 | C106
Robotics and Automation (RoA) | B1 | C103, E102
Robotics and Automation (RoA) | B2 | C103, E102
Robotics and Automation (RoA) | B3 | E102, C104
Robotics and Automation (RoA) | B4 | C106, E102
Technical Seminar (TS) | B1 | C103
Technical Seminar (TS) | B2 | E105
Technical Seminar (TS) | B3 | E106
Technical Seminar (TS) | B4 | E101

BE-A — Final Year Division A
Laboratory Practice III (LP-III) | A1 | C102, C104
Laboratory Practice III (LP-III) | A2 | C104
Laboratory Practice III (LP-III) | A3 | C110, C102, C111
Laboratory Practice III (LP-III) | A4 | C110
Laboratory Practice IV (LP-IV) | A1 | C105
Laboratory Practice IV (LP-IV) | A2 | C105
Laboratory Practice IV (LP-IV) | A3 | C108
Laboratory Practice IV (LP-IV) | A4 | C104

BE-B — Final Year Division B
Laboratory Practice III (LP-III) | B1 | C104, C103, C108
Laboratory Practice III (LP-III) | B2 | C110
Laboratory Practice III (LP-III) | B3 | C111, C110
Laboratory Practice III (LP-III) | B4 | C110
Laboratory Practice IV (LP-IV) | B1 | C105
Laboratory Practice IV (LP-IV) | B2 | C108
Laboratory Practice IV (LP-IV) | B3 | C111
Laboratory Practice IV (LP-IV) | B4 | C104
`;

async function main() {
  const rooms = await prisma.room.findMany();
  let roomMap = {};
  rooms.forEach(r => roomMap[r.roomNumber] = r.id);

  const dept = await prisma.department.findFirst();
  
  const requiredRooms = ['E101', 'E102', 'E103', 'E104', 'E105', 'E106', 'C101', 'C102', 'C103', 'C104', 'C105', 'C106', 'C107', 'C108', 'C109', 'C110', 'C111'];
  for (const rName of requiredRooms) {
    if (!roomMap[rName]) {
      const isLab = rName.startsWith('C');
      const newRoom = await prisma.room.create({
        data: {
          isLab: isLab,
          capacity: isLab ? 20 : 60,
          floor: '1',
          building: 'Main',
          roomNumber: rName,
          department: { connect: { id: dept.id } }
        }
      });
      roomMap[rName] = newRoom.id;
      console.log('Created missing room:', rName);
    }
  }

  const lines = mappingText.split('\n');
  let currentDivId = null;

  for (const line of lines) {
    if (!line.trim()) continue;
    
    if (line.includes('—')) {
      const parts = line.split('—')[0].trim().split('-');
      const year = parts[0];
      const divName = parts[1];
      const yearMap = { 'SE': 2, 'TE': 3, 'BE': 4 };
      const div = await prisma.division.findFirst({
        where: { name: divName, year: { year: yearMap[year] } }
      });
      if (div) {
        currentDivId = div.id;
        console.log(`Found division ${year}-${divName}`);
      }
      else console.error('Division not found:', year, divName);
      continue;
    }

    if (!currentDivId || !line.includes('|')) {
      if(line.includes('|')) console.log('Skipping line, no currentDivId:', line);
      continue;
    }
    
    const parts = line.split('|').map(s => s.trim());
    const subjectPrefix = parts[0].split('(')[0].trim(); // e.g. Data Structures Laboratory
    const batchName = parts[1];
    const roomNames = parts[2].split(',').map(s => s.trim());

    const subject = await prisma.subject.findFirst({
      where: {
        name: { contains: subjectPrefix },
        assignments: { some: { divisionId: currentDivId } }
      }
    });

    if (!subject) {
      console.error('Subject not found for prefix:', subjectPrefix, 'in div:', currentDivId);
      continue;
    }

    // Find batch
    const batch = await prisma.batch.findFirst({
      where: {
        name: batchName,
        divisionId: currentDivId
      }
    });

    if (!batch) {
      console.error('Batch not found:', batchName, 'in div:', currentDivId);
      continue;
    }

    // Update assignment
    const assignment = await prisma.facultyAssignment.findFirst({
      where: {
        subjectId: subject.id,
        divisionId: currentDivId,
        batchId: batch.id
      }
    });

    if (assignment) {
      const roomIds = roomNames.map(r => roomMap[r]).filter(id => id);
      if (roomIds.length > 0) {
        await prisma.facultyAssignment.update({
          where: { id: assignment.id },
          data: {
            validRooms: { set: [], connect: roomIds.map(id => ({ id })) }
          }
        });
        console.log(`Updated validRooms for ${subject.name} - ${batch.name} to ${roomNames.join(',')}`);
      }
    } else {
        // Also check if type is tutorial and they share batch assignments
        const tutAssignment = await prisma.facultyAssignment.findFirst({
            where: {
              subjectId: subject.id,
              divisionId: currentDivId,
              batchId: batch.id
            }
          });
        if(tutAssignment) {
            const roomIds = roomNames.map(r => roomMap[r]).filter(id => id);
            if (roomIds.length > 0) {
                await prisma.facultyAssignment.update({
                  where: { id: tutAssignment.id },
                  data: {
                    validRooms: { set: [], connect: roomIds.map(id => ({ id })) }
                  }
                });
                console.log(`Updated validRooms for ${subject.name} - ${batch.name} to ${roomNames.join(',')}`);
            }
        } else {
            console.error('Assignment not found for subject:', subject.name, 'batch:', batch.name);
        }
    }
  }
}

main().catch(console.error).finally(()=>prisma.$disconnect());
