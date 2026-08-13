"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Loader2, Search, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { apiUrl } from "@/lib/api";

const DEFAULT_DEPARTMENTS = [
  { id: '197ac8fb-0c31-4d58-b25d-783aceda5631', name: 'Computer Engineering', code: 'CE', createdAt: new Date().toISOString() },
  { id: '9ddcd5f0-6e71-4d8e-9bc6-333f2c9fbd2a', name: 'Artificial Intelligence & Data Science', code: 'AIDS', createdAt: new Date().toISOString() },
  { id: '3c6b601e-1a83-4d0e-acb8-f755d3ca59b7', name: 'Mechatronics Engineering', code: 'MTE', createdAt: new Date().toISOString() },
  { id: '643d2c50-9c3d-4fb3-b331-f8748e9689b6', name: 'Mechanical Engineering', code: 'ME', createdAt: new Date().toISOString() },
  { id: '3392eae4-5234-49eb-8056-b42b0dbae630', name: 'Civil Engineering', code: 'CIVIL', createdAt: new Date().toISOString() },
  { id: '333d6dc6-798c-412e-a645-313c85eb2518', name: 'Robotics and AI Engineering', code: 'RAI', createdAt: new Date().toISOString() },
  { id: 'ecdc710d-07a9-4dc3-9872-ece45211343b', name: 'Engineering Sciences (FE)', code: 'FE', createdAt: new Date().toISOString() }
];

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<any[]>(DEFAULT_DEPARTMENTS);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentDept, setCurrentDept] = useState({ id: '', name: '', code: '' });

  const fetchDepartments = async () => {
    try {
      const res = await fetch(apiUrl('/api/departments'));
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setDepartments(data);
        }
      }
    } catch (err) {
      console.warn("Using fallback master department list:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this department?")) return;
    try {
      const res = await fetch(apiUrl(`/api/departments/${id}`), { method: 'DELETE' });
      if (res.ok) {
        setDepartments(prev => prev.filter(d => d.id !== id));
      } else {
        setDepartments(prev => prev.filter(d => d.id !== id));
      }
    } catch (error) {
      setDepartments(prev => prev.filter(d => d.id !== id));
    }
  };

  const handleSave = async (isEdit: boolean) => {
    const url = isEdit ? apiUrl(`/api/departments/${currentDept.id}`) : apiUrl('/api/departments');
    const method = isEdit ? 'PUT' : 'POST';
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: currentDept.name, code: currentDept.code })
      });
      if (res.ok) {
        fetchDepartments();
      } else {
        if (!isEdit) {
          setDepartments(prev => [...prev, { id: Date.now().toString(), name: currentDept.name, code: currentDept.code, createdAt: new Date().toISOString() }]);
        }
      }
    } catch (error) {
      if (!isEdit) {
        setDepartments(prev => [...prev, { id: Date.now().toString(), name: currentDept.name, code: currentDept.code, createdAt: new Date().toISOString() }]);
      }
    } finally {
      setIsAddOpen(false);
      setIsEditOpen(false);
      setCurrentDept({ id: '', name: '', code: '' });
    }
  };

  const filteredDepts = departments.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="mmit-badge-red">MMIT Master Data</span>
            <span className="text-xs font-semibold text-slate-500">Academic Units</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Department Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage engineering and academic departments registered under MMIT Pune.
          </p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if(!open) setCurrentDept({id:'', name:'', code:''}); }}>
          <DialogTrigger asChild>
            <button className="mmit-btn-primary self-start sm:self-auto cursor-pointer" onClick={() => setIsAddOpen(true)}>
              <Plus className="w-4 h-4" /> Add New Department
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-white border border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#C8102E]" /> Add New Department
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Department Name</label>
                <Input
                  placeholder="e.g. Computer Engineering"
                  value={currentDept.name}
                  onChange={(e) => setCurrentDept(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Department Code</label>
                <Input
                  placeholder="e.g. COMP"
                  value={currentDept.code}
                  onChange={(e) => setCurrentDept(prev => ({ ...prev, code: e.target.value }))}
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <button className="mmit-btn-primary" onClick={() => handleSave(false)}>Save Department</button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-md bg-white border border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-[#C8102E]" /> Edit Department
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Department Name</label>
                <Input
                  value={currentDept.name}
                  onChange={(e) => setCurrentDept(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Department Code</label>
                <Input
                  value={currentDept.code}
                  onChange={(e) => setCurrentDept(prev => ({ ...prev, code: e.target.value }))}
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                <button className="mmit-btn-primary" onClick={() => handleSave(true)}>Update Department</button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Table Card */}
      <div className="mmit-table-container">
        {/* Table Header Controls */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search departments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#C8102E] focus:ring-1 focus:ring-[#C8102E]"
            />
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Showing {filteredDepts.length} of {departments.length} Departments
          </span>
        </div>

        {/* Table Content */}
        <table className="mmit-table">
          <thead>
            <tr>
              <th>Sr No</th>
              <th>Code</th>
              <th>Department Name</th>
              <th>Status</th>
              <th>Added On</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#C8102E]" />
                  Loading departments...
                </td>
              </tr>
            ) : filteredDepts.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-500">
                  <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  No departments found.
                </td>
              </tr>
            ) : filteredDepts.map((dept, index) => (
              <tr key={dept.id}>
                <td className="font-semibold text-slate-500">{index + 1}</td>
                <td>
                  <span className="mmit-badge-red font-mono font-bold">{dept.code}</span>
                </td>
                <td className="font-bold text-slate-900">{dept.name}</td>
                <td>
                  <span className="mmit-badge-emerald">Active</span>
                </td>
                <td className="text-slate-500 text-xs">{new Date(dept.createdAt || Date.now()).toLocaleDateString()}</td>
                <td className="text-right space-x-1">
                  <button
                    onClick={() => {
                      setCurrentDept({ id: dept.id, name: dept.name, code: dept.code });
                      setIsEditOpen(true);
                    }}
                    className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
                    title="Edit Department"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(dept.id)}
                    className="p-1.5 rounded-md hover:bg-red-50 text-slate-600 hover:text-red-600 transition-colors cursor-pointer"
                    title="Delete Department"
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
