const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

async function main() {
    console.log('Starting seed...');
    await prisma.teacherSubjectMaster.deleteMany({});
    console.log('Cleared old master data.');

    const teachers = await prisma.teacher.findMany();
    const divisions = await prisma.division.findMany({ include: { year: true } });
    const subjects = await prisma.subject.findMany();

    const tMap = {}; teachers.forEach(t => tMap[t.name.toLowerCase()] = t);
    const divMap = {};
    divisions.forEach(d => {
        const y = d.year.year === 2 ? 'SE' : (d.year.year === 3 ? 'TE' : 'BE');
        divMap[`${y} ${d.name}`] = d;
    });
    
    // Fuzzy matching for subjects
    const findSubject = (name) => {
        const n = name.toLowerCase().trim();
        for (const s of subjects) {
            if (s.name.toLowerCase().includes(n) || n.includes(s.name.toLowerCase())) return s;
            if (s.name.toLowerCase() === 'artificial intelligence' && n === 'artificial intelligence') return s;
            if (s.name.toLowerCase() === 'artificial intelligence laboratory' && n === 'artificial intelligence lab') return s;
        }
        return null;
    };

    // A hardcoded map derived from teacher_workloads.md
    const mappings = [
        { t: "Prof. S. A. Agrawal", cls: "TE B", sub: "Community Engagement Project" },
        { t: "Prof. S. A. Agrawal", cls: "SE A", sub: "Computer Networks" },
        { t: "Prof. S. A. Agrawal", cls: "SE A", sub: "Computer Networks Laboratory" },
        { t: "Prof. S. A. Agrawal", cls: "SE B", sub: "Computer Networks" },
        { t: "Prof. S. A. Agrawal", cls: "SE B", sub: "Computer Networks Laboratory" },
        { t: "Prof. S. A. Agrawal", cls: "SE A", sub: "Digital Electronics and Logic Design" },
        { t: "Dr. J. P. Shinde", cls: "SE A", sub: "Computer Networks" },
        { t: "Dr. J. P. Shinde", cls: "SE A", sub: "Open Elective" },
        { t: "Dr. J. P. Shinde", cls: "SE B", sub: "Computer Networks" },
        { t: "Dr. J. P. Shinde", cls: "SE B", sub: "Open Elective" },
        { t: "Prof. M. S. Jagtap", cls: "TE A", sub: "Operating Systems" },
        { t: "Prof. M. S. Jagtap", cls: "BE A", sub: "Artificial Intelligence" },
        { t: "Prof. M. S. Jagtap", cls: "BE A", sub: "Artificial Intelligence Lab" },
        { t: "Prof. M. S. Jagtap", cls: "TE B", sub: "Laboratory Practice III" }
    ];

    let createdCount = 0;
    for (const m of mappings) {
        const t = tMap[m.t.toLowerCase()];
        const d = divMap[m.cls];
        const s = findSubject(m.sub);

        if (t && d && s) {
            try {
                await prisma.teacherSubjectMaster.create({
                    data: {
                        teacherId: t.id,
                        divisionId: d.id,
                        subjectId: s.id
                    }
                });
                createdCount++;
            } catch (e) {
                // Ignore duplicates
            }
        }
    }
    
    console.log(`Seeded ${createdCount} Master Subject mappings based on provided workloads.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
