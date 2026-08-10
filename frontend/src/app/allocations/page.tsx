"use client";

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, ClipboardList, Search, Loader2 } from 'lucide-react';
import { AddAllocationModal } from '@/components/AddAllocationModal';

export default function AllocationsPage() {
  const [allocations, setAllocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<any>(null);

  const fetchAllocations = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/allocations');
      const data = await res.json();
      if (Array.isArray(data)) setAllocations(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAllocations();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this teaching allocation?')) return;
    try {
      await fetch(`http://localhost:5000/api/allocations/${id}`, { method: 'DELETE' });
      fetchAllocations();
    } catch (err) {
      console.error(err);
    }
  };

  const openAddModal = () => {
    setEditingAllocation(null);
    setIsModalOpen(true);
  };

  const openEditModal = (alloc: any) => {
    setEditingAllocation(alloc);
    setIsModalOpen(true);
  };

  const filteredAllocations = allocations.filter(a =>
    (a.teacher?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.subject?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.division?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="mmit-badge-red">MMIT Master Configuration</span>
            <span className="text-xs font-semibold text-slate-500">Teaching Assignments</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Faculty Teaching Allocations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage subject assignments, lecture hours, and lab batch allocations per faculty member.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="mmit-btn-primary self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Teaching Allocation
        </button>
      </div>

      {/* Main Table Card */}
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
            Showing {filteredAllocations.length} of {allocations.length} Allocations
          </span>
        </div>

        <table className="mmit-table">
          <thead>
            <tr>
              <th>Sr No</th>
              <th>Faculty Member</th>
              <th>Course Subject</th>
              <th>Class / Division</th>
              <th>Session Type</th>
              <th>Student Batch</th>
              <th>Weekly Load</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#990000]" />
                  Loading teaching allocations...
                </td>
              </tr>
            ) : filteredAllocations.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-500">
                  <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  No allocations found.
                </td>
              </tr>
            ) : filteredAllocations.map((a, i) => (
              <tr key={a.id}>
                <td className="font-semibold text-slate-500">{i + 1}</td>
                <td className="font-bold text-slate-900">{a.teacher?.name}</td>
                <td>
                  <div className="flex items-center gap-1.5">
                    <span className="mmit-badge-red font-mono text-[10px]">{a.subject?.code}</span>
                    <span className="font-semibold text-slate-800">{a.subject?.name}</span>
                  </div>
                </td>
                <td>
                  <span className="mmit-badge-blue">{a.division?.name}</span>
                </td>
                <td>
                  {a.type === 'LECTURE' ? (
                    <span className="mmit-badge-red">Theory (Lecture)</span>
                  ) : (
                    <span className="mmit-badge-amber">Practical (Lab)</span>
                  )}
                </td>
                <td>
                  {a.batch?.name ? (
                    <span className="mmit-badge-gray font-bold">Batch {a.batch.name}</span>
                  ) : (
                    <span className="text-slate-400 text-xs">All Batches</span>
                  )}
                </td>
                <td className="font-bold text-slate-900">{a.weeklyHours} hrs/wk</td>
                <td className="text-right space-x-1">
                  <button
                    onClick={() => openEditModal(a)}
                    className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-blue-600 transition-colors"
                    title="Edit Allocation"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="p-1.5 rounded-md hover:bg-red-50 text-slate-600 hover:text-red-600 transition-colors"
                    title="Delete Allocation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AddAllocationModal
        isOpen={isModalOpen}
        allocationToEdit={editingAllocation}
        onClose={() => {
            setIsModalOpen(false);
            setEditingAllocation(null);
            fetchAllocations();
        }}
      />
    </div>
  );
}
