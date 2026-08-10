"use client";

import { useState, useEffect } from 'react';
import { ClipboardList, CheckCircle2, AlertCircle, X, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AddAllocationModal({ isOpen, onClose, allocationToEdit }: { isOpen: boolean; onClose: () => void; allocationToEdit?: any }) {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [masterMappings, setMasterMappings] = useState<any[]>([]);
  
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedDiv, setSelectedDiv] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedType, setSelectedType] = useState('LECTURE');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [weeklyHours, setWeeklyHours] = useState(1);

  useEffect(() => {
    if (isOpen) {
      fetch('http://localhost:5000/api/teachers').then(r => r.json()).then(setTeachers);

      if (allocationToEdit) {
          setSelectedTeacher(allocationToEdit.teacherId || '');
          setSelectedDiv(allocationToEdit.divisionId || '');
          setSelectedSubject(allocationToEdit.subjectId || '');
          setSelectedType(allocationToEdit.type || 'LECTURE');
          setSelectedBatch(allocationToEdit.batchId || '');
          setWeeklyHours(allocationToEdit.weeklyHours || 1);
      } else {
          setSelectedTeacher('');
          setSelectedYear('');
          setSelectedDiv('');
          setSelectedSubject('');
          setSelectedType('LECTURE');
          setSelectedBatch('');
          setWeeklyHours(1);
          setMasterMappings([]);
      }
    }
  }, [isOpen, allocationToEdit]);

  // Dependent fetch for master subjects allocated to teacher
  useEffect(() => {
    if (selectedTeacher) {
       fetch(`http://localhost:5000/api/master-subjects?teacherId=${selectedTeacher}`)
         .then(r => r.json())
         .then(data => {
            setMasterMappings(data);
            if (allocationToEdit && data.length > 0) {
               const map = data.find((d:any) => d.divisionId === allocationToEdit.divisionId);
               if (map) setSelectedYear(map.division.yearId);
            } else {
               setSelectedYear('');
               setSelectedDiv('');
               setSelectedSubject('');
            }
         });
    }
  }, [selectedTeacher]);

  const availableYears = Array.from(new Set(masterMappings.map(m => m.division.yearId))).map(id => {
      const m = masterMappings.find(x => x.division.yearId === id);
      return m.division.year;
  });

  const availableDivisions = Array.from(new Set(masterMappings.filter(m => m.division.yearId === selectedYear).map(m => m.divisionId))).map(id => {
      return masterMappings.find(x => x.divisionId === id).division;
  });

  const availableSubjects = masterMappings.filter(m => m.divisionId === selectedDiv).map(m => m.subject);

  if (!isOpen) return null;

  const currentDiv = availableDivisions.find((d: any) => d.id === selectedDiv);
  const currentSubject = availableSubjects.find((s: any) => s.id === selectedSubject);

  const handleSubmit = async () => {
     try {
        const payload = {
            teacherId: selectedTeacher,
            divisionId: selectedDiv,
            subjectId: selectedSubject,
            type: selectedType,
            batchId: selectedBatch || null,
            weeklyHours: Number(weeklyHours)
        };
        const method = allocationToEdit ? 'PUT' : 'POST';
        const url = allocationToEdit 
            ? `http://localhost:5000/api/allocations/${allocationToEdit.id}`
            : `http://localhost:5000/api/allocations`;
            
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            onClose();
        } else {
            alert('Failed to save allocation');
        }
     } catch (e) {
         console.error(e);
     }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-xl w-full border border-slate-200 my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-red-50 text-[#990000] border border-red-200/60">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {allocationToEdit ? 'Edit Faculty Teaching Allocation' : 'Add Faculty Teaching Allocation'}
              </h2>
              <p className="text-xs text-slate-500">
                Assign faculty member to specific division, course subject & session type
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Select Faculty */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              1. Select Faculty Member
            </label>
            <select
              value={selectedTeacher}
              onChange={e => setSelectedTeacher(e.target.value)}
              className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm bg-white focus:outline-none focus:border-[#990000]"
            >
              <option value="">-- Choose Faculty --</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.name} ({t.employeeId.replace('EMP-', '')})</option>)}
            </select>
          </div>

          {/* Step 2: Dependent Year & Division */}
          {selectedTeacher && (
            <>
              {masterMappings.length === 0 ? (
                <div className="p-3.5 bg-amber-50 text-amber-800 rounded-md border border-amber-200 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <span className="font-bold">Notice:</span> No subjects are assigned to this faculty member in the master mapping database. Please configure <strong>Workload Master Data</strong> first.
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      2. Select Year
                    </label>
                    <select
                      value={selectedYear}
                      onChange={e => { setSelectedYear(e.target.value); setSelectedDiv(''); setSelectedSubject(''); }}
                      className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm bg-white focus:outline-none focus:border-[#990000]"
                    >
                      <option value="">-- Choose Year --</option>
                      {availableYears.map((y: any) => <option key={y.id} value={y.id}>Year {y.year}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      3. Select Division
                    </label>
                    <select
                      value={selectedDiv}
                      onChange={e => { setSelectedDiv(e.target.value); setSelectedSubject(''); setSelectedBatch(''); }}
                      className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm bg-white focus:outline-none focus:border-[#990000] disabled:bg-slate-50"
                      disabled={!selectedYear}
                    >
                      <option value="">-- Choose Division --</option>
                      {availableDivisions.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Step 3: Dependent Subject Dropdown */}
          {selectedDiv && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                4. Select Filtered Subject
              </label>
              <select
                value={selectedSubject}
                onChange={e => setSelectedSubject(e.target.value)}
                className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm bg-white focus:outline-none focus:border-[#990000]"
              >
                <option value="">-- Choose Assigned Subject --</option>
                {availableSubjects.map((s: any) => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
              </select>
              {availableSubjects.length === 0 && (
                <p className="text-red-600 text-xs font-medium mt-1">
                  No subjects are currently mapped to this faculty for Division {currentDiv?.name}.
                </p>
              )}
            </div>
          )}

          {/* Step 4: Session Type & Weekly Hours */}
          {selectedSubject && currentSubject && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  5. Session Type
                </label>
                <select
                  value={selectedType}
                  onChange={e => {
                    const t = e.target.value;
                    setSelectedType(t);
                    if (t === 'LECTURE') setWeeklyHours(currentSubject.lectureHours || 1);
                    else if (t === 'PRACTICAL') setWeeklyHours(currentSubject.practicalHours || 2);
                    else if (t === 'TUTORIAL') setWeeklyHours(currentSubject.tutorialHours || 1);
                  }}
                  className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm bg-white focus:outline-none focus:border-[#990000]"
                >
                  {currentSubject.lectureHours > 0 && <option value="LECTURE">Theory (1 Hour Lecture)</option>}
                  {currentSubject.practicalHours > 0 && <option value="PRACTICAL">Practical (2 Hour Lab Block)</option>}
                  {currentSubject.tutorialHours > 0 && <option value="TUTORIAL">Tutorial (1 Hour Block)</option>}
                  <option value="SEMINAR">Seminar</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Weekly Duration
                </label>
                <input
                  type="number"
                  value={weeklyHours}
                  readOnly
                  className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm bg-slate-50 font-bold text-slate-700 cursor-not-allowed"
                />
              </div>
            </div>
          )}

          {/* Batch Selection for Practical */}
          {selectedType === 'PRACTICAL' && currentDiv && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                6. Select Student Batch
              </label>
              <select
                value={selectedBatch}
                onChange={e => setSelectedBatch(e.target.value)}
                className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm bg-white focus:outline-none focus:border-[#990000]"
              >
                <option value="">-- Choose Batch --</option>
                {currentDiv.batches?.map((b: any) => <option key={b.id} value={b.id}>Batch {b.name}</option>)}
              </select>
            </div>
          )}

          {/* Auto-Assigned Location Banner */}
          {selectedSubject && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Predefined Room Location:</span>
              <span className="mmit-badge-emerald flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> AUTO-ASSIGNED
              </span>
            </div>
          )}
        </div>

        {/* Footer Action Buttons */}
        <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <button
            onClick={handleSubmit}
            disabled={!selectedTeacher || !selectedDiv || !selectedSubject || (selectedType === 'PRACTICAL' && !selectedBatch)}
            className="mmit-btn-primary"
          >
            Save Allocation
          </button>
        </div>
      </div>
    </div>
  );
}
