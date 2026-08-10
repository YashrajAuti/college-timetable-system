const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const subjectData = [
  // SE III
  { name: 'Data Structures', code: 'PCC-201-COM', semester: 3, lectureHours: 3, practicalHours: 0, tutorialHours: 0, year: 'SE' },
  { name: 'Object Oriented Programming and Computer Graphics', code: 'PCC-202-COM', semester: 3, lectureHours: 3, practicalHours: 0, tutorialHours: 0, year: 'SE' },
  { name: 'Operating Systems', code: 'PCC-203-COM', semester: 3, lectureHours: 3, practicalHours: 0, tutorialHours: 0, year: 'SE' },
  { name: 'Data Structures Laboratory', code: 'PCC-204-COM', semester: 3, lectureHours: 0, practicalHours: 4, tutorialHours: 0, year: 'SE' },
  { name: 'Object Oriented Programming and Computer Graphics Laboratory', code: 'PCC-205-COM', semester: 3, lectureHours: 0, practicalHours: 2, tutorialHours: 0, year: 'SE' },
  { name: 'Open Elective-I', code: 'OE-201', semester: 3, lectureHours: 2, practicalHours: 0, tutorialHours: 0, year: 'SE' },
  { name: 'Digital Electronics and Logic Design', code: 'MDM-221-COM', semester: 3, lectureHours: 2, practicalHours: 0, tutorialHours: 0, year: 'SE' },
  { name: 'Entrepreneurship Development', code: 'EEM-231-COM', semester: 3, lectureHours: 0, practicalHours: 2, tutorialHours: 1, year: 'SE' },
  { name: 'Universal Human Values and Professional Ethics', code: 'VEC-232-COM', semester: 3, lectureHours: 2, practicalHours: 0, tutorialHours: 0, year: 'SE' },
  { name: 'Community Engagement Project', code: 'CEP-241-COM', semester: 3, lectureHours: 0, practicalHours: 4, tutorialHours: 0, year: 'SE' },

  // TE V
  { name: 'Artificial Intelligence', code: 'PCC301COM', semester: 5, lectureHours: 3, practicalHours: 0, tutorialHours: 0, year: 'TE' },
  { name: 'Computer Networks', code: 'PCC302COM', semester: 5, lectureHours: 3, practicalHours: 0, tutorialHours: 0, year: 'TE' },
  { name: 'Theory of Computation', code: 'PCC303COM', semester: 5, lectureHours: 3, practicalHours: 0, tutorialHours: 0, year: 'TE' },
  { name: 'Artificial Intelligence Lab', code: 'PCC304COM', semester: 5, lectureHours: 0, practicalHours: 2, tutorialHours: 0, year: 'TE' },
  { name: 'Computer Networks Lab', code: 'PCC305COM', semester: 5, lectureHours: 0, practicalHours: 4, tutorialHours: 0, year: 'TE' },
  { name: 'Programme Elective-I', code: 'PEC321COM', semester: 5, lectureHours: 3, practicalHours: 0, tutorialHours: 0, year: 'TE' },
  { name: 'Elective-I Lab', code: 'PEC322COM', semester: 5, lectureHours: 0, practicalHours: 2, tutorialHours: 0, year: 'TE' },
  { name: 'Robotics and Automation', code: 'MDM331COM', semester: 5, lectureHours: 0, practicalHours: 2, tutorialHours: 2, year: 'TE' },
  { name: 'Open Elective', code: 'OE-301', semester: 5, lectureHours: 2, practicalHours: 0, tutorialHours: 0, year: 'TE' },
  { name: 'Technical Seminar', code: 'ELC342COM', semester: 5, lectureHours: 0, practicalHours: 2, tutorialHours: 0, year: 'TE' },

  // BE VII
  { name: 'Design and Analysis of Algorithms', code: '410241', semester: 7, lectureHours: 3, practicalHours: 0, tutorialHours: 0, year: 'BE' },
  { name: 'Machine Learning', code: '410242', semester: 7, lectureHours: 3, practicalHours: 0, tutorialHours: 0, year: 'BE' },
  { name: 'Blockchain Technology', code: '410243', semester: 7, lectureHours: 3, practicalHours: 0, tutorialHours: 0, year: 'BE' },
  { name: 'Elective III', code: '410244', semester: 7, lectureHours: 3, practicalHours: 0, tutorialHours: 0, year: 'BE' },
  { name: 'Elective IV', code: '410245', semester: 7, lectureHours: 3, practicalHours: 0, tutorialHours: 0, year: 'BE' },
  { name: 'Laboratory Practice III', code: '410246', semester: 7, lectureHours: 0, practicalHours: 4, tutorialHours: 0, year: 'BE' },
  { name: 'Laboratory Practice IV', code: '410247', semester: 7, lectureHours: 0, practicalHours: 2, tutorialHours: 0, year: 'BE' },
  { name: 'Project Stage I', code: '410248', semester: 7, lectureHours: 0, practicalHours: 2, tutorialHours: 0, year: 'BE' },
  { name: 'Audit Course 7', code: '410249', semester: 7, lectureHours: 0, practicalHours: 0, tutorialHours: 0, year: 'BE' },
];

async function main() {
  console.log('Clearing old timetables and assignments...');
  await prisma.timetableEntry.deleteMany({});
  await prisma.timetable.deleteMany({});
  await prisma.facultyAssignment.deleteMany({});
  
  const dept = await prisma.department.findFirst();
  if (!dept) throw new Error('No department found');

  console.log('Syncing subjects...');
  
  for (const s of subjectData) {
    const existing = await prisma.subject.findFirst({
        where: { name: s.name }
    });

    if (existing) {
        await prisma.subject.update({
            where: { id: existing.id },
            data: {
                lectureHours: s.lectureHours,
                practicalHours: s.practicalHours,
                tutorialHours: s.tutorialHours,
                semester: s.semester
            }
        });
        console.log(`Updated subject: ${s.name}`);
    } else {
        await prisma.subject.create({
            data: {
                name: s.name,
                code: s.code,
                departmentId: dept.id,
                semester: s.semester,
                credits: s.lectureHours + s.practicalHours + s.tutorialHours,
                lectureHours: s.lectureHours,
                practicalHours: s.practicalHours,
                tutorialHours: s.tutorialHours,
                labRequired: s.practicalHours > 0
            }
        });
        console.log(`Created subject: ${s.name}`);
    }
  }

  console.log('Done!');
}

main().catch(console.error).finally(()=>prisma.$disconnect());
