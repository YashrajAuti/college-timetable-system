"use client";

import { useEffect, useState, useMemo } from "react";
import { apiUrl } from "@/lib/api";
import {
  Plus, Pencil, Trash2, BookOpen, Search, Loader2,
  AlertTriangle, CheckCircle2, Info, FlaskConical,
  GraduationCap, ChevronDown, Filter, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const SEM_LABELS: Record<number, string> = {
  1: "Sem 1 (FE)",
  2: "Sem 2 (FE)",
  3: "Sem 3 (SE)",
  4: "Sem 4 (SE)",
  5: "Sem 5 (TE)",
  6: "Sem 6 (TE)",
  7: "Sem 7 (BE)",
  8: "Sem 8 (BE)",
  9: "ME Sem I",
  10: "ME Sem II",
};

const TYPE_OPTIONS = [
  { value: "ALL",       label: "All Course Types" },
  { value: "THEORY",    label: "Theory Only" },
  { value: "PRACTICAL", label: "Practical / Lab Only" },
  { value: "TUTORIAL",  label: "Tutorial / Seminar" },
];

const BLANK_SUBJECT = {
  id: "", name: "", code: "", semester: "3", credits: "3",
  departmentId: "", labRequired: false,
  lectureHours: "0", practicalHours: "0", tutorialHours: "0",
};

function getCourseTypeLabel(sub: any) {
  const th = sub.lectureHours ?? 0;
  const pr = sub.practicalHours ?? 0;
  const tu = sub.tutorialHours ?? 0;
  if (sub.labRequired && pr > 0 && (th > 0 || tu > 0)) return "Mixed";
  if (sub.labRequired || pr > 0) return "Practical";
  if (tu > 0) return "Tutorial";
  return "Theory";
}

function CourseTypeBadge({ sub }: { sub: any }) {
  const label = getCourseTypeLabel(sub);
  const cls =
    label === "Practical"
      ? "mmit-badge-blue"
      : label === "Mixed"
      ? "bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full"
      : label === "Tutorial"
      ? "bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full"
      : "mmit-badge-gray";
  return <span className={cls}>{label}</span>;
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [audit, setAudit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterDept, setFilterDept] = useState("ALL");
  const [filterSem, setFilterSem] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [currentSubject, setCurrentSubject] = useState({ ...BLANK_SUBJECT });
  const [saveError, setSaveError] = useState("");

  const fetchSubjects = async () => {
    try {
      const params = new URLSearchParams();
      if (filterDept !== "ALL") params.set("departmentId", filterDept);
      if (filterSem !== "ALL") params.set("semester", filterSem);
      if (filterType !== "ALL") params.set("type", filterType);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(apiUrl(`/api/subjects?${params}`));
      if (res.ok) setSubjects(await res.json());
    } catch (err) {
      console.warn("Error fetching subjects:", err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch(apiUrl('/api/departments'));
      if (res.ok) setDepartments(await res.json());
    } catch {}
  };

  const fetchAudit = async () => {
    setAuditLoading(true);
    try {
      const res = await fetch(apiUrl('/api/subjects/audit'));
      if (res.ok) setAudit(await res.json());
    } catch {}
    finally { setAuditLoading(false); }
  };

  useEffect(() => {
    Promise.all([fetchDepartments(), fetchAudit()])
      .then(() => fetchSubjects())
      .finally(() => setLoading(false));
  }, []);

  // Re-fetch subjects whenever filter changes
  useEffect(() => {
    if (!loading) fetchSubjects();
  }, [filterDept, filterSem, filterType]);

  // Debounced search
  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => fetchSubjects(), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Sort client-side: dept → sem → code → name
  const sortedSubjects = useMemo(() => {
    return [...subjects].sort((a, b) => {
      const deptA = a.department?.name ?? "";
      const deptB = b.department?.name ?? "";
      if (deptA !== deptB) return deptA.localeCompare(deptB);
      if (a.semester !== b.semester) return a.semester - b.semester;
      if (a.code !== b.code) return a.code.localeCompare(b.code);
      return a.name.localeCompare(b.name);
    });
  }, [subjects]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete subject "${name}"? This will soft-delete (not permanently remove) the record.`)) return;
    await fetch(apiUrl(`/api/subjects/${id}`), { method: "DELETE" });
    await fetchSubjects();
    await fetchAudit();
  };

  const handleSave = async (isEdit: boolean) => {
    setSaveError("");
    const url = isEdit ? apiUrl(`/api/subjects/${currentSubject.id}`) : apiUrl('/api/subjects');
    const method = isEdit ? "PUT" : "POST";
    const payload = {
      ...currentSubject,
      semester:       parseInt(currentSubject.semester),
      credits:        parseInt(currentSubject.credits),
      lectureHours:   parseInt(currentSubject.lectureHours),
      practicalHours: parseInt(currentSubject.practicalHours),
      tutorialHours:  parseInt(currentSubject.tutorialHours),
    };
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        setSaveError(err.message ?? "Save failed");
        return;
      }
    } catch (err: any) {
      setSaveError(String(err));
      return;
    }
    setIsAddOpen(false);
    setIsEditOpen(false);
    setCurrentSubject({ ...BLANK_SUBJECT });
    await fetchSubjects();
    await fetchAudit();
  };

  const openEdit = (sub: any) => {
    setCurrentSubject({
      id: sub.id,
      name: sub.name,
      code: sub.code,
      semester: String(sub.semester),
      credits: String(sub.credits),
      departmentId: sub.departmentId ?? sub.department?.id ?? "",
      labRequired: sub.labRequired,
      lectureHours:   String(sub.lectureHours ?? 0),
      practicalHours: String(sub.practicalHours ?? 0),
      tutorialHours:  String(sub.tutorialHours ?? 0),
    });
    setSaveError("");
    setIsEditOpen(true);
  };

  const uniqueSemesters = useMemo(() => {
    const s = new Set(subjects.map(s => s.semester));
    return [...s].sort((a, b) => a - b);
  }, [subjects]);

  const compDeptId = departments.find(d => d.code === "COMP" || d.name?.includes("Computer Engineering"))?.id ?? "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="mmit-badge-red">MMIT Curriculum</span>
            <span className="text-xs font-semibold text-slate-500">Course Syllabus Directory</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Subject Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Canonical course catalogue — sorted by Department → Semester → Course Code.
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={v => { setIsAddOpen(v); if (!v) setSaveError(""); }}>
          <DialogTrigger asChild>
            <button
              className="mmit-btn-primary self-start sm:self-auto cursor-pointer"
              onClick={() => { setCurrentSubject({ ...BLANK_SUBJECT, departmentId: compDeptId }); setSaveError(""); setIsAddOpen(true); }}
            >
              <Plus className="w-4 h-4" /> Add New Subject
            </button>
          </DialogTrigger>
          <SubjectFormDialog
            title="Add New Subject"
            subject={currentSubject}
            departments={departments}
            error={saveError}
            onChange={v => setCurrentSubject(v)}
            onSave={() => handleSave(false)}
            onCancel={() => setIsAddOpen(false)}
          />
        </Dialog>
      </div>

      {/* Audit Summary Panel */}
      {audit && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <AuditCard label="Total Subjects" value={audit.summary.totalSubjectRecords} color="slate" />
          <AuditCard label="Valid (Canonical)" value={audit.summary.validSubjectRecords} color="emerald" />
          <AuditCard label="Legacy / Duplicate" value={audit.summary.legacyDuplicateRecords} color="amber" />
          <AuditCard label="Assignments Linked" value={audit.summary.facultyAssignmentsWithSubjectMapping} color="blue" />
          <AuditCard label="Unlinked Assignments" value={audit.summary.facultyAssignmentsWithoutSubjectMapping} color="red" />
          <AuditCard label="Codes w/ No Subject" value={audit.summary.assignmentCodesWithNoSubjectRecord} color={audit.summary.assignmentCodesWithNoSubjectRecord > 0 ? "red" : "emerald"} />
        </div>
      )}

      {/* Legacy Records Info */}
      {audit?.legacyRecords?.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-900">
                {audit.legacyRecords.length} Legacy / Duplicate Subject Records Detected
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                These records have short-code aliases (e.g. DS, AI, ML) or near-duplicate codes that shadow a canonical code.
                They are flagged <span className="font-bold">LEGACY</span> below. Review before deleting.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {audit.legacyRecords.map((r: any) => (
                  <span key={r.id} className="inline-flex items-center gap-1 text-[10px] bg-amber-100 border border-amber-300 text-amber-900 px-2 py-0.5 rounded-full font-mono font-bold">
                    {r.code} → {r.canonicalCode}
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={fetchAudit}
              className="p-1.5 hover:bg-amber-100 rounded-lg text-amber-700 cursor-pointer"
              title="Refresh audit"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${auditLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      )}

      {/* All linked confirmation */}
      {audit?.summary?.facultyAssignmentsWithoutSubjectMapping === 0 && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-sm text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">100% Subject Mapping — All {audit.summary.facultyAssignmentsWithSubjectMapping} faculty assignments have a valid Subject record linked.</span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />

            {/* Search */}
            <div className="relative w-full sm:w-60">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search code or name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#C8102E]"
              />
            </div>

            {/* Department filter */}
            <select
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
              className="h-9 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#C8102E]"
            >
              <option value="ALL">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            {/* Semester filter */}
            <select
              value={filterSem}
              onChange={e => setFilterSem(e.target.value)}
              className="h-9 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#C8102E]"
            >
              <option value="ALL">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(sem => (
                <option key={sem} value={sem}>Sem {sem}{SEM_LABELS[sem] ? ` — ${SEM_LABELS[sem]}` : ""}</option>
              ))}
            </select>

            {/* Type filter */}
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="h-9 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#C8102E]"
            >
              {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <span className="text-xs text-slate-500 font-bold whitespace-nowrap">
            Showing {sortedSubjects.length} of {subjects.length} Subjects
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="mmit-table">
            <thead>
              <tr>
                <th className="w-10 text-center">#</th>
                <th>Course Code</th>
                <th>Course Name</th>
                <th>Semester</th>
                <th className="text-center">Th</th>
                <th className="text-center">Pr</th>
                <th className="text-center">Tu</th>
                <th className="text-center">Credits</th>
                <th>Type</th>
                <th>Department</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#C8102E]" />
                    Loading subject catalogue...
                  </td>
                </tr>
              ) : sortedSubjects.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-slate-400 text-sm">
                    No subjects match the selected filters.
                  </td>
                </tr>
              ) : sortedSubjects.map((sub, index) => {
                const isLegacy = sub.isLegacy;
                return (
                  <tr
                    key={sub.id}
                    className={isLegacy ? "bg-amber-50/60 hover:bg-amber-50" : ""}
                  >
                    <td className="text-center font-semibold text-slate-400 text-xs">{index + 1}</td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <span className="mmit-badge-red font-mono font-bold text-[10px]">{sub.code}</span>
                        {isLegacy && (
                          <span className="text-[9px] bg-amber-100 border border-amber-300 text-amber-800 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                            LEGACY
                          </span>
                        )}
                      </div>
                      {isLegacy && sub.canonicalCode && (
                        <p className="text-[9px] text-amber-600 mt-0.5">→ canonical: {sub.canonicalCode}</p>
                      )}
                    </td>
                    <td>
                      <p className="font-bold text-slate-900 text-sm">{sub.name}</p>
                    </td>
                    <td>
                      <span className="text-xs font-semibold text-slate-600">
                        {SEM_LABELS[sub.semester] ?? `Sem ${sub.semester}`}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className={`text-xs font-bold ${(sub.lectureHours ?? 0) > 0 ? "text-slate-800" : "text-slate-300"}`}>
                        {sub.lectureHours ?? 0}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className={`text-xs font-bold ${(sub.practicalHours ?? 0) > 0 ? "text-blue-700" : "text-slate-300"}`}>
                        {sub.practicalHours ?? 0}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className={`text-xs font-bold ${(sub.tutorialHours ?? 0) > 0 ? "text-amber-700" : "text-slate-300"}`}>
                        {sub.tutorialHours ?? 0}
                      </span>
                    </td>
                    <td className="text-center font-semibold text-slate-700 text-xs">{sub.credits}</td>
                    <td><CourseTypeBadge sub={sub} /></td>
                    <td className="text-xs text-slate-500">{sub.department?.name ?? "—"}</td>
                    <td className="text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => openEdit(sub)}
                        className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(sub.id, sub.name)}
                        className="p-1.5 rounded-md hover:bg-red-50 text-slate-600 hover:text-red-600 transition-colors cursor-pointer"
                        title="Delete (soft)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {sortedSubjects.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-slate-400 text-xs">
                    No subjects found matching the selected semester/department filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={v => { setIsEditOpen(v); if (!v) setSaveError(""); }}>
        <SubjectFormDialog
          title="Edit Subject"
          subject={currentSubject}
          departments={departments}
          error={saveError}
          onChange={v => setCurrentSubject(v)}
          onSave={() => handleSave(true)}
          onCancel={() => setIsEditOpen(false)}
        />
      </Dialog>
    </div>
  );
}

/* ── Audit Card ─────────────────────────────────────────────── */
function AuditCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    slate:   "bg-slate-50 border-slate-200 text-slate-900",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-800",
    amber:   "bg-amber-50 border-amber-200 text-amber-800",
    blue:    "bg-blue-50 border-blue-200 text-blue-800",
    red:     value > 0 ? "bg-red-50 border-red-200 text-red-800" : "bg-emerald-50 border-emerald-200 text-emerald-800",
  };
  return (
    <div className={`p-3 rounded-xl border ${colorMap[color] ?? colorMap.slate}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">{label}</p>
      <p className="text-2xl font-black mt-1">{value}</p>
    </div>
  );
}

/* ── Subject Form Dialog ─────────────────────────────────────── */
function SubjectFormDialog({
  title, subject, departments, error, onChange, onSave, onCancel
}: {
  title: string;
  subject: any;
  departments: any[];
  error: string;
  onChange: (s: any) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const f = (field: string, value: any) => onChange({ ...subject, [field]: value });

  return (
    <DialogContent className="sm:max-w-lg bg-white border border-slate-200">
      <DialogHeader>
        <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[#C8102E]" /> {title}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-2">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Course Name *</label>
            <Input placeholder="e.g. Data Structures" value={subject.name} onChange={e => f("name", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Course Code *</label>
            <Input placeholder="e.g. PCC-201-COMP" value={subject.code} onChange={e => f("code", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Credits</label>
            <Input type="number" min="0" value={subject.credits} onChange={e => f("credits", e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Semester</label>
            <select
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#C8102E]"
              value={subject.semester}
              onChange={e => f("semester", e.target.value)}
            >
              {[3, 4, 5, 6, 7, 8, 9, 10].map(s => <option key={s} value={s}>Sem {s}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Department *</label>
            <select
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#C8102E]"
              value={subject.departmentId}
              onChange={e => f("departmentId", e.target.value)}
            >
              <option value="">— Select —</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Weekly Contact Hours</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Lecture (Th)</label>
              <Input type="number" min="0" value={subject.lectureHours} onChange={e => f("lectureHours", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Practical (Pr)</label>
              <Input type="number" min="0" value={subject.practicalHours} onChange={e => f("practicalHours", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Tutorial (Tu)</label>
              <Input type="number" min="0" value={subject.tutorialHours} onChange={e => f("tutorialHours", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="labCheck"
            checked={subject.labRequired}
            onChange={e => f("labRequired", e.target.checked)}
            className="rounded text-[#C8102E] focus:ring-[#C8102E]"
          />
          <label htmlFor="labCheck" className="text-xs font-medium text-slate-700">Requires Practical / Lab Session</label>
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <button className="mmit-btn-primary cursor-pointer" onClick={onSave}>Save Subject</button>
        </div>
      </div>
    </DialogContent>
  );
}
