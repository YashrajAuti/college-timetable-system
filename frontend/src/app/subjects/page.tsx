"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, BookOpen, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const DEFAULT_SUBJECTS = [
  { id: 's1', code: 'DS', name: 'Data Structures', semester: 3, credits: 3, labRequired: false, department: { name: 'Computer Engineering', code: 'CE' } },
  { id: 's2', code: 'OOPCG', name: 'OOP and Computer Graphics', semester: 3, credits: 3, labRequired: false, department: { name: 'Computer Engineering', code: 'CE' } },
  { id: 's3', code: 'OS', name: 'Operating System', semester: 3, credits: 3, labRequired: false, department: { name: 'Computer Engineering', code: 'CE' } },
  { id: 's4', code: 'DSL', name: 'Data Structures Laboratory', semester: 3, credits: 1, labRequired: true, department: { name: 'Computer Engineering', code: 'CE' } },
  { id: 's5', code: 'OOPCGL', name: 'OOPCG Laboratory', semester: 3, credits: 1, labRequired: true, department: { name: 'Computer Engineering', code: 'CE' } },
  { id: 's6', code: 'AI', name: 'Artificial Intelligence', semester: 5, credits: 3, labRequired: false, department: { name: 'Computer Engineering', code: 'CE' } },
  { id: 's7', code: 'CN', name: 'Computer Networks', semester: 5, credits: 3, labRequired: false, department: { name: 'Computer Engineering', code: 'CE' } },
  { id: 's8', code: 'TOC', name: 'Theory of Computation', semester: 5, credits: 3, labRequired: false, department: { name: 'Computer Engineering', code: 'CE' } },
  { id: 's9', code: 'DAA', name: 'Design and Analysis of Algorithms', semester: 7, credits: 3, labRequired: false, department: { name: 'Computer Engineering', code: 'CE' } },
  { id: 's10', code: 'ML', name: 'Machine Learning', semester: 7, credits: 3, labRequired: false, department: { name: 'Computer Engineering', code: 'CE' } }
];

const DEFAULT_DEPARTMENTS = [
  { id: '197ac8fb-0c31-4d58-b25d-783aceda5631', name: 'Computer Engineering', code: 'CE' },
  { id: '9ddcd5f0-6e71-4d8e-9bc6-333f2c9fbd2a', name: 'Artificial Intelligence & Data Science', code: 'AIDS' },
  { id: '3c6b601e-1a83-4d0e-acb8-f755d3ca59b7', name: 'Mechatronics Engineering', code: 'MTE' },
  { id: '643d2c50-9c3d-4fb3-b331-f8748e9689b6', name: 'Mechanical Engineering', code: 'ME' },
  { id: '3392eae4-5234-49eb-8056-b42b0dbae630', name: 'Civil Engineering', code: 'CIVIL' },
  { id: '333d6dc6-798c-412e-a645-313c85eb2518', name: 'Robotics and AI Engineering', code: 'RAI' },
  { id: 'ecdc710d-07a9-4dc3-9872-ece45211343b', name: 'Engineering Sciences (FE)', code: 'FE' }
];

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<any[]>(DEFAULT_SUBJECTS);
  const [departments, setDepartments] = useState<any[]>(DEFAULT_DEPARTMENTS);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [currentSubject, setCurrentSubject] = useState({ id: '', name: '', code: '', semester: '3', credits: '3', departmentId: DEFAULT_DEPARTMENTS[0].id, labRequired: false });

  const fetchSubjects = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/subjects');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) setSubjects(data);
      }
    } catch (err) {
      console.warn("Using fallback subjects list:", err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/departments');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) setDepartments(data);
      }
    } catch (err) {
      console.warn("Using fallback departments for subjects:", err);
    }
  };

  useEffect(() => {
    Promise.all([fetchSubjects(), fetchDepartments()]).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this subject?")) return;
    try {
      await fetch(`http://localhost:5000/api/subjects/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error(err);
    } finally {
      setSubjects(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleSave = async (isEdit: boolean) => {
    const url = isEdit ? `http://localhost:5000/api/subjects/${currentSubject.id}` : `http://localhost:5000/api/subjects`;
    const method = isEdit ? 'PUT' : 'POST';
    const payload = { ...currentSubject, semester: parseInt(currentSubject.semester as string), credits: parseInt(currentSubject.credits as string) };
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchSubjects();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAddOpen(false);
      setIsEditOpen(false);
    }
  };

  const filteredSubjects = subjects.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.code.toLowerCase().includes(searchQuery.toLowerCase());
    if (filterType === "LAB") return matchesSearch && s.labRequired;
    if (filterType === "THEORY") return matchesSearch && !s.labRequired;
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="mmit-badge-red">MMIT Curriculum</span>
            <span className="text-xs font-semibold text-slate-500">Course Syllabus</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Subject Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure theory subjects, practical lab courses, credits, and semester mappings.
          </p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <button className="mmit-btn-primary self-start sm:self-auto cursor-pointer" onClick={() => setIsAddOpen(true)}>
              <Plus className="w-4 h-4" /> Add New Subject
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-white border border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#C8102E]" /> Add New Subject
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Subject Name</label>
                <Input placeholder="e.g. Data Structures" value={currentSubject.name} onChange={e => setCurrentSubject({...currentSubject, name: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Subject Code</label>
                <Input placeholder="e.g. DS" value={currentSubject.code} onChange={e => setCurrentSubject({...currentSubject, code: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Semester</label>
                  <Input type="number" placeholder="3" value={currentSubject.semester} onChange={e => setCurrentSubject({...currentSubject, semester: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Credits</label>
                  <Input type="number" placeholder="3" value={currentSubject.credits} onChange={e => setCurrentSubject({...currentSubject, credits: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Department</label>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#C8102E]"
                  value={currentSubject.departmentId}
                  onChange={e => setCurrentSubject({...currentSubject, departmentId: e.target.value})}
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="labCheck"
                  checked={currentSubject.labRequired}
                  onChange={e => setCurrentSubject({...currentSubject, labRequired: e.target.checked})}
                  className="rounded text-[#C8102E] focus:ring-[#C8102E]"
                />
                <label htmlFor="labCheck" className="text-xs font-medium text-slate-700">Requires Practical / Lab Session</label>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <button className="mmit-btn-primary" onClick={() => handleSave(false)}>Save Subject</button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table Section */}
      <div className="mmit-table-container">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search subject code, name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#C8102E]"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="h-9 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#C8102E]"
            >
              <option value="ALL">All Course Types</option>
              <option value="THEORY">Theory Only</option>
              <option value="LAB">Practical / Lab Only</option>
            </select>
          </div>
          <span className="text-xs text-slate-500 font-bold">
            Showing {filteredSubjects.length} of {subjects.length} Subjects
          </span>
        </div>

        <table className="mmit-table">
          <thead>
            <tr>
              <th>Sr No</th>
              <th>Code</th>
              <th>Subject Name</th>
              <th>Semester</th>
              <th>Credits</th>
              <th>Type</th>
              <th>Department</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#C8102E]" />
                  Loading subject catalog...
                </td>
              </tr>
            ) : filteredSubjects.map((sub, index) => (
              <tr key={sub.id}>
                <td className="font-semibold text-slate-500">{index + 1}</td>
                <td>
                  <span className="mmit-badge-red font-mono font-bold">{sub.code}</span>
                </td>
                <td className="font-bold text-slate-900">{sub.name}</td>
                <td className="font-semibold text-slate-700">Sem {sub.semester}</td>
                <td className="font-semibold text-slate-700">{sub.credits} Credits</td>
                <td>
                  {sub.labRequired ? (
                    <span className="mmit-badge-blue">Practical Lab</span>
                  ) : (
                    <span className="mmit-badge-gray">Theory</span>
                  )}
                </td>
                <td className="text-slate-600 text-xs">{sub.department?.name || 'Computer Engineering'}</td>
                <td className="text-right space-x-1">
                  <button
                    onClick={() => {
                      setCurrentSubject({ id: sub.id, name: sub.name, code: sub.code, semester: sub.semester.toString(), credits: sub.credits.toString(), departmentId: sub.departmentId, labRequired: sub.labRequired });
                      setIsEditOpen(true);
                    }}
                    className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-blue-600 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(sub.id)}
                    className="p-1.5 rounded-md hover:bg-red-50 text-slate-600 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
