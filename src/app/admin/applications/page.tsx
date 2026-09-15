'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  FileSpreadsheet, 
  Eye, 
  Download,
  CheckSquare,
  Trash2
} from 'lucide-react';
import { Application } from '@/lib/types';

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [appToDelete, setAppToDelete] = useState<Application | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetch('/api/applications')
      .then((res) => res.json())
      .then((data) => {
        if (data.applications) setApplications(data.applications);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredApps = applications.filter((app) => {
    const matchesSearch =
      app.applicationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.personalInfo?.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.parentInfo?.fatherPhone.includes(searchQuery);

    const matchesClass = selectedClass === 'All' || app.classApplying === selectedClass;
    const matchesStatus = selectedStatus === 'All' || app.status === selectedStatus;

    return matchesSearch && matchesClass && matchesStatus;
  });

  const handleDeleteApp = async () => {
    if (!appToDelete) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/applications/${appToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setApplications((prev) => prev.filter((a) => a.id !== appToDelete.id));
        setAppToDelete(null);
      } else {
        alert(data.error || 'Failed to delete application.');
      }
    } catch {
      alert('Failed to delete application.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Title & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gurukul-navy">
            Candidate Application Management
          </h1>
          <p className="text-xs text-slate-500">
            Review, verify, and process candidate dossiers for Entrance Session 2026-27
          </p>
        </div>

        <div className="flex gap-2.5">
          <a
            href="/api/admin/export"
            download
            className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs shadow-sm flex items-center gap-1.5 transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Name, App No., Mobile..."
            className="w-full pl-10 pr-3 py-2 text-xs border rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Filter by Class */}
        <div>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-3 py-2 text-xs border rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-medium"
          >
            <option value="All">All Classes (V, VI, VII, VIII, IX, XI)</option>
            <option value="Class 5">Class 5th</option>
            <option value="Class 6">Class 6th</option>
            <option value="Class 7">Class 7th</option>
            <option value="Class 8">Class 8th</option>
            <option value="Class 9">Class 9th</option>
            <option value="Class 11 Science">Class 11th - Science</option>
            <option value="Class 11 Commerce">Class 11th - Commerce</option>
            <option value="Class 11 Arts">Class 11th - Arts</option>
            <option value="Class 11 NDA Wing">Class 11th - NDA Wing</option>
          </select>
        </div>

        {/* Filter by Status */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 text-xs border rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-medium"
          >
            <option value="All">All Verification Statuses</option>
            <option value="submitted">Submitted (Pending Review)</option>
            <option value="approved">Approved & Verified</option>
            <option value="correction_needed">Correction Needed (Flagged)</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center text-xs">
          <span className="font-bold text-slate-700">
            Showing {filteredApps.length} Candidates
          </span>
          <span className="text-slate-400">Total in system: {applications.length}</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">Loading candidates...</div>
        ) : filteredApps.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            No candidate applications match the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Application No.</th>
                  <th className="py-3 px-4">Candidate Profile</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Guardian & Phone</th>
                  <th className="py-3 px-4">Centre Preference</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Verification Desk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredApps.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {app.applicationNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 uppercase">
                        {app.personalInfo?.fullName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {app.personalInfo?.gender} • {app.personalInfo?.dob}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-bold">
                        {app.classApplying}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 font-medium">{app.parentInfo?.fatherName}</div>
                      <div className="font-mono text-slate-500 text-[11px]">
                        {app.parentInfo?.fatherPhone}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 max-w-[150px] truncate">
                      {app.examCentrePref?.preferredCenter1}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        ₹{app.amountPaid || 1200}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                          app.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : app.status === 'correction_needed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {app.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/admin/applications/${app.id}`}
                          className="bg-gurukul-navy hover:bg-gurukul-navyLight text-white font-bold px-3 py-1.5 rounded-lg text-xs transition inline-flex items-center gap-1.5 shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Verify</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => setAppToDelete(app)}
                          className="p-1.5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 hover:border-red-300 rounded-lg transition"
                          title="Delete Candidate Application"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Candidate Application Modal */}
      {appToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-red-700 text-base flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              Delete Candidate Application
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete application <strong>{appToDelete.applicationNumber}</strong> for candidate <strong>{appToDelete.personalInfo?.fullName || 'Candidate'}</strong>?
            </p>
            <p className="text-[11px] text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200">
              ⚠️ <strong>Warning:</strong> This will completely remove this application record and any issued admit card. This action cannot be reversed.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setAppToDelete(null)}
                className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteApp}
                disabled={actionLoading}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow transition"
              >
                {actionLoading ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
