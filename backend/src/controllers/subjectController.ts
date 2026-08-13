import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Legacy/duplicate code pairs: key = legacy code, value = canonical code it mirrors
const LEGACY_CODE_MAP: Record<string, string> = {
  'DS':     'PCC-201-COMP',
  'OOPCG':  'PCC-202-COM',
  'OS':     'PCC-203-COM',
  'DSL':    'PCC-204-COM',
  'OOPCGL': 'PCC-205-COM',
  'AI':     'PCC301COM',
  'CN':     'PCC302COM',
  'TOC':    'PCC303COM',
  'DAA':    '410241',
  'ML':     '410242',
  // near-duplicates (same course name, different official code — both exist)
  'PCC-201-COM': 'PCC-201-COMP',
  'EEM-231-COM': 'EEM-240-COM',
  'MDM-221-COM': 'MDM-230-COM',
  'CEP-241-COM': 'CEF-260-COM',
};

export const getSubjects = async (req: Request, res: Response) => {
  try {
    const { departmentId, semester, type, search } = req.query;

    const where: any = { isActive: true };

    if (departmentId && departmentId !== 'ALL') {
      where.departmentId = String(departmentId);
    }
    if (semester && semester !== 'ALL') {
      where.semester = Number(semester);
    }
    if (type && type !== 'ALL') {
      if (type === 'PRACTICAL') where.labRequired = true;
      if (type === 'THEORY') where.labRequired = false;
      if (type === 'TUTORIAL') where.tutorialHours = { gt: 0 };
    }
    if (search && String(search).trim()) {
      const q = String(search).trim().toLowerCase();
      where.OR = [
        { name: { contains: q } },
        { code: { contains: q } }
      ];
    }

    const subjects = await prisma.subject.findMany({
      where,
      include: { department: true },
      orderBy: [
        { department: { name: 'asc' } },
        { semester: 'asc' },
        { code: 'asc' },
        { name: 'asc' }
      ]
    });

    // Annotate with legacy/duplicate flag
    const annotated = subjects.map(s => ({
      ...s,
      isLegacy: Object.prototype.hasOwnProperty.call(LEGACY_CODE_MAP, s.code),
      canonicalCode: LEGACY_CODE_MAP[s.code] ?? null,
      theoryHours: s.lectureHours,
    }));

    res.json(annotated);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching subjects', error });
  }
};

export const getSubjectAudit = async (req: Request, res: Response) => {
  try {
    const allSubjects = await prisma.subject.findMany({
      where: { isActive: true },
      include: { department: true }
    });

    const assignments = await prisma.facultyAssignment.findMany({
      include: { subject: true }
    });

    const totalSubjects = allSubjects.length;
    const legacyCodes = Object.keys(LEGACY_CODE_MAP);
    const legacyRecords = allSubjects.filter(s => legacyCodes.includes(s.code));
    const validRecords = allSubjects.filter(s => !legacyCodes.includes(s.code));

    // Check assignment-level subject mapping
    const assignmentsWithSubject = assignments.filter(a => a.subjectId);
    const assignmentsWithoutSubject = assignments.filter(a => !a.subjectId);

    // For assignments without subjectId, try to find by courseCode
    const missingMappings: { courseCode: string; courseName: string; count: number }[] = [];
    const missingCodeMap = new Map<string, { courseName: string; count: number }>();

    for (const a of assignmentsWithoutSubject) {
      const code = a.courseCode as string;
      if (!missingCodeMap.has(code)) {
        missingCodeMap.set(code, { courseName: a.courseName as string || '', count: 0 });
      }
      missingCodeMap.get(code)!.count++;
    }
    missingCodeMap.forEach((v, k) => missingMappings.push({ courseCode: k, courseName: v.courseName, count: v.count }));

    // Check which assignment course codes have no Subject record at all
    const allSubjectCodes = new Set(allSubjects.map(s => s.code));
    const uniqueAssignmentCodes = [...new Set(assignments.map(a => a.courseCode as string))];
    const codesWithNoSubject = uniqueAssignmentCodes.filter(c => c && !allSubjectCodes.has(c));

    // Legacy records detail
    const legacyDetails = legacyRecords.map(s => ({
      id: s.id,
      code: s.code,
      name: s.name,
      semester: s.semester,
      canonicalCode: LEGACY_CODE_MAP[s.code],
      department: s.department?.name
    }));

    res.json({
      summary: {
        totalSubjectRecords: totalSubjects,
        validSubjectRecords: validRecords.length,
        legacyDuplicateRecords: legacyRecords.length,
        facultyAssignmentsWithSubjectMapping: assignmentsWithSubject.length,
        facultyAssignmentsWithoutSubjectMapping: assignmentsWithoutSubject.length,
        assignmentCodesWithNoSubjectRecord: codesWithNoSubject.length,
      },
      legacyRecords: legacyDetails,
      missingSubjectMappings: missingMappings.sort((a, b) => a.courseCode.localeCompare(b.courseCode)),
      codesWithNoSubjectRecord: codesWithNoSubject.sort()
    });
  } catch (error) {
    res.status(500).json({ message: 'Error running subject audit', error });
  }
};

export const createSubject = async (req: Request, res: Response) => {
  try {
    const { name, code, semester, credits, departmentId, labRequired, lectureHours = 0, practicalHours = 0, tutorialHours = 0 } = req.body;

    // Check for duplicate code
    const existing = await prisma.subject.findUnique({ where: { code: String(code) } });
    if (existing) {
      return res.status(409).json({ message: `Subject with code '${code}' already exists.`, existing });
    }

    const subject = await prisma.subject.create({
      data: {
        name,
        code,
        semester: Number(semester),
        credits: Number(credits),
        departmentId,
        labRequired: Boolean(labRequired),
        lectureHours: Number(lectureHours),
        practicalHours: Number(practicalHours),
        tutorialHours: Number(tutorialHours),
      },
      include: { department: true }
    });
    res.status(201).json(subject);
  } catch (error) {
    res.status(500).json({ message: 'Error creating subject', error });
  }
};

export const updateSubject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code, semester, credits, departmentId, labRequired, lectureHours, practicalHours, tutorialHours } = req.body;
    const subject = await prisma.subject.update({
      where: { id: String(id) },
      data: {
        name,
        code,
        semester: Number(semester),
        credits: Number(credits),
        departmentId,
        labRequired: Boolean(labRequired),
        ...(lectureHours !== undefined && { lectureHours: Number(lectureHours) }),
        ...(practicalHours !== undefined && { practicalHours: Number(practicalHours) }),
        ...(tutorialHours !== undefined && { tutorialHours: Number(tutorialHours) }),
      },
      include: { department: true }
    });
    res.json(subject);
  } catch (error) {
    res.status(500).json({ message: 'Error updating subject', error });
  }
};

export const deleteSubject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.subject.update({
      where: { id: String(id) },
      data: { isActive: false }
    });
    res.json({ message: 'Subject soft-deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting subject', error });
  }
};
