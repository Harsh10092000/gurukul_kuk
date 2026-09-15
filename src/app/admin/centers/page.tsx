'use client';

import React, { useState, useEffect } from 'react';
import {
  Building,
  MapPin,
  Users,
  Phone,
  Plus,
  CheckCircle,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Save,
  Loader2,
} from 'lucide-react';
import { ExamCentre } from '@/lib/types';
import ConfirmModal from '@/components/ConfirmModal';

export default function AdminCentersPage() {
  const [centres, setCentres] = useState<ExamCentre[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; name: string }>({
    isOpen: false,
    id: '',
    name: '',
  });

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCentre, setEditingCentre] = useState<ExamCentre | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form fields state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    city: 'Kurukshetra',
    state: 'Haryana',
    capacity: 1000,
    address: '',
    contactPerson: '',
    contactPhone: '',
  });

  const loadCentres = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/centres');
      const data = await res.json();
      if (data.success && data.centres) {
        setCentres(data.centres);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to load centres' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Network error loading centres' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCentres();
  }, []);

  const openAddModal = () => {
    setFormData({
      code: `GK-${String(centres.length + 1).padStart(2, '0')}`,
      name: '',
      city: 'Kurukshetra',
      state: 'Haryana',
      capacity: 1000,
      address: '',
      contactPerson: 'Exam Superintendent',
      contactPhone: '+91-1744-259114',
    });
    setShowAddModal(true);
  };

  const openEditModal = (centre: ExamCentre) => {
    setEditingCentre(centre);
    setFormData({
      code: centre.code,
      name: centre.name,
      city: centre.city,
      state: centre.state,
      capacity: centre.capacity,
      address: centre.address,
      contactPerson: centre.contactPerson,
      contactPhone: centre.contactPhone,
    });
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.address.trim()) {
      setMessage({ type: 'error', text: 'Venue name and address are required.' });
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch('/api/admin/centres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Examination Centre "${data.centre.name}" added successfully!` });
        setShowAddModal(false);
        loadCentres();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to add centre' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error adding examination centre' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCentre) return;

    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/centres/${editingCentre.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Examination Centre "${data.centre.name}" updated successfully!` });
        setEditingCentre(null);
        loadCentres();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update centre' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error updating examination centre' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteModal({ isOpen: true, id, name });
  };

  const confirmDelete = async () => {
    const { id, name } = deleteModal;
    setDeleteModal({ isOpen: false, id: '', name: '' });
    try {
      setDeletingId(id);
      const res = await fetch(`/api/admin/centres/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Examination venue "${name}" deleted successfully.` });
        loadCentres();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete venue' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error deleting venue' });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Building className="w-6 h-6 text-gurukul-600" />
            <h1 className="text-2xl sm:text-3xl font-black text-gurukul-navy">
              Examination Centres & Seating Capacity
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage entrance examination venues, seat allocation limits, and centre superintendents.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="bg-gurukul-navy hover:bg-slate-800 text-amber-300 font-bold px-4 py-2.5 rounded-xl text-xs shadow flex items-center gap-2 transition border border-amber-400/40"
        >
          <Plus className="w-4 h-4" />
          <span>Add Examination Centre</span>
        </button>
      </div>

      {/* Alert Notification */}
      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between shadow-sm transition ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
              : 'bg-red-50 border border-red-300 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="text-slate-400 hover:text-slate-700 ml-4"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-gurukul-600" />
          <span>Loading examination centres...</span>
        </div>
      ) : centres.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center space-y-3">
          <Building className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="font-bold text-slate-800 text-sm">No Examination Centres Registered</h3>
          <p className="text-xs text-slate-500">
            Click &quot;Add Examination Centre&quot; above to configure your first entrance examination venue.
          </p>
        </div>
      ) : (
        /* Centres Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {centres.map((c) => (
            <div
              key={c.id}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 hover:border-amber-400/80 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded border border-slate-200">
                      Centre Code: {c.code}
                    </span>
                    <h3 className="font-bold text-base text-slate-900 mt-1.5">{c.name}</h3>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {c.city}, {c.state}
                    </span>
                  </div>
                  <span className="bg-amber-100 text-amber-950 text-xs font-black px-3 py-1 rounded-full border border-amber-200">
                    Capacity: {c.capacity}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-600 mt-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gurukul-600 flex-shrink-0 mt-0.5" />
                    <span className="leading-snug">{c.address}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
                    <Users className="w-4 h-4 text-gurukul-600 flex-shrink-0" />
                    <span>
                      Superintendent: <strong>{c.contactPerson}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gurukul-600 flex-shrink-0" />
                    <span className="font-mono">{c.contactPhone}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Active Venue
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(c)}
                    className="text-slate-700 hover:text-gurukul-navy hover:bg-slate-100 px-2.5 py-1.5 rounded-lg font-bold text-[11px] flex items-center gap-1 border border-slate-200 transition"
                  >
                    <Edit2 className="w-3 h-3 text-slate-600" />
                    <span>Edit Venue</span>
                  </button>

                  <button
                    onClick={() => handleDelete(c.id, c.name)}
                    disabled={deletingId === c.id}
                    className="text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1.5 rounded-lg font-bold text-[11px] flex items-center gap-1 border border-red-200 transition"
                    title="Delete Venue"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Centre Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Building className="w-5 h-5 text-gurukul-600" />
                Add New Examination Centre
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1 text-[11px]">
                    Centre Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g. GK-05"
                    className="w-full p-2.5 border rounded-lg font-mono font-bold uppercase focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1 text-[11px]">
                    Seating Capacity *
                  </label>
                  <input
                    type="number"
                    required
                    min={50}
                    max={10000}
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    className="w-full p-2.5 border rounded-lg font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1 text-[11px]">
                  Venue / Centre Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Gurukul Panchkula Extension Campus"
                  className="w-full p-2.5 border rounded-lg font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1 text-[11px]">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1 text-[11px]">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1 text-[11px]">
                  Complete Address *
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street, Landmark, City, State - PIN code"
                  className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1 text-[11px]">
                    Superintendent Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="e.g. Dr. R. K. Sharma"
                    className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1 text-[11px]">
                    Contact Phone *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="+91-XXXXXXXXXX"
                    className="w-full p-2.5 border rounded-lg font-mono focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-gurukul-navy hover:bg-slate-800 text-amber-300 font-bold rounded-xl shadow flex items-center gap-1.5 transition"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Examination Centre</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Centre Modal */}
      {editingCentre && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-gurukul-600" />
                Edit Venue: {editingCentre.code}
              </h3>
              <button
                onClick={() => setEditingCentre(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1 text-[11px]">
                    Centre Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full p-2.5 border rounded-lg font-mono font-bold uppercase focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1 text-[11px]">
                    Seating Capacity *
                  </label>
                  <input
                    type="number"
                    required
                    min={50}
                    max={10000}
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    className="w-full p-2.5 border rounded-lg font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1 text-[11px]">
                  Venue / Centre Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 border rounded-lg font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1 text-[11px]">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1 text-[11px]">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1 text-[11px]">
                  Complete Address *
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1 text-[11px]">
                    Superintendent Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1 text-[11px]">
                    Contact Phone *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="w-full p-2.5 border rounded-lg font-mono focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingCentre(null)}
                  className="px-4 py-2 border rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow flex items-center gap-1.5 transition"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Update Venue Details</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Accessible Centralized Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Delete Examination Venue?"
        message={`Are you sure you want to delete venue "${deleteModal.name}"?\n\nThis action cannot be undone and candidates registered for this centre will need re-allocation.`}
        variant="danger"
        confirmText="Delete Venue"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: '', name: '' })}
      />
    </div>
  );
}
