"use client";

import { useState, useEffect } from 'react';
import { ClipboardList, CheckCircle2, AlertCircle, X, ShieldAlert, Calculator } from 'lucide-react';
import { apiUrl } from '@/lib/api';

export function AddAllocationModal({
  isOpen,
  onClose,
  allocationToEdit
}: {
  isOpen: boolean;
  onClose: () => void;
  allocationToEdit?: any;
}) {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [divisions, setDivisions] = useState<any[]>([]);

  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [academicYear, setAcademicYear] = useState('2024-25');
  const [semester, setSemester] = useState('5');
  const [className, setClassName] = useState('TE');
  const [divisionName, setDivisionName] = useState('B');
  const [batchName, setBatchName] = useState('All');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');

  const [theoryHours, setTheoryHours] = useState<number>(3);
  const [practicalHours, setPracticalHours] = useState<number>(0);
  const [tutorialHours, setTutorialHours] = useState<number>(0);
  const [projectHours, setProjectHours] = useState<number>(0);

  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      Promise.all([
        fetch(apiUrl('/api/teachers')).then(r => r.json()),
        fetch(apiUrl('/api/departments')).then(r => r.json()),
        fetch(apiUrl('/api/subjects')).then(r => r.json()),
        fetch(apiUrl('/api/divisions')).then(r => r.json())
      ]).then(([tData, dData, sData, divData]) => {
        if (Array.isArray(tData)) setTeachers(tData);
        if (Array.isArray(dData)) setDepartments(dData);
        if (Array.isArray(sData)) setSubjects(sData);
        if (Array.isArray(divData)) setDivisions(divData);
      }).catch(console.error);

      if (allocationToEdit) {
        setSelectedTeacher(allocationToEdit.teacherId || '');
        setSelectedDept(allocationToEdit.departmentId || allocationToEdit.teacher?.departmentId || '');
        setAcademicYear(allocationToEdit.academicYear || '2024-25');
        setSemester(String(allocationToEdit.semester || 5));
        setClassName(allocationToEdit.className || 'TE');
        setDivisionName(allocationToEdit.divisionName || 'B');
        setBatchName(allocationToEdit.batchName || 'All');
        setSelectedSubject(allocationToEdit.subjectId || '');
        setCourseCode(allocationToEdit.courseCode || allocationToEdit.subject?.code || '');
        setCourseName(allocationToEdit.courseName || allocationToEdit.subject?.name || '');
        setTheoryHours(allocationToEdit.theoryHours || 0);
        setPracticalHours(allocationToEdit.practicalHours || 0);
        setTutorialHours(allocationToEdit.tutorialHours || 0);
        setProjectHours(allocationToEdit.projectHours || 0);
      } else {
        setSelectedTeacher('');
        setSelectedDept('');
        setAcademicYear('2024-25');
        setSemester('5');
        setClassName('TE');
        setDivisionName('B');
        setBatchName('All');
        setSelectedSubject('');
        setCourseCode('');
        setCourseName('');
        setTheoryHours(3);
        setPracticalHours(0);
        setTutorialHours(0);
        setProjectHours(0);
      }
    }
  }, [isOpen, allocationToEdit]);

  if (!isOpen) return null;

  // Auto-calculate Total Hours
  const totalHours = Math.max(0, Number(theoryHours) || 0) +
                     Math.max(0, Number(practicalHours) || 0) +
                     Math.max(0, Number(tutorialHours) || 0) +
                     Math.max(0, Number(projectHours) || 0);

  const handleSubjectChange = (subId: string) => {
    setSelectedSubject(subId);
    const sub = subjects.find(s => s.id === subId);
    if (sub) {
      setCourseCode(sub.code);
      setCourseName(sub.name);
      setTheoryHours(sub.lectureHours || 0);
      setPracticalHours(sub.practicalHours || 0);
      setTutorialHours(sub.tutorialHours || 0);
      setSemester(String(sub.semester || 5));
    }
  };

  const handleTeacherChange = (tId: string) => {
    setSelectedTeacher(tId);
    const t = teachers.find(x => x.id === tId);
    if (t && t.departmentId) {
      setSelectedDept(t.departmentId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedTeacher) {
      setErrorMsg('Faculty member is required');
      return;
    }
    if (!className || !divisionName) {
      setErrorMsg('Class and Division are required');
      return;
    }
    if (!courseCode && !selectedSubject) {
      setErrorMsg('Course / Subject selection or code is required');
      return;
    }
    if (!academicYear) {
      setErrorMsg('Academic Year is required');
      return;
    }
    if (theoryHours < 0 || practicalHours < 0 || tutorialHours < 0 || projectHours < 0) {
      setErrorMsg('Teaching hours cannot be negative');
      return;
    }
    if (totalHours <= 0) {
      setErrorMsg('Total teaching load must be at least 1 hour per week');
      return;
    }

    // Match division ID if available
    let matchedDiv = divisions.find(d => d.name === divisionName);
    if (!matchedDiv && divisions.length > 0) matchedDiv = divisions[0];

    const payload = {
      teacherId: selectedTeacher,
      departmentId: selectedDept || (teachers.find(t => t.id === selectedTeacher)?.departmentId),
      subjectId: selectedSubject || '',
      divisionId: matchedDiv?.id || '',
      className,
      divisionName,
      batchName,
      courseCode,
      courseName,
      theoryHours: Number(theoryHours) || 0,
      practicalHours: Number(practicalHours) || 0,
      tutorialHours: Number(tutorialHours) || 0,
      projectHours: Number(projectHours) || 0,
      academicYear,
      semester: Number(semester) || 5,
      status: 'ACTIVE'
    };

    try {
      const method = allocationToEdit ? 'PUT' : 'POST';
      const url = allocationToEdit
        ? apiUrl(`/api/allocations/${allocationToEdit.id}`)
        : apiUrl('/api/allocations');

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        onClose();
      } else {
        const data = await res.json();
        setErrorMsg(data.message || 'Failed to save allocation');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Network error connecting to backend server');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#C8102E] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-white" />
            <h2 className="text-lg font-bold">
              {allocationToEdit ? 'Edit Faculty Allocation' : 'Add Faculty Allocation'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-white/20 text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Faculty & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Faculty Member *</label>
              <select
                value={selectedTeacher}
                onChange={e => handleTeacherChange(e.target.value)}
                required
                className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm bg-white focus:outline-none focus:border-[#C8102E] font-medium"
              >
                <option value="">-- Select Faculty --</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.shortCode || t.employeeId})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Department</label>
              <select
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
                className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm bg-white focus:outline-none focus:border-[#C8102E]"
              >
                <option value="">-- Select Department --</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 2: Academic Year, Semester, Class, Division, Batch */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Academic Year *</label>
              <input
                type="text"
                value={academicYear}
                onChange={e => setAcademicYear(e.target.value)}
                required
                placeholder="2024-25"
                className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm bg-white focus:outline-none focus:border-[#C8102E]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Semester *</label>
              <select
                value={semester}
                onChange={e => setSemester(e.target.value)}
                className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm bg-white focus:outline-none focus:border-[#C8102E]"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Class *</label>
              <select
                value={className}
                onChange={e => setClassName(e.target.value)}
                className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm bg-white focus:outline-none focus:border-[#C8102E] font-bold"
              >
                <option value="FE">FE (First Year)</option>
                <option value="SE">SE (Second Year)</option>
                <option value="TE">TE (Third Year)</option>
                <option value="BE">BE (Final Year)</option>
                <option value="ME">ME (Master)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Division *</label>
              <input
                type="text"
                value={divisionName}
                onChange={e => setDivisionName(e.target.value)}
                placeholder="A, B, A & B"
                required
                className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm bg-white focus:outline-none focus:border-[#C8102E]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Student Batch</label>
              <input
                type="text"
                value={batchName}
                onChange={e => setBatchName(e.target.value)}
                placeholder="All, A1, B1,B2,B3,B4"
                className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm bg-white focus:outline-none focus:border-[#C8102E]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Choose Course Subject *</label>
              <select
                value={selectedSubject}
                onChange={e => handleSubjectChange(e.target.value)}
                className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm bg-white focus:outline-none focus:border-[#C8102E]"
              >
                <option value="">-- Choose Subject --</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name} (Sem {s.semester})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Course Code</label>
              <input
                type="text"
                value={courseCode}
                onChange={e => setCourseCode(e.target.value)}
                placeholder="PCC301COM"
                className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm bg-white font-mono focus:outline-none focus:border-[#C8102E]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Course Title</label>
              <input
                type="text"
                value={courseName}
                onChange={e => setCourseName(e.target.value)}
                placeholder="Artificial Intelligence"
                className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm bg-white focus:outline-none focus:border-[#C8102E]"
              />
            </div>
          </div>

          {/* Section 3: Teaching Hours Breakdown & Auto-Calculated Total */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-[#C8102E]" /> Weekly Teaching Load Breakdown (Hours)
              </span>
              <div className="px-3 py-1 bg-[#FEF2F2] border border-red-200 rounded-lg text-xs font-extrabold text-[#C8102E]">
                Total: {totalHours} hrs/week
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Theory Hours</label>
                <input
                  type="number"
                  min="0"
                  value={theoryHours}
                  onChange={e => setTheoryHours(Number(e.target.value))}
                  className="w-full h-9 border border-slate-200 rounded-md px-3 text-sm bg-white focus:outline-none focus:border-[#C8102E] font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Practical Hours</label>
                <input
                  type="number"
                  min="0"
                  value={practicalHours}
                  onChange={e => setPracticalHours(Number(e.target.value))}
                  className="w-full h-9 border border-slate-200 rounded-md px-3 text-sm bg-white focus:outline-none focus:border-[#C8102E] font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Tutorial Hours</label>
                <input
                  type="number"
                  min="0"
                  value={tutorialHours}
                  onChange={e => setTutorialHours(Number(e.target.value))}
                  className="w-full h-9 border border-slate-200 rounded-md px-3 text-sm bg-white focus:outline-none focus:border-[#C8102E] font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Project Hours</label>
                <input
                  type="number"
                  min="0"
                  value={projectHours}
                  onChange={e => setProjectHours(Number(e.target.value))}
                  className="w-full h-9 border border-slate-200 rounded-md px-3 text-sm bg-white focus:outline-none focus:border-[#C8102E] font-bold"
                />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="mmit-btn-secondary cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="mmit-btn-primary cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" /> Save Teaching Allocation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
