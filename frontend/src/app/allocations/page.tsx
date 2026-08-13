"use client";

import { useEffect, useState, useMemo } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  ClipboardList,
  Search,
  Loader2,
  Users,
  Clock,
  BookOpen,
  Eye,
  Filter,
  BarChart3,
  PieChart,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  Layers,
  Building2
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';
import { AddAllocationModal } from '@/components/AddAllocationModal';
import { FacultyDetailModal } from '@/components/FacultyDetailModal';
import { EditAllocationModal } from '@/components/EditAllocationModal';

export default function AllocationsPage() {
  const [summaryData, setSummaryData] = useState<any[]>([]);
  const [allocationsList, setAllocationsList] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [graphData, setGraphData] = useState<any>({
    facultyWorkload: [],
    workloadBreakdown: [],
    departmentWorkload: []
  });

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Filters
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [selectedDiv, setSelectedDiv] = useState('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<any>(null);
  const [editingAllocation, setEditingAllocation] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const deptParam = selectedDept !== 'ALL' ? `?departmentId=${selectedDept}` : '';
      const summaryUrl = `http://localhost:5050/api/allocations/summary${deptParam}`;
      const graphUrl = `http://localhost:5050/api/allocations/graphs${deptParam}`;
      const allocUrl = `http://localhost:5050/api/allocations${deptParam}`;
      const deptUrl = `http://localhost:5050/api/departments`;

      const [sumRes, graphRes, allocRes, deptRes] = await Promise.all([
        fetch(summaryUrl),
        fetch(graphUrl),
        fetch(allocUrl),
        fetch(deptUrl)
      ]);

      const sumData = await sumRes.json();
      const gData = await graphRes.json();
      const aData = await allocRes.json();
      const dData = await deptRes.json();

      if (Array.isArray(sumData)) setSummaryData(sumData);
      if (gData && gData.facultyWorkload) setGraphData(gData);
      if (Array.isArray(aData)) setAllocationsList(aData);
      if (Array.isArray(dData)) setDepartments(dData);
    } catch (err) {
      console.error('Error fetching workload master data:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [selectedDept]);

  // Overall KPI metrics
  const totals = useMemo(() => {
    let facultyCount = summaryData.length;
    let allocationsCount = allocationsList.length;
    let theory = 0;
    let practical = 0;
    let tutorial = 0;
    let project = 0;

    summaryData.forEach(f => {
      theory += f.totalTheory || 0;
      practical += f.totalPractical || 0;
      tutorial += f.totalTutorial || 0;
      project += f.totalProject || 0;
    });

    const totalHours = theory + practical + tutorial + project;
    return {
      facultyCount,
      allocationsCount,
      theory,
      practical,
      tutorial,
      project,
      totalHours
    };
  }, [summaryData, allocationsList]);

  // Search and Table Filtering
  const filteredFaculty = useMemo(() => {
    return summaryData.filter(f => {
      // Search term matching
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (f.facultyName || '').toLowerCase().includes(q) ||
        (f.facultyCode || '').toLowerCase().includes(q) ||
        (f.designation || '').toLowerCase().includes(q) ||
        (f.departmentName || '').toLowerCase().includes(q) ||
        (f.allocations || []).some((a: any) =>
          (a.courseName || a.subject?.name || '').toLowerCase().includes(q) ||
          (a.courseCode || a.subject?.code || '').toLowerCase().includes(q) ||
          (a.className || '').toLowerCase().includes(q) ||
          (a.divisionName || '').toLowerCase().includes(q)
        );

      // Class Filter
      const matchesClass =
        selectedClass === 'ALL' ||
        (f.allocations || []).some((a: any) => (a.className || '').toUpperCase() === selectedClass);

      // Division Filter
      const matchesDiv =
        selectedDiv === 'ALL' ||
        (f.allocations || []).some((a: any) => (a.divisionName || '').includes(selectedDiv));

      return matchesSearch && matchesClass && matchesDiv;
    });
  }, [summaryData, searchQuery, selectedClass, selectedDiv]);

  const openFacultyDetail = (fac: any) => {
    setSelectedFaculty(fac);
    setIsDetailModalOpen(true);
  };

  const openAddModal = (alloc?: any) => {
    setEditingAllocation(alloc || null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (alloc: any) => {
    setEditingAllocation(alloc);
    setIsEditModalOpen(true);
  };

  const handleDeleteAllocation = async (id: string, courseName?: string) => {
    const confirmMessage = courseName
      ? `Delete Faculty Workload Assignment?\n\nCourse: ${courseName}\n\nThis will permanently remove this assignment from the Faculty Workload Directory.\nThis action will recalculate faculty workload totals and invalidate existing timetables.`
      : `Delete Faculty Workload Assignment?\n\nThis will permanently remove this assignment from the Faculty Workload Directory.\nThis action will recalculate faculty workload totals and invalidate existing timetables.`;

    if (!confirm(confirmMessage)) return;
    try {
      await fetch(`http://localhost:5050/api/allocations/${id}`, { method: 'DELETE' });
      fetchData();
      if (isDetailModalOpen) {
        setIsDetailModalOpen(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFaculty = async (teacherId: string, teacherName: string) => {
    if (!confirm(`Delete Entire Faculty Member?\n\nFaculty: ${teacherName}\n\nWARNING: This will permanently remove all workload assignments for this faculty member.\nAre you sure you want to proceed?`)) return;
    try {
      await fetch(`http://localhost:5050/api/teachers/${teacherId}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Normal':
        return <span className="mmit-badge-emerald font-bold">Normal</span>;
      case 'High':
        return <span className="mmit-badge-amber font-bold">High Load</span>;
      case 'Overloaded':
        return <span className="mmit-badge-red font-bold">Overloaded</span>;
      default:
        return <span className="mmit-badge-gray">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="mmit-badge-red">MMIT Academic Management</span>
            <span className="text-xs font-semibold text-slate-500">Workload & Teaching Assignments</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Faculty Workload Master
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage faculty teaching allocations and weekly workload across departments.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => openAddModal()}
            className="mmit-btn-primary cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Faculty Allocation
          </button>
        </div>
      </div>

      {/* Top Summary Cards (7 Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="mmit-card p-4 space-y-1 border-l-4 border-l-[#C8102E]">
          <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Total Faculty</p>
          <p className="text-xl font-black text-slate-900">{totals.facultyCount}</p>
        </div>

        <div className="mmit-card p-4 space-y-1 border-l-4 border-l-blue-600">
          <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Allocations</p>
          <p className="text-xl font-black text-blue-900">{totals.allocationsCount}</p>
        </div>

        <div className="mmit-card p-4 space-y-1 border-l-4 border-l-emerald-600">
          <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Theory Hrs</p>
          <p className="text-xl font-black text-emerald-900">{totals.theory} h/wk</p>
        </div>

        <div className="mmit-card p-4 space-y-1 border-l-4 border-l-amber-500">
          <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Practical Hrs</p>
          <p className="text-xl font-black text-amber-900">{totals.practical} h/wk</p>
        </div>

        <div className="mmit-card p-4 space-y-1 border-l-4 border-l-purple-600">
          <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Tutorial Hrs</p>
          <p className="text-xl font-black text-purple-900">{totals.tutorial} h/wk</p>
        </div>

        <div className="mmit-card p-4 space-y-1 border-l-4 border-l-indigo-600">
          <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Project Hrs</p>
          <p className="text-xl font-black text-indigo-900">{totals.project} h/wk</p>
        </div>

        <div className="mmit-card p-4 space-y-1 bg-slate-900 text-white rounded-lg col-span-2 sm:col-span-1 border-l-4 border-l-red-500">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Teaching Load</p>
          <p className="text-xl font-black text-red-400">{totals.totalHours} hrs/wk</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="mmit-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
          <Filter className="w-4 h-4 text-[#C8102E]" /> Workload Filters & Search Controls
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Department Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500">Department</label>
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="w-full h-9 border border-slate-200 rounded-md px-3 text-xs bg-white focus:outline-none focus:border-[#C8102E] font-semibold"
            >
              <option value="ALL">All Departments ({departments.length})</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
          </div>

          {/* Academic Year Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500">Academic Year</label>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="w-full h-9 border border-slate-200 rounded-md px-3 text-xs bg-white focus:outline-none focus:border-[#C8102E]"
            >
              <option value="ALL">All Academic Years</option>
              <option value="2026-27">2026-27 (Current Master)</option>
              <option value="2025-26">2025-26</option>
              <option value="2024-25">2024-25</option>
            </select>
          </div>

          {/* Class Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500">Class</label>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="w-full h-9 border border-slate-200 rounded-md px-3 text-xs bg-white focus:outline-none focus:border-[#C8102E]"
            >
              <option value="ALL">All Classes (FE-BE)</option>
              <option value="FE">FE (First Year)</option>
              <option value="SE">SE (Second Year)</option>
              <option value="TE">TE (Third Year)</option>
              <option value="BE">BE (Final Year)</option>
            </select>
          </div>

          {/* Division Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500">Division</label>
            <select
              value={selectedDiv}
              onChange={e => setSelectedDiv(e.target.value)}
              className="w-full h-9 border border-slate-200 rounded-md px-3 text-xs bg-white focus:outline-none focus:border-[#C8102E]"
            >
              <option value="ALL">All Divisions</option>
              <option value="A">Division A</option>
              <option value="B">Division B</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500">Search Faculty / Course</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search UPM, Rathod, AI..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#C8102E]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Faculty Table Card */}
      <div className="mmit-table-container">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#C8102E]" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Faculty Workload Directory
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Showing {filteredFaculty.length} of {summaryData.length} Faculty Members
          </span>
        </div>

        <table className="mmit-table">
          <thead>
            <tr>
              <th className="w-12">Sr. No.</th>
              <th className="w-24">Faculty Code</th>
              <th>Faculty Name</th>
              <th>Designation</th>
              <th>Department</th>
              <th className="text-center">Theory</th>
              <th className="text-center">Practical</th>
              <th className="text-center">Tutorial</th>
              <th className="text-center">Project</th>
              <th className="text-center">Total Workload</th>
              <th className="text-center">Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={12} className="text-center py-12 text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#C8102E]" />
                  Loading faculty workload master records...
                </td>
              </tr>
            ) : filteredFaculty.length === 0 ? (
              <tr>
                <td colSpan={12} className="text-center py-12 text-slate-500">
                  <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  No faculty records found matching filters.
                </td>
              </tr>
            ) : (
              filteredFaculty.map((f, i) => (
                <tr key={f.id || i} className="hover:bg-[#FEF2F2]/60 transition-colors">
                  <td className="font-semibold text-slate-500">{i + 1}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <span className="mmit-badge-red font-mono font-bold text-[11px] px-2 py-0.5">
                        {f.facultyCode}
                      </span>
                      {f.isCodeFlagged && (
                        <span title={f.codeFlagReason || 'Flagged for review'} className="text-amber-500">
                          <AlertTriangle className="w-3.5 h-3.5 cursor-help" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="font-bold text-slate-900">
                    <button
                      onClick={() => openFacultyDetail(f)}
                      className="hover:text-[#C8102E] hover:underline text-left cursor-pointer"
                    >
                      {f.facultyName}
                    </button>
                  </td>
                  <td className="text-slate-700 text-xs font-semibold">{f.designation}</td>
                  <td className="text-slate-600 text-xs">{f.departmentName}</td>
                  <td className="text-center font-semibold text-slate-700">{f.totalTheory} h</td>
                  <td className="text-center font-semibold text-slate-700">{f.totalPractical} h</td>
                  <td className="text-center font-semibold text-slate-700">{f.totalTutorial} h</td>
                  <td className="text-center font-semibold text-slate-700">{f.totalProject} h</td>
                  <td className="text-center font-black text-slate-900 text-sm">
                    {f.totalWorkload} hrs/wk
                  </td>
                  <td className="text-center">{getStatusBadge(f.status)}</td>
                  <td className="text-right space-x-1 whitespace-nowrap">
                    <button
                      onClick={() => openFacultyDetail(f)}
                      className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
                      title="View Detailed Allocations"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openAddModal({ teacherId: f.id, departmentId: f.departmentId })}
                      className="p-1.5 rounded-md hover:bg-red-50 text-slate-600 hover:text-[#C8102E] transition-colors cursor-pointer text-xs font-bold"
                      title="Add Allocation"
                    >
                      + Allocation
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Workload Graphs (3 Interactive Recharts Charts) */}
      <div className="space-y-6 pt-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#C8102E]" />
          <h2 className="text-lg font-black text-slate-900 tracking-tight">
            Workload Analytics & Visualizations
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Graph 1: Faculty-wise Total Workload */}
          <div className="mmit-card p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#C8102E]" /> Graph 1: Faculty-wise Total Workload (Hours/Week)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Displays total weekly workload hours for each faculty short code
              </p>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={graphData.facultyWorkload} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="code" tick={{ fontSize: 10, fill: '#475569' }} interval={0} angle={-45} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10, fill: '#475569' }} />
                  <Tooltip
                    formatter={(val: any) => [`${val} hrs/wk`, 'Workload']}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                  />
                  <Bar dataKey="totalWorkload" radius={[4, 4, 0, 0]}>
                    {graphData.facultyWorkload.map((entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.status === 'Overloaded' ? '#C8102E' : (entry.status === 'High' ? '#F59E0B' : '#10B981')}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Graph 2: Theory vs Practical Breakdown */}
          <div className="mmit-card p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-[#C8102E]" /> Graph 2: Theory vs Practical vs Tutorial vs Project
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Component breakdown of weekly teaching hours per faculty
              </p>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={graphData.workloadBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="code" tick={{ fontSize: 10, fill: '#475569' }} interval={0} angle={-45} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10, fill: '#475569' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #E5E7EB' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="theory" name="Theory" stackId="a" fill="#C8102E" />
                  <Bar dataKey="practical" name="Practical" stackId="a" fill="#2563EB" />
                  <Bar dataKey="tutorial" name="Tutorial" stackId="a" fill="#8B5CF6" />
                  <Bar dataKey="project" name="Project" stackId="a" fill="#D97706" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Graph 3: Department-wise Total Workload */}
        <div className="mmit-card p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#C8102E]" /> Graph 3: Department-wise Total Workload (Multi-Department Support)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Aggregated teaching load comparison across all college departments
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={graphData.departmentWorkload} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="code" tick={{ fontSize: 12, fontWeight: 'bold', fill: '#1E293B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip
                  formatter={(val: any, name: any) => [`${val} Total Hours`, 'Department Load']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                />
                <Bar dataKey="totalWorkload" name="Department Workload (hrs/wk)" fill="#C8102E" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Modals */}
      <FacultyDetailModal
        isOpen={isDetailModalOpen}
        faculty={selectedFaculty}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedFaculty(null);
        }}
        onRefresh={fetchData}
        onEditAllocation={(alloc) => {
          setIsDetailModalOpen(false);
          openEditModal(alloc);
        }}
        onDeleteAllocation={(allocId, cName) => handleDeleteAllocation(allocId, cName)}
      />

      <EditAllocationModal
        isOpen={isEditModalOpen}
        allocation={editingAllocation}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingAllocation(null);
        }}
        onSuccess={fetchData}
      />

      <AddAllocationModal
        isOpen={isAddModalOpen}
        allocationToEdit={editingAllocation}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingAllocation(null);
          fetchData();
        }}
      />

    </div>
  );
}
