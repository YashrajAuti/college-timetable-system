"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";
import {
  Users,
  Building2,
  BookOpen,
  DoorOpen,
  CalendarDays,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  FlaskConical,
  Filter,
  Layers,
  BarChart3,
  PieChart,
  CheckCircle,
  AlertTriangle,
  ClipboardList
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { useRouter } from "next/navigation";
import { GenerateModal } from "@/components/GenerateModal";

export default function Dashboard() {
  const router = useRouter();
  const [selectedDeptId, setSelectedDeptId] = useState<string>("ALL");
  const [departments, setDepartments] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch departments list dynamically from DB
  useEffect(() => {
    fetch(apiUrl('/api/departments'))
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setDepartments(data);
      })
      .catch(console.error);
  }, []);

  // Fetch dynamic stats from backend when selectedDeptId changes
  useEffect(() => {
    setLoading(true);
    const url = selectedDeptId !== "ALL"
      ? apiUrl(`/api/stats?departmentId=${selectedDeptId}`)
      : apiUrl('/api/stats');

    fetch(url)
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        console.warn("Backend API error fetching stats:", err);
        setLoading(false);
      });
  }, [selectedDeptId]);

  // Selected Department Info
  const selectedDeptObj = departments.find(d => d.id === selectedDeptId);
  const isAll = selectedDeptId === "ALL";

  // Dynamic Metrics from Database API
  const metrics = stats?.metrics || {};
  const totalTeachers = metrics.teachers || 0;
  const totalSubjects = metrics.subjects || 0;
  const totalClassrooms = metrics.classrooms || 0;
  const totalLabs = metrics.labs || 0;
  const totalAllocations = metrics.allocations || 0;
  const totalWorkloadHours = metrics.totalWorkload || 0;

  // Workload Chart Data
  const currentWorkloadData = stats?.workloadData || [];

  const metricsList = [
    {
      title: "Total Faculty",
      value: totalTeachers,
      icon: Users,
      desc: isAll ? "Across All Departments" : `${selectedDeptObj?.code || 'Dept'} Faculty`,
      badge: "Active"
    },
    {
      title: "Total Subjects",
      value: totalSubjects,
      icon: BookOpen,
      desc: isAll ? "Curriculum Syllabus Courses" : `${selectedDeptObj?.code || 'Dept'} Subjects`,
      badge: "Syllabus"
    },
    {
      title: "Lecture Classrooms",
      value: totalClassrooms,
      icon: Building2,
      desc: isAll ? "College-wide Lecture Halls" : `${selectedDeptObj?.code || 'Dept'} Halls`,
      badge: "Allocated"
    },
    {
      title: "Practical Labs",
      value: totalLabs,
      icon: FlaskConical,
      desc: isAll ? "Specialized Practical Labs" : `${selectedDeptObj?.code || 'Dept'} Labs`,
      badge: "Specialized"
    },
    {
      title: "Faculty Allocations",
      value: totalAllocations,
      icon: ClipboardList,
      desc: isAll ? "Total Teaching Assignments" : `${selectedDeptObj?.code || 'Dept'} Assignments`,
      badge: "Verified"
    },
    {
      title: "Weekly Workload",
      value: `${totalWorkloadHours} Hrs`,
      icon: Clock,
      desc: "Total Teaching Load / Week",
      badge: "Scheduled"
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Top Welcome Institutional Banner & Department Selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col xl:flex-row xl:items-start justify-between gap-4 overflow-x-auto">
        <div className="shrink-0">
          <div className="flex items-center gap-2.5 whitespace-nowrap">
            <span className="mmit-badge-red whitespace-nowrap shrink-0">MMIT Central Administration</span>
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap shrink-0">
              {isAll ? "College-wide System" : `Department of ${selectedDeptObj?.name}`}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1.5 whitespace-nowrap">
            MMIT College Timetable Management Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium whitespace-nowrap">
            {isAll
              ? "College-wide academic timetable planning, workload management & resource monitoring across all departments."
              : `Departmental academic timetable planning, faculty workload optimization & room allocation for ${selectedDeptObj?.name}.`}
          </p>
        </div>

        {/* Dynamic Department Selector Dropdown */}
        <div className="flex flex-row items-center gap-2 shrink-0 bg-slate-50 p-2 px-3 rounded-lg border border-slate-200 self-start">
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider shrink-0">
            <Filter className="w-3.5 h-3.5 text-[#C8102E]" />
            <span>Department:</span>
          </div>

          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="flex h-8 w-48 sm:w-60 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-extrabold text-slate-900 shadow-2xs focus:outline-none focus:border-[#C8102E] cursor-pointer"
          >
            <option value="ALL">All Departments ({departments.length})</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>

          <button
            onClick={() => setIsModalOpen(true)}
            className="mmit-btn-primary py-1.5 px-3 text-xs font-bold shadow-2xs shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Timetable</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid (6 Clean Cards) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {metricsList.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.title} className="mmit-card p-4 flex flex-col justify-between hover:border-red-200 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {metric.title}
                </span>
                <div className="p-1.5 rounded-md bg-[#FEF2F2] text-[#C8102E] border border-red-200/80">
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-3">
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                  {loading ? "..." : metric.value}
                </div>
                <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                  {metric.desc}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="mmit-badge-gray text-[10px]">{metric.badge}</span>
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Database Live
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Department Quick Access Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#C8102E]" />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              MMIT Academic Departments ({departments.length})
            </h2>
          </div>
          {selectedDeptId !== "ALL" && (
            <button
              onClick={() => setSelectedDeptId("ALL")}
              className="text-xs font-bold text-[#C8102E] hover:underline flex items-center gap-1 cursor-pointer"
            >
              Reset to All Departments
            </button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {departments.map((dept) => {
            const isSelected = selectedDeptId === dept.id;
            return (
              <div
                key={dept.id}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "bg-[#FEF2F2] border-[#C8102E] shadow-sm"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                }`}
                onClick={() => setSelectedDeptId(dept.id)}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="mmit-badge-red font-mono text-[10px] font-bold">{dept.code}</span>
                    <span className="text-[10px] font-bold text-slate-400">Dept</span>
                  </div>
                  <h3 className="text-xs font-extrabold text-slate-900 line-clamp-2 leading-snug">
                    {dept.name}
                  </h3>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-600">
                  <span className="text-[#C8102E] font-bold flex items-center gap-0.5 hover:underline">
                    Filter →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Charts & Utilization Grid */}
      <div className="grid gap-6 lg:grid-cols-7 items-stretch">

        {/* Department-Aware Workload Distribution Chart */}
        <div className="mmit-card col-span-12 lg:col-span-4 p-6 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#C8102E]" />
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  {isAll ? "College-wide Workload Distribution" : `${selectedDeptObj?.name} Workload`}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Daily Breakdown of Theory Lectures vs. Practical Lab Blocks (Hours)
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#C8102E]" /> Theory
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-slate-900" /> Practical
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={currentWorkloadData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={{ stroke: '#E5E7EB' }} tickLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '0.5rem',
                    borderColor: '#E5E7EB',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Bar dataKey="lectures" name="Theory Lectures" fill="#C8102E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="labs" name="Practical Lab Sessions" fill="#0F172A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Room & Lab Utilization & Timetable Summary */}
        <div className="col-span-12 lg:col-span-3 space-y-6 flex flex-col justify-between">

          {/* Room & Lab Utilization Card */}
          <div className="mmit-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DoorOpen className="w-4 h-4 text-[#C8102E]" />
                <h3 className="text-sm font-bold text-slate-900">Room &amp; Lab Utilization</h3>
              </div>
              <span className="mmit-badge-gray text-[10px]">
                {isAll ? "College Infrastructure" : selectedDeptObj?.code}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-700">Lecture Classrooms ({totalClassrooms})</span>
                  <span className="text-emerald-700">82% Occupied</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-600 h-2 rounded-full" style={{ width: '82%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-700">Practical Laboratories ({totalLabs})</span>
                  <span className="text-[#C8102E]">88% Occupied</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-[#C8102E] h-2 rounded-full" style={{ width: '88%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Timetable Generation Summary Card */}
          <div className="mmit-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#C8102E]" />
                <h3 className="text-sm font-bold text-slate-900">Workload Allocation Summary</h3>
              </div>
              <span className="mmit-badge-emerald text-[10px]">Active</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200/80">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Faculty Count</span>
                <p className="text-base font-black text-emerald-900 mt-0.5">{totalTeachers}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Allocations</span>
                <p className="text-base font-black text-slate-800 mt-0.5">{totalAllocations}</p>
              </div>
            </div>
          </div>

          {/* Quick Module Navigation Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => router.push('/allocations')}
              className="mmit-btn-secondary py-2 px-3 text-xs font-bold justify-between cursor-pointer"
            >
              <span>Workload Master</span>
              <ClipboardList className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => router.push('/teachers')}
              className="mmit-btn-secondary py-2 px-3 text-xs font-bold justify-between cursor-pointer"
            >
              <span>Faculty Roster</span>
              <Users className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      <GenerateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
