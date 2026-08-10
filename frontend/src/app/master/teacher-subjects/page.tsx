"use client";

import { useState, useEffect } from 'react';
import { Plus, Trash2, FileSpreadsheet, Search, Loader2, UserCheck, BookOpen, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TeacherSubjectsMaster() {
  const [mappings, setMappings] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedDiv, setSelectedDiv] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mapRes, tRes, dRes, sRes] = await Promise.all([
        fetch('http://localhost:5000/api/master-subjects'),
        fetch('http://localhost:5000/api/teachers'),
        fetch('http://localhost:5000/api/divisions'),
        fetch('http://localhost:5000/api/subjects')
      ]);
      setMappings(await mapRes.json());
      setTeachers(await tRes.json());
      setDivisions(await dRes.json());
      setSubjects(await sRes.json());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = async () => {
    if (!selectedTeacher || !selectedDiv || !selectedSubject) return;
    try {
      const res = await fetch('http://localhost:5000/api/master-subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: selectedTeacher,
          divisionId: selectedDiv,
          subjectId: selectedSubject
        })
      });
      if (res.ok) {
        fetchData();
        setSelectedDiv('');
        setSelectedSubject('');
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to add mapping');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this master workload mapping?')) return;
    try {
      await fetch(`http://localhost:5000/api/master-subjects/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  // Filter subjects based on division's year
  const currentDiv = divisions.find(d => d.id === selectedDiv);
  let availableSubjects = subjects;
  if (currentDiv) {
      const sem = currentDiv.year.year === 2 ? 3 : (currentDiv.year.year === 3 ? 5 : 7);
      availableSubjects = subjects.filter(s => s.semester === sem || s.semester === sem + 1);
  }

  const filteredMappings = mappings.filter(m =>
    (m.teacher?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.subject?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.division?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="mmit-badge-red">MMIT Master Configuration</span>
            <span className="text-xs font-semibold text-slate-500">Authorization Rules</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Teacher-Subject Master Data
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Define which subjects each faculty member is qualified & authorized to teach for specific academic divisions.
          </p>
        </div>
      </div>

      {/* Add New Mapping Form Card */}
      <div className="mmit-card p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-[#990000]" /> Authorize New Faculty Mapping
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Faculty Member</label>
            <select
              value={selectedTeacher}
              onChange={e => setSelectedTeacher(e.target.value)}
              className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm bg-white focus:outline-none focus:border-[#990000]"
            >
              <option value="">-- Choose Faculty --</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.name} ({t.employeeId.replace('EMP-', '')})</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Class / Division</label>
            <select
              value={selectedDiv}
              onChange={e => setSelectedDiv(e.target.value)}
              className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm bg-white focus:outline-none focus:border-[#990000]"
            >
              <option value="">-- Choose Class --</option>
              {divisions.map(d => <option key={d.id} value={d.id}>Year {d.year.year} - Div {d.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Course Subject</label>
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm bg-white focus:outline-none focus:border-[#990000]"
            >
              <option value="">-- Choose Subject --</option>
              {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
            </select>
          </div>

          <div>
            <button
              onClick={handleAdd}
              disabled={!selectedTeacher || !selectedDiv || !selectedSubject}
              className="w-full mmit-btn-primary h-10 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Authorization
            </button>
          </div>
        </div>
      </div>

      {/* Mappings Table Card */}
      <div className="mmit-table-container">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search faculty, subject, class..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#990000] focus:ring-1 focus:ring-[#990000]"
            />
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Showing {filteredMappings.length} of {mappings.length} Authorized Mappings
          </span>
        </div>

        <table className="mmit-table">
          <thead>
            <tr>
              <th>Sr No</th>
              <th>Faculty Name</th>
              <th>Class / Division</th>
              <th>Authorized Subject Code</th>
              <th>Subject Name</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#990000]" />
                  Loading master data mappings...
                </td>
              </tr>
            ) : filteredMappings.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-500">
                  <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  No master mappings found.
                </td>
              </tr>
            ) : filteredMappings.map((m, i) => (
              <tr key={m.id}>
                <td className="font-semibold text-slate-500">{i + 1}</td>
                <td className="font-bold text-slate-900">{m.teacher?.name}</td>
                <td>
                  <span className="mmit-badge-blue">Year {m.division?.year?.year} - Div {m.division?.name}</span>
                </td>
                <td>
                  <span className="mmit-badge-red font-mono">{m.subject?.code}</span>
                </td>
                <td className="font-semibold text-slate-800">{m.subject?.name}</td>
                <td>
                  <span className="mmit-badge-emerald">Authorized</span>
                </td>
                <td className="text-right">
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="p-1.5 rounded-md hover:bg-red-50 text-slate-600 hover:text-red-600 transition-colors"
                    title="Remove Authorization"
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
