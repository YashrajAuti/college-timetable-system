"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, GraduationCap, Search, Loader2, UserCheck, Eye, AlertCircle, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DEFAULT_TEACHERS } from "./defaultTeachersData";

const generateCodeFromName = (rawName: string): string => {
  if (!rawName) return '';
  const cleaned = rawName
    .replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.|Prof\.)\s+/i, '')
    .trim();
  const words = cleaned.split(/\s+/).filter(w => w.length > 0);
  return words.map(w => w[0]?.toUpperCase() || '').join('');
};

const DEFAULT_DEPARTMENTS = [
  { id: '197ac8fb-0c31-4d58-b25d-783aceda5631', name: 'Computer Engineering', code: 'CE' },
  { id: '9ddcd5f0-6e71-4d8e-9bc6-333f2c9fbd2a', name: 'Artificial Intelligence & Data Science', code: 'AIDS' },
  { id: '3c6b601e-1a83-4d0e-acb8-f755d3ca59b7', name: 'Mechatronics Engineering', code: 'MTE' },
  { id: '643d2c50-9c3d-4fb3-b331-f8748e9689b6', name: 'Mechanical Engineering', code: 'ME' },
  { id: '3392eae4-5234-49eb-8056-b42b0dbae630', name: 'Civil Engineering', code: 'CIVIL' },
  { id: '333d6dc6-798c-412e-a645-313c85eb2518', name: 'Robotics and AI Engineering', code: 'RAI' },
  { id: 'ecdc710d-07a9-4dc3-9872-ece45211343b', name: 'Engineering Sciences (FE)', code: 'FE' }
];

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>(DEFAULT_DEPARTMENTS);
  const [selectedDeptId, setSelectedDeptId] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  
  const [currentTeacher, setCurrentTeacher] = useState({ 
    id: '', 
    name: '', 
    employeeId: '', 
    email: '', 
    departmentId: DEFAULT_DEPARTMENTS[0].id,
    designation: 'Faculty'
  });

  const [codeConflict, setCodeConflict] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchDepartments = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/departments');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setDepartments(data);
          if (!currentTeacher.departmentId) {
            setCurrentTeacher(prev => ({ ...prev, departmentId: data[0].id }));
          }
        }
      }
    } catch (err) {
      console.warn("Using fallback department list for teachers page:", err);
    }
  };

  const fetchTeachers = async (deptId: string = "ALL") => {
    try {
      setLoading(true);
      const url = deptId !== "ALL" 
        ? `http://localhost:5000/api/teachers?departmentId=${deptId}`
        : 'http://localhost:5000/api/teachers';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setTeachers(data);
          return;
        }
      }
      
      const fallbackList = deptId === "ALL" 
        ? DEFAULT_TEACHERS 
        : DEFAULT_TEACHERS.filter((t: any) => t.departmentId === deptId || t.departments?.some((td: any) => td.department?.id === deptId));
      setTeachers(fallbackList);
    } catch (err) {
      console.warn("Using fallback faculty roster:", err);
      const fallbackList = deptId === "ALL" 
        ? DEFAULT_TEACHERS 
        : DEFAULT_TEACHERS.filter((t: any) => t.departmentId === deptId || t.departments?.some((td: any) => td.department?.id === deptId));
      setTeachers(fallbackList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchTeachers("ALL");
  }, []);

  const handleDeptFilterChange = (deptId: string) => {
    setSelectedDeptId(deptId);
    fetchTeachers(deptId);
  };

  const handleNameChange = (nameVal: string) => {
    const suggestedCode = generateCodeFromName(nameVal);
    const updatedTeacher = { ...currentTeacher, name: nameVal, employeeId: suggestedCode };
    setCurrentTeacher(updatedTeacher);
    
    // Check conflict
    const isConflict = teachers.some(t => 
      t.employeeId.toUpperCase() === suggestedCode.toUpperCase() && t.id !== currentTeacher.id
    );
    setCodeConflict(isConflict);
    setFormError(isConflict ? "Faculty code already exists." : "");
  };

  const handleCodeChange = (codeVal: string) => {
    const cleanCode = codeVal.trim().toUpperCase();
    setCurrentTeacher({ ...currentTeacher, employeeId: cleanCode });

    const isConflict = teachers.some(t => 
      t.employeeId.toUpperCase() === cleanCode && t.id !== currentTeacher.id
    );
    setCodeConflict(isConflict);
    setFormError(isConflict ? "Faculty code already exists." : "");
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) return;
    try {
      const res = await fetch(`http://localhost:5000/api/teachers/${id}`, { method: 'DELETE' });
      if (res.ok) fetchTeachers(selectedDeptId);
    } catch (err) {
      console.error("Error deleting teacher:", err);
    }
  };

  const handleSave = async (isEdit: boolean) => {
    if (!currentTeacher.name || !currentTeacher.employeeId || !currentTeacher.departmentId) {
      setFormError("Name, Faculty Code, and Department are required.");
      return;
    }

    if (codeConflict) {
      setFormError("Faculty code already exists. Please choose a unique code.");
      return;
    }

    const url = isEdit ? `http://localhost:5000/api/teachers/${currentTeacher.id}` : `http://localhost:5000/api/teachers`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentTeacher)
      });
      const resData = await res.json();

      if (!res.ok) {
        setFormError(resData.message || "Faculty code already exists.");
        setCodeConflict(true);
        return;
      }

      fetchTeachers(selectedDeptId);
      setIsAddOpen(false);
      setIsEditOpen(false);
      setFormError("");
      setCodeConflict(false);
      setCurrentTeacher({ id: '', name: '', employeeId: '', email: '', departmentId: departments[0]?.id || '', designation: 'Faculty' });
    } catch (err) {
      console.error(err);
      setFormError("Failed to save faculty record.");
    }
  };

  const filteredTeachers = teachers.filter(t => {
    const matchesQuery = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         t.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (t.department?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesQuery;
  });

  return (
    <div className="space-y-6">
      {/* Page Title & Top Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="mmit-badge-red">Centralized Master Data</span>
            <span className="text-xs font-semibold text-slate-500">MMIT Faculty Database</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Faculty Master Roster
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Centralized database of teaching faculty members across all 7 MMIT college departments.
          </p>
        </div>

        {/* Add Faculty Modal */}
        <Dialog open={isAddOpen} onOpenChange={(open) => { 
          setIsAddOpen(open); 
          setFormError(""); 
          setCodeConflict(false);
          if(!open) setCurrentTeacher({ id: '', name: '', employeeId: '', email: '', departmentId: departments[0]?.id || '', designation: 'Faculty' }); 
        }}>
          <DialogTrigger asChild>
            <button className="mmit-btn-primary self-start sm:self-auto cursor-pointer" onClick={() => setIsAddOpen(true)}>
              <Plus className="w-4 h-4" /> Add Faculty Member
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-white border border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-[#C8102E]" /> Add Faculty Member
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-3">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs font-bold text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Faculty Full Name</label>
                <Input 
                  placeholder="e.g. Dr. Umesh P. Moharil" 
                  value={currentTeacher.name} 
                  onChange={e => handleNameChange(e.target.value)} 
                />
                <span className="text-[11px] text-slate-500">Initials will auto-generate faculty code.</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Faculty Code</label>
                  {codeConflict && (
                    <span className="text-[10px] font-bold text-red-600">Code Already Taken</span>
                  )}
                </div>
                <Input 
                  placeholder="e.g. UPM" 
                  value={currentTeacher.employeeId} 
                  onChange={e => handleCodeChange(e.target.value)} 
                  className={codeConflict ? "border-red-500 focus:ring-red-500" : ""}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Email Address</label>
                <Input 
                  placeholder="e.g. upm@mmit.edu.in" 
                  value={currentTeacher.email} 
                  onChange={e => setCurrentTeacher({...currentTeacher, email: e.target.value})} 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Primary Department</label>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#C8102E]"
                  value={currentTeacher.departmentId}
                  onChange={e => setCurrentTeacher({...currentTeacher, departmentId: e.target.value})}
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <button className="mmit-btn-primary" onClick={() => handleSave(false)}>Save Faculty</button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Faculty Modal */}
        <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); setFormError(""); setCodeConflict(false); }}>
          <DialogContent className="sm:max-w-md bg-white border border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-[#C8102E]" /> Edit Faculty Member
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-3">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs font-bold text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Faculty Full Name</label>
                <Input value={currentTeacher.name} onChange={e => setCurrentTeacher({...currentTeacher, name: e.target.value})} />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Faculty Code</label>
                <Input 
                  value={currentTeacher.employeeId} 
                  onChange={e => handleCodeChange(e.target.value)} 
                  className={codeConflict ? "border-red-500 focus:ring-red-500" : ""}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Email Address</label>
                <Input value={currentTeacher.email} onChange={e => setCurrentTeacher({...currentTeacher, email: e.target.value})} />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Department</label>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#C8102E]"
                  value={currentTeacher.departmentId}
                  onChange={e => setCurrentTeacher({...currentTeacher, departmentId: e.target.value})}
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                <button className="mmit-btn-primary" onClick={() => handleSave(true)}>Update Faculty</button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Table Section with Department Filter & Search */}
      <div className="mmit-table-container">
        {/* Controls Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Department Filter Dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Building2 className="w-4 h-4 text-[#C8102E] shrink-0" />
            <label htmlFor="deptFilterSelect" className="text-xs font-bold text-slate-700 uppercase tracking-wider shrink-0">
              Department Filter:
            </label>
            <select
              id="deptFilterSelect"
              value={selectedDeptId}
              onChange={(e) => handleDeptFilterChange(e.target.value)}
              className="flex h-9 w-full sm:w-72 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-2xs focus:outline-none focus:border-[#C8102E]"
            >
              <option value="ALL">All College Departments ({teachers.length})</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box & Record Counter */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search faculty name, code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#C8102E]"
              />
            </div>
            <span className="text-xs text-slate-500 font-bold shrink-0">
              {filteredTeachers.length} Members
            </span>
          </div>
        </div>

        {/* Faculty Table */}
        <table className="mmit-table">
          <thead>
            <tr>
              <th>Sr No</th>
              <th>Faculty Code</th>
              <th>Faculty Name</th>
              <th>Primary Department</th>
              <th>Associated Departments</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#C8102E]" />
                  Loading faculty master database...
                </td>
              </tr>
            ) : filteredTeachers.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-500">
                  <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  No faculty members found for the selected department.
                </td>
              </tr>
            ) : filteredTeachers.map((teacher, index) => {
              const code = teacher.employeeId;
              const associatedDepts = teacher.departments?.map((td: any) => td.department?.code || td.department?.name) || [];

              return (
                <tr key={teacher.id}>
                  <td className="font-semibold text-slate-500">{index + 1}</td>
                  <td>
                    <span className="mmit-badge-red font-mono font-bold">{code}</span>
                  </td>
                  <td className="font-bold text-slate-900">{teacher.name}</td>
                  <td className="text-slate-700 font-medium">{teacher.department?.name || 'Computer Engineering'}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {associatedDepts.length > 0 ? (
                        associatedDepts.map((dCode: string, i: number) => (
                          <span key={i} className="mmit-badge-blue text-[10px]">
                            {dCode}
                          </span>
                        ))
                      ) : (
                        <span className="mmit-badge-gray text-[10px]">
                          {teacher.department?.code || 'CE'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="mmit-badge-emerald">Active</span>
                  </td>
                  <td className="text-right space-x-1">
                    <button
                      onClick={() => setSelectedTeacher(teacher)}
                      className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-[#C8102E] transition-colors cursor-pointer"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setCurrentTeacher({ 
                          id: teacher.id, 
                          name: teacher.name, 
                          employeeId: teacher.employeeId, 
                          email: teacher.email || '', 
                          departmentId: teacher.departmentId,
                          designation: teacher.designation || 'Faculty'
                        });
                        setIsEditOpen(true);
                      }}
                      className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
                      title="Edit Faculty"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(teacher.id, teacher.name)}
                      className="p-1.5 rounded-md hover:bg-red-50 text-slate-600 hover:text-red-600 transition-colors cursor-pointer"
                      title="Delete Faculty"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detailed View Modal */}
      {selectedTeacher && (
        <Dialog open={!!selectedTeacher} onOpenChange={() => setSelectedTeacher(null)}>
          <DialogContent className="sm:max-w-lg bg-white border border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900 flex items-center justify-between">
                <span>Faculty Profile Detail</span>
                <span className="mmit-badge-red font-mono">{selectedTeacher.employeeId}</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2 text-sm">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <h3 className="text-base font-bold text-slate-900">{selectedTeacher.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedTeacher.email || 'Faculty Member • MMIT Pune'}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="mmit-badge-gray">{selectedTeacher.department?.name || 'Computer Engineering'}</span>
                  <span className="mmit-badge-emerald">Active</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Associated Departments</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedTeacher.departments?.map((td: any) => (
                    <span key={td.department?.id || td.id} className="mmit-badge-blue">
                      {td.department?.name} ({td.department?.code})
                    </span>
                  )) || (
                    <span className="mmit-badge-blue">{selectedTeacher.department?.name}</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Workload Capacity</h4>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2.5 rounded-md bg-slate-100 border border-slate-200">
                    <span className="text-xs text-slate-500 font-medium">Designation</span>
                    <p className="text-sm font-extrabold text-slate-800">{selectedTeacher.designation || 'Faculty'}</p>
                  </div>
                  <div className="p-2.5 rounded-md bg-emerald-50 border border-emerald-200/60">
                    <span className="text-xs text-slate-500 font-medium">Max Weekly Limit</span>
                    <p className="text-sm font-extrabold text-emerald-800">{selectedTeacher.maxWeeklyHours || 40} hrs/wk</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button variant="outline" onClick={() => setSelectedTeacher(null)}>Close</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
