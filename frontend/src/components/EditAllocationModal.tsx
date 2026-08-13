"use client";

import { useState, useEffect } from 'react';
import { X, Pencil, Loader2, AlertCircle } from 'lucide-react';

interface EditAllocationModalProps {
  isOpen: boolean;
  allocation: any | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditAllocationModal({ isOpen, allocation, onClose, onSuccess }: EditAllocationModalProps) {
  const [className, setClassName] = useState('SE');
  const [divisionName, setDivisionName] = useState('A');
  const [batchName, setBatchName] = useState('-');
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [theoryHours, setTheoryHours] = useState<number>(0);
  const [practicalHours, setPracticalHours] = useState<number>(0);
  const [tutorialHours, setTutorialHours] = useState<number>(0);
  const [projectHours, setProjectHours] = useState<number>(0);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (allocation) {
      setClassName(allocation.className || 'SE');
      setDivisionName(allocation.divisionName || 'A');
      setBatchName(allocation.batchName || '-');
      setCourseCode(allocation.courseCode || allocation.subject?.code || '');
      setCourseName(allocation.courseName || allocation.subject?.name || '');
      setTheoryHours(allocation.theoryHours || (allocation.type === 'LECTURE' ? allocation.weeklyHours : 0));
      setPracticalHours(allocation.practicalHours || (allocation.type === 'PRACTICAL' ? allocation.weeklyHours : 0));
      setTutorialHours(allocation.tutorialHours || (allocation.type === 'TUTORIAL' ? allocation.weeklyHours : 0));
      setProjectHours(allocation.projectHours || (allocation.type === 'PROJECT' || allocation.type === 'SEMINAR' ? allocation.weeklyHours : 0));
      setErrorMsg('');
    }
  }, [allocation, isOpen]);

  if (!isOpen || !allocation) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (theoryHours < 0 || practicalHours < 0 || tutorialHours < 0 || projectHours < 0) {
      setErrorMsg('Teaching hours cannot be negative.');
      return;
    }

    if (!courseCode.trim() || !courseName.trim()) {
      setErrorMsg('Course Code and Course Name are required.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`http://localhost:5050/api/allocations/${allocation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          className,
          divisionName,
          batchName,
          courseCode: courseCode.trim().toUpperCase(),
          courseName: courseName.trim(),
          theoryHours: Number(theoryHours),
          practicalHours: Number(practicalHours),
          tutorialHours: Number(tutorialHours),
          projectHours: Number(projectHours)
        })
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        const err = await res.json();
        setErrorMsg(err.message || 'Failed to update workload assignment');
      }
    } catch (err: any) {
      setErrorMsg('Network error updating workload assignment');
    }
    setSaving(false);
  };

  const calculatedTotal = Number(theoryHours) + Number(practicalHours) + Number(tutorialHours) + Number(projectHours);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#C8102E] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pencil className="w-5 h-5" />
            <h2 className="text-lg font-bold">Edit Faculty Workload Assignment</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
            <p className="font-bold text-slate-700">Faculty: {allocation.teacher?.name || 'Faculty Member'}</p>
            <p className="text-slate-500 font-mono text-[11px]">Code: {allocation.facultyCode || allocation.teacher?.shortCode || 'FAC'}</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700">Class</label>
              <select
                value={className}
                onChange={e => setClassName(e.target.value)}
                className="w-full mt-1 p-2 text-xs border border-slate-300 rounded-md focus:border-[#C8102E] focus:outline-none"
              >
                <option value="SE">SE</option>
                <option value="TE">TE</option>
                <option value="BE">BE</option>
                <option value="ME-I">ME-I</option>
                <option value="ME-II">ME-II</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700">Division</label>
              <input
                type="text"
                value={divisionName}
                onChange={e => setDivisionName(e.target.value)}
                placeholder="A, B, or A&B"
                className="w-full mt-1 p-2 text-xs border border-slate-300 rounded-md focus:border-[#C8102E] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700">Batch(es)</label>
              <input
                type="text"
                value={batchName}
                onChange={e => setBatchName(e.target.value)}
                placeholder="A1,A2,A3,A4 or -"
                className="w-full mt-1 p-2 text-xs border border-slate-300 rounded-md focus:border-[#C8102E] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700">Course Code</label>
              <input
                type="text"
                value={courseCode}
                onChange={e => setCourseCode(e.target.value)}
                placeholder="e.g. PCC-204-COM"
                className="w-full mt-1 p-2 text-xs border border-slate-300 rounded-md focus:border-[#C8102E] focus:outline-none font-mono"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700">Course Name</label>
              <input
                type="text"
                value={courseName}
                onChange={e => setCourseName(e.target.value)}
                placeholder="e.g. Data Structures Laboratory"
                className="w-full mt-1 p-2 text-xs border border-slate-300 rounded-md focus:border-[#C8102E] focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">Weekly Hours Breakdown</p>
            
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Theory (h)</label>
                <input
                  type="number"
                  min="0"
                  value={theoryHours}
                  onChange={e => setTheoryHours(parseInt(e.target.value) || 0)}
                  className="w-full mt-1 p-1.5 text-center text-xs font-bold border border-slate-300 rounded-md focus:border-[#C8102E] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Practical (h)</label>
                <input
                  type="number"
                  min="0"
                  value={practicalHours}
                  onChange={e => setPracticalHours(parseInt(e.target.value) || 0)}
                  className="w-full mt-1 p-1.5 text-center text-xs font-bold border border-slate-300 rounded-md focus:border-[#C8102E] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Tutorial (h)</label>
                <input
                  type="number"
                  min="0"
                  value={tutorialHours}
                  onChange={e => setTutorialHours(parseInt(e.target.value) || 0)}
                  className="w-full mt-1 p-1.5 text-center text-xs font-bold border border-slate-300 rounded-md focus:border-[#C8102E] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Project (h)</label>
                <input
                  type="number"
                  min="0"
                  value={projectHours}
                  onChange={e => setProjectHours(parseInt(e.target.value) || 0)}
                  className="w-full mt-1 p-1.5 text-center text-xs font-bold border border-slate-300 rounded-md focus:border-[#C8102E] focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600">Calculated Assignment Total:</span>
              <span className="font-black text-sm text-[#C8102E]">{calculatedTotal} hrs/wk</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[#C8102E] text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pencil className="w-3.5 h-3.5" />}
              Save Workload Changes
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
