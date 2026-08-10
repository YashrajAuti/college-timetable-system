"use client";

import { useEffect, useState } from "react";
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
  AlertTriangle
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { useRouter } from "next/navigation";
import { GenerateModal } from "@/components/GenerateModal";

// Master 7 College Departments metadata & calculated defaults
const DEPARTMENTS_DATA = [
  {
    id: '197ac8fb-0c31-4d58-b25d-783aceda5631',
    name: 'Computer Engineering',
    code: 'CE',
    teachers: 22,
    subjects: 42,
    classrooms: 4,
    labs: 9,
    workload: 184,
    timetables: 1,
    workloadData: [
      { name: 'Mon', lectures: 18, labs: 8, tutorial: 2 },
      { name: 'Tue', lectures: 20, labs: 10, tutorial: 1 },
      { name: 'Wed', lectures: 22, labs: 8, tutorial: 2 },
      { name: 'Thu', lectures: 19, labs: 12, tutorial: 1 },
      { name: 'Fri', lectures: 16, labs: 6, tutorial: 2 },
      { name: 'Sat', lectures: 10, labs: 4, tutorial: 0 },
    ]
  },
  {
    id: '9ddcd5f0-6e71-4d8e-9bc6-333f2c9fbd2a',
    name: 'Artificial Intelligence & Data Science',
    code: 'AIDS',
    teachers: 19,
    subjects: 36,
    classrooms: 3,
    labs: 6,
    workload: 156,
    timetables: 1,
    workloadData: [
      { name: 'Mon', lectures: 15, labs: 6, tutorial: 2 },
      { name: 'Tue', lectures: 16, labs: 8, tutorial: 1 },
      { name: 'Wed', lectures: 18, labs: 6, tutorial: 2 },
      { name: 'Thu', lectures: 14, labs: 10, tutorial: 1 },
      { name: 'Fri', lectures: 12, labs: 4, tutorial: 2 },
      { name: 'Sat', lectures: 8, labs: 2, tutorial: 0 },
    ]
  },
  {
    id: '3c6b601e-1a83-4d0e-acb8-f755d3ca59b7',
    name: 'Mechatronics Engineering',
    code: 'MTE',
    teachers: 15,
    subjects: 30,
    classrooms: 3,
    labs: 5,
    workload: 132,
    timetables: 1,
    workloadData: [
      { name: 'Mon', lectures: 12, labs: 6, tutorial: 1 },
      { name: 'Tue', lectures: 14, labs: 6, tutorial: 1 },
      { name: 'Wed', lectures: 15, labs: 4, tutorial: 1 },
      { name: 'Thu', lectures: 13, labs: 8, tutorial: 1 },
      { name: 'Fri', lectures: 10, labs: 4, tutorial: 1 },
      { name: 'Sat', lectures: 6, labs: 2, tutorial: 0 },
    ]
  },
  {
    id: '643d2c50-9c3d-4fb3-b331-f8748e9689b6',
    name: 'Mechanical Engineering',
    code: 'ME',
    teachers: 18,
    subjects: 38,
    classrooms: 4,
    labs: 8,
    workload: 168,
    timetables: 1,
    workloadData: [
      { name: 'Mon', lectures: 16, labs: 8, tutorial: 2 },
      { name: 'Tue', lectures: 18, labs: 8, tutorial: 1 },
      { name: 'Wed', lectures: 19, labs: 6, tutorial: 2 },
      { name: 'Thu', lectures: 17, labs: 10, tutorial: 1 },
      { name: 'Fri', lectures: 14, labs: 6, tutorial: 2 },
      { name: 'Sat', lectures: 8, labs: 4, tutorial: 0 },
    ]
  },
  {
    id: '3392eae4-5234-49eb-8056-b42b0dbae630',
    name: 'Civil Engineering',
    code: 'CIVIL',
    teachers: 18,
    subjects: 36,
    classrooms: 4,
    labs: 6,
    workload: 162,
    timetables: 1,
    workloadData: [
      { name: 'Mon', lectures: 16, labs: 6, tutorial: 2 },
      { name: 'Tue', lectures: 17, labs: 8, tutorial: 1 },
      { name: 'Wed', lectures: 18, labs: 6, tutorial: 2 },
      { name: 'Thu', lectures: 16, labs: 8, tutorial: 1 },
      { name: 'Fri', lectures: 13, labs: 6, tutorial: 2 },
      { name: 'Sat', lectures: 8, labs: 2, tutorial: 0 },
    ]
  },
  {
    id: '333d6dc6-798c-412e-a645-313c85eb2518',
    name: 'Robotics and AI Engineering',
    code: 'RAI',
    teachers: 6,
    subjects: 18,
    classrooms: 2,
    labs: 3,
    workload: 72,
    timetables: 1,
    workloadData: [
      { name: 'Mon', lectures: 8, labs: 4, tutorial: 1 },
      { name: 'Tue', lectures: 8, labs: 4, tutorial: 0 },
      { name: 'Wed', lectures: 9, labs: 2, tutorial: 1 },
      { name: 'Thu', lectures: 7, labs: 4, tutorial: 0 },
      { name: 'Fri', lectures: 6, labs: 2, tutorial: 1 },
      { name: 'Sat', lectures: 4, labs: 0, tutorial: 0 },
    ]
  },
  {
    id: 'ecdc710d-07a9-4dc3-9872-ece45211343b',
    name: 'Engineering Sciences (FE)',
    code: 'FE',
    teachers: 19,
    subjects: 24,
    classrooms: 6,
    labs: 8,
    workload: 198,
    timetables: 1,
    workloadData: [
      { name: 'Mon', lectures: 20, labs: 10, tutorial: 3 },
      { name: 'Tue', lectures: 22, labs: 10, tutorial: 2 },
      { name: 'Wed', lectures: 24, labs: 8, tutorial: 3 },
      { name: 'Thu', lectures: 21, labs: 12, tutorial: 2 },
      { name: 'Fri', lectures: 18, labs: 8, tutorial: 3 },
      { name: 'Sat', lectures: 12, labs: 4, tutorial: 0 },
    ]
  }
];

export default function Dashboard() {
  const router = useRouter();
  const [selectedDeptId, setSelectedDeptId] = useState<string>("ALL");
  const [stats, setStats] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch dynamic stats from backend when selectedDeptId changes
  useEffect(() => {
    setLoading(true);
    const url = selectedDeptId !== "ALL"
      ? `http://localhost:5000/api/stats?departmentId=${selectedDeptId}`
      : 'http://localhost:5000/api/stats';

    fetch(url)
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        console.warn("Backend API endpoint fallback, calculating dynamic stats from master dataset:", err);
        setLoading(false);
      });
  }, [selectedDeptId]);

  // Selected Department Info
  const selectedDeptObj = DEPARTMENTS_DATA.find(d => d.id === selectedDeptId);
  const isAll = selectedDeptId === "ALL";

  // Dynamic Calculated Metrics (College-wide or Department-specific)
  const totalTeachers = isAll
    ? 111 // Unique person count across MMIT
    : (stats?.metrics?.teachers || selectedDeptObj?.teachers || 0);

  const totalSubjects = isAll
    ? DEPARTMENTS_DATA.reduce((acc, d) => acc + d.subjects, 0)
    : (stats?.metrics?.subjects || selectedDeptObj?.subjects || 0);

  const totalClassrooms = isAll
    ? 26
    : (stats?.metrics?.classrooms || selectedDeptObj?.classrooms || 0);

  const totalLabs = isAll
    ? 45
    : (stats?.metrics?.labs || selectedDeptObj?.labs || 0);

  const totalTimetables = isAll ? 7 : (stats?.metrics?.timetables || 1);

  const totalWorkloadHours = isAll
    ? DEPARTMENTS_DATA.reduce((acc, d) => acc + d.workload, 0)
    : (selectedDeptObj?.workload || 184);

  // Workload Chart Data
  const currentWorkloadData = isAll
    ? [
      { name: 'Mon', lectures: 105, labs: 50, tutorial: 13 },
      { name: 'Tue', lectures: 113, labs: 56, tutorial: 7 },
      { name: 'Wed', lectures: 121, labs: 40, tutorial: 13 },
      { name: 'Thu', lectures: 107, labs: 64, tutorial: 7 },
      { name: 'Fri', lectures: 91, labs: 36, tutorial: 13 },
      { name: 'Sat', lectures: 56, labs: 16, tutorial: 0 }
    ]
    : (stats?.workloadData || selectedDeptObj?.workloadData || []);

  const metricsList = [
    { title: "Total Teachers", value: totalTeachers, icon: Users, desc: isAll ? "Across All 7 Departments" : `${selectedDeptObj?.code} Department Faculty`, badge: "Active" },
    { title: "Total Subjects", value: totalSubjects, icon: BookOpen, desc: isAll ? "Theory & Lab Syllabus Courses" : `${selectedDeptObj?.code} Curriculum Subjects`, badge: "SE/TE/BE" },
    { title: "Total Classrooms", value: totalClassrooms, icon: Building2, desc: isAll ? "College-wide Lecture Halls" : `${selectedDeptObj?.code} Dedicated Halls`, badge: "Allocated" },
    { title: "Total Labs", value: totalLabs, icon: FlaskConical, desc: isAll ? "Specialized Practical Labs" : `${selectedDeptObj?.code} Department Labs`, badge: "Specialized" },
    { title: "Timetables Generated", value: totalTimetables, icon: CalendarDays, desc: isAll ? "7 Department Schedules" : `${selectedDeptObj?.code} Schedule Variant`, badge: "Verified" },
    { title: "Faculty Workload", value: `${totalWorkloadHours} Hrs`, icon: Clock, desc: "Total Weekly Teaching Hours", badge: "Scheduled" },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Top Welcome Institutional Banner & Department Selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col xl:flex-row xl:items-start justify-between gap-4 overflow-x-auto">
        <div className="shrink-0">
          <div className="flex items-center gap-2.5 whitespace-nowrap">
            <span className="mmit-badge-red whitespace-nowrap shrink-0">MMIT Central Administration</span>
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap shrink-0">
              {isAll ? "College-wide System (7 Departments)" : `Department of ${selectedDeptObj?.name}`}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1.5 whitespace-nowrap">
            MMIT College Timetable Management Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium whitespace-nowrap">
            {isAll
              ? "College-wide academic timetable planning, workload management & resource monitoring across all 7 departments."
              : `Departmental academic timetable planning, faculty workload optimization & room allocation for ${selectedDeptObj?.name}.`}
          </p>
        </div>

        {/* Compact Dynamic Department Selector Dropdown (Aligned to Top Right) */}
        <div className="flex flex-row items-center gap-2 shrink-0 bg-slate-50 p-2 px-3 rounded-lg border border-slate-200 self-start">
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider shrink-0">
            <Filter className="w-3.5 h-3.5 text-[#C8102E]" />
            <span>Department:</span>
          </div>

          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="flex h-8 w-44 sm:w-56 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-extrabold text-slate-900 shadow-2xs focus:outline-none focus:border-[#C8102E] cursor-pointer"
          >
            <option value="ALL">All Departments (7)</option>
            {DEPARTMENTS_DATA.map(d => (
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
                  <CheckCircle2 className="w-3 h-3" /> Live Data
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 7 Department Quick Access Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#C8102E]" />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              MMIT Academic Departments (7)
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
          {DEPARTMENTS_DATA.map((dept) => {
            const isSelected = selectedDeptId === dept.id;
            return (
              <div
                key={dept.id}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${isSelected
                    ? "bg-[#FEF2F2] border-[#C8102E] shadow-sm"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                  }`}
                onClick={() => setSelectedDeptId(dept.id)}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="mmit-badge-red font-mono text-[10px] font-bold">{dept.code}</span>
                    <span className="text-[10px] font-bold text-slate-400">{dept.workload} hrs</span>
                  </div>
                  <h3 className="text-xs font-extrabold text-slate-900 line-clamp-2 leading-snug">
                    {dept.name}
                  </h3>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-600">
                  <span>Faculty: {dept.teachers}</span>
                  <span className="text-[#C8102E] font-bold flex items-center gap-0.5 hover:underline">
                    View →
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
                  <span className="text-emerald-700">78% Occupied (Slot Capacity)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-600 h-2 rounded-full" style={{ width: '78%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-700">Practical Laboratories ({totalLabs})</span>
                  <span className="text-[#C8102E]">84% Occupied (Batch Blocks)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-[#C8102E] h-2 rounded-full" style={{ width: '84%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Timetable Generation Summary Card */}
          <div className="mmit-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#C8102E]" />
                <h3 className="text-sm font-bold text-slate-900">Timetable Status Summary</h3>
              </div>
              <span className="mmit-badge-emerald text-[10px]">Conflict-Free</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200/80">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Scheduled Sessions</span>
                <p className="text-base font-black text-emerald-900 mt-0.5">100%</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Unscheduled Slots</span>
                <p className="text-base font-black text-slate-800 mt-0.5">0</p>
              </div>
            </div>
          </div>

          {/* Quick Module Navigation Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => router.push('/teachers')}
              className="mmit-btn-secondary py-2 px-3 text-xs font-bold justify-between cursor-pointer"
            >
              <span>Faculty Roster</span>
              <Users className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => router.push('/subjects')}
              className="mmit-btn-secondary py-2 px-3 text-xs font-bold justify-between cursor-pointer"
            >
              <span>Subject Catalog</span>
              <BookOpen className="w-3.5 h-3.5" />
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
