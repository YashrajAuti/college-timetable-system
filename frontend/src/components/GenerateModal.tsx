"use client";

import { useState, useEffect } from 'react';
import { Sparkles, Loader2, Plus, Trash2, CheckCircle2, AlertCircle, Calendar, ShieldCheck, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

const generationSteps = [
  "1. Academic Setup",
  "2. Faculty Allocation",
  "3. Workload",
  "4. Resources",
  "5. Constraints",
  "6. Generate",
  "7. Review"
];

const loadingPhases = [
  "Initializing timetable generation engine...",
  "Checking faculty schedule conflicts...",
  "Validating class & division constraints...",
  "Checking classroom & lab availability...",
  "Verifying 2-hour practical lab blocks...",
  "Optimizing workload distribution..."
];

export function GenerateModal({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void;
}) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentLoadingPhase, setCurrentLoadingPhase] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(1);
  
  const [divisions, setDivisions] = useState<any[]>([]);
  const [scopes, setScopes] = useState<{ divisionId: string, batchIds: string[] }[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetch('http://localhost:5000/api/divisions')
        .then(res => res.json())
        .then(data => {
          setDivisions(data);
          const allScopes = data.map((d: any) => ({
            divisionId: d.id,
            batchIds: d.batches ? d.batches.map((b: any) => b.id) : []
          }));
          setScopes(allScopes);
        })
        .catch(err => console.error("Failed to fetch divisions:", err));
      
      setSelectedVariant(1);
      setIsGenerating(false);
    }
  }, [isOpen]);

  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      interval = setInterval(() => {
        setCurrentLoadingPhase((prev) => (prev + 1) % loadingPhases.length);
      }, 1200);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  if (!isOpen) return null;

  const isFormValid = scopes.length > 0 && scopes.every(s => s.divisionId !== '' && s.batchIds.length > 0);

  const handleGenerate = async () => {
    if (!isFormValid) return;

    setIsGenerating(true);
    setCurrentLoadingPhase(0);

    try {
      const payload = {
        variantsToGenerate: selectedVariant,
        scope: {
          divisionIds: scopes.map(s => s.divisionId),
          batchIds: scopes.flatMap(s => s.batchIds)
        }
      };

      const res = await fetch('http://localhost:5000/api/timetables/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        onClose();
        if (window.location.pathname === '/timetables') {
            window.location.reload();
        } else {
            router.push('/timetables');
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error("Generation failed", errorData);
        if (errorData.message === 'Validation failed') {
           alert("Validation Failed:\n" + (errorData.errors || []).join("\n"));
        } else {
           alert("Failed to generate timetable.");
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const addScope = () => {
    setScopes([...scopes, { divisionId: '', batchIds: [] }]);
  };

  const removeScope = (index: number) => {
    setScopes(scopes.filter((_, i) => i !== index));
  };

  const updateScopeDivision = (index: number, divId: string) => {
    const newScopes = [...scopes];
    newScopes[index].divisionId = divId;
    newScopes[index].batchIds = [];
    setScopes(newScopes);
  };

  const toggleBatch = (scopeIndex: number, batchId: string) => {
    const newScopes = [...scopes];
    const currentBatches = newScopes[scopeIndex].batchIds;
    if (currentBatches.includes(batchId)) {
      newScopes[scopeIndex].batchIds = currentBatches.filter(id => id !== batchId);
    } else {
      newScopes[scopeIndex].batchIds = [...currentBatches, batchId];
    }
    setScopes(newScopes);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-3xl w-full border border-slate-200 my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-red-50 text-[#990000] border border-red-200/60">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                MMIT Automated Timetable Generator
              </h2>
              <p className="text-xs text-slate-500">
                Select target class divisions, student batches, and variant evaluation space
              </p>
            </div>
          </div>
          <button onClick={onClose} disabled={isGenerating} className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Generation Multi-step Stepper Progress */}
        <div className="mb-6 p-3 bg-slate-50 border border-slate-200 rounded-md">
          <div className="flex items-center justify-between overflow-x-auto text-[11px] font-semibold text-slate-600 gap-2 pb-1">
            {generationSteps.map((step, idx) => (
              <div key={step} className={`flex items-center gap-1 shrink-0 ${idx === 5 ? 'text-[#990000] font-bold' : ''}`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${idx <= 5 ? 'bg-[#990000] text-white' : 'bg-slate-200 text-slate-600'}`}>
                  {idx + 1}
                </span>
                <span>{step.replace(/^\d+\.\s*/, '')}</span>
                {idx < generationSteps.length - 1 && <span className="text-slate-300">→</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Loading Overlay State */}
        {isGenerating ? (
          <div className="py-16 text-center space-y-4">
            <div className="relative w-16 h-16 mx-auto">
              <Loader2 className="w-16 h-16 text-[#990000] animate-spin" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Generating Academic Timetable...</h3>
              <p className="text-xs font-semibold text-slate-600 animate-pulse">
                {loadingPhases[currentLoadingPhase]}
              </p>
            </div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Checking teacher availability, laboratory capacity, and 2-hour practical block continuity.
            </p>
          </div>
        ) : (
          <>
            {/* Scope Selection */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Target Academic Divisions & Batches
                </h3>
                <button
                  onClick={addScope}
                  className="text-xs font-bold flex items-center gap-1 text-[#990000] hover:bg-red-50 px-2.5 py-1 rounded border border-red-200/60"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Class Scope
                </button>
              </div>

              {scopes.length === 0 ? (
                <div className="p-6 rounded-md border border-dashed border-slate-300 text-center text-xs text-slate-500 bg-slate-50">
                  No classes selected. Click "Add Class Scope" to pick target divisions.
                </div>
              ) : (
                <div className="space-y-3">
                  {scopes.map((scope, index) => {
                    const selectedDivision = divisions.find(d => d.id === scope.divisionId);

                    return (
                      <div key={index} className="p-3.5 rounded-md border border-slate-200 bg-slate-50/50 relative">
                        <button
                          onClick={() => removeScope(index)}
                          className="absolute top-3 right-3 text-slate-400 hover:text-red-600 transition-colors"
                          title="Remove Class"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="mb-3 pr-8">
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Class Division
                          </label>
                          <select
                            value={scope.divisionId}
                            onChange={(e) => updateScopeDivision(index, e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-md px-3 py-1.5 text-xs focus:outline-none focus:border-[#990000]"
                          >
                            <option value="">-- Select Class --</option>
                            {divisions.filter(d => !scopes.some((s, i) => i !== index && s.divisionId === d.id)).map(div => (
                              <option key={div.id} value={div.id}>
                                {div.year?.course?.name.includes('M.E.') ? 'ME-I' : div.year?.year === 2 ? 'SE (Second Year)' : div.year?.year === 3 ? 'TE (Third Year)' : div.year?.year === 4 ? 'BE (Final Year)' : `Year ${div.year?.year}`} - Division {div.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {selectedDivision && (
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              Practical Batches
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedDivision.batches?.length > 0 ? (
                                selectedDivision.batches.map((batch: any) => {
                                  const isSelected = scope.batchIds.includes(batch.id);
                                  return (
                                    <button
                                      key={batch.id}
                                      onClick={() => toggleBatch(index, batch.id)}
                                      className={`px-2.5 py-1 rounded text-xs font-semibold transition-all border cursor-pointer ${
                                        isSelected
                                          ? 'bg-[#990000] text-white border-[#990000]'
                                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                                      }`}
                                    >
                                      Batch {batch.name}
                                    </button>
                                  );
                                })
                              ) : (
                                <span className="text-xs text-slate-400 italic">No batches configured.</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Variant Evaluation Selection */}
            <div className="mb-6 space-y-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Variant Evaluation Space
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 1, title: "1 Variant", badge: "Fastest", desc: "Generates 1 valid schedule instantly." },
                  { id: 3, title: "3 Variants", badge: "Recommended", desc: "Evaluates 3 variants for best workload balance." },
                  { id: 5, title: "5 Variants", badge: "Optimal", desc: "Evaluates 5 variants to find peak efficiency." }
                ].map(variant => (
                  <div
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant.id)}
                    className={`p-3 rounded-md cursor-pointer transition-all border ${
                      selectedVariant === variant.id
                        ? 'border-[#990000] bg-red-50/50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900">{variant.title}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${selectedVariant === variant.id ? 'bg-[#990000] text-white' : 'bg-slate-100 text-slate-600'}`}>
                        {variant.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">{variant.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !isFormValid}
                className="mmit-btn-primary"
              >
                <Sparkles className="w-4 h-4" />
                <span>GENERATE TIMETABLE</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
