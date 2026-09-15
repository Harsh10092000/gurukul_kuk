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
  const [metrics, setMetrics] = useState<any>(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [appToDelete, setAppToDelete] = useState<Application | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const fetchApplications = () => {
    fetch('/api/applications')
      .then((res) => res.json())
      .then((data) => {
        if (data.applications) setApplications(data.applications);
        if (data.metrics) setMetrics(data.metrics);
        if (data.totalRecords !== undefined) setTotalRecords(data.totalRecords);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const filteredApps = applications.filter((app) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (app.applicationNumber || '').toLowerCase().includes(q) ||
      (app.registrationNumber || '').toLowerCase().includes(q) ||
      (app.personalInfo?.fullName || '').toLowerCase().includes(q) ||
      (app.parentInfo?.fatherPhone || '').includes(q) ||
      (app.personalInfo?.candidateMobile || '').includes(q) ||
      (app.personalInfo?.candidateEmail || '').toLowerCase().includes(q);

    const matchesClass = selectedClass === 'All' || app.classApplying === selectedClass;
    const matchesStatus =
      selectedStatus === 'All'
        ? app.status !== 'rejected' // Active filter: excludes rejected archives
        : app.status === selectedStatus;

    return matchesSearch && matchesClass && matchesStatus;
  });

  const handleDeleteApp = async () => {
    if (!appToDelete) return;
    setActionLoading(true);
    setDeleteError('');
    try {
      const res = await fetch(`/api/applications/${appToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setAppToDelete(null);
        fetchApplications();
      } else {
        setDeleteError(data.error || 'Failed to delete application.');
      }
    } catch {
      setDeleteError('Failed to delete application.');
    } finally {
      setActionLoading(false);
    }
  };

  // Authoritative metrics derived from single source of truth
  const totalCount = metrics?.total ?? applications.length;
  const activeCount = metrics?.active ?? applications.filter((a) => a.status !== 'rejected').length;
  const submittedCount = metrics?.underReview ?? applications.filter((a) => a.status === 'submitted' || a.status === 'under_review').length;
  const approvedCount = metrics?.approved ?? applications.filter((a) => a.status === 'approved').length;
  const correctionCount = metrics?.correctionNeeded ?? applications.filter((a) => a.status === 'correction_needed').length;
  const draftCount = metrics?.draft ?? applications.filter((a) => a.status === 'draft').length;
  const rejectedCount = metrics?.rejected ?? applications.filter((a) => a.status === 'rejected').length;

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

      {/* Quick Status Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
        <button
          onClick={() => setSelectedStatus('All')}
          className={`px-3 py-1.5 rounded-xl transition ${
            selectedStatus === 'All'
              ? 'bg-gurukul-navy text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Active ({activeCount})
        </button>
        <button
          onClick={() => setSelectedStatus('submitted')}
          className={`px-3 py-1.5 rounded-xl transition ${
            selectedStatus === 'submitted'
              ? 'bg-gurukul-navy text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Pending Review ({submittedCount})
        </button>
        <button
          onClick={() => setSelectedStatus('approved')}
          className={`px-3 py-1.5 rounded-xl transition ${
            selectedStatus === 'approved'
              ? 'bg-gurukul-navy text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Approved & Verified ({approvedCount})
        </button>
        <button
          onClick={() => setSelectedStatus('correction_needed')}
          className={`px-3 py-1.5 rounded-xl transition ${
            selectedStatus === 'correction_needed'
              ? 'bg-gurukul-navy text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Correction Needed ({correctionCount})
        </button>
        <button
          onClick={() => setSelectedStatus('draft')}
          className={`px-3 py-1.5 rounded-xl transition ${
            selectedStatus === 'draft'
              ? 'bg-gurukul-navy text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Drafts ({draftCount})
        </button>
        <button
          onClick={() => setSelectedStatus('rejected')}
          className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
            selectedStatus === 'rejected'
              ? 'bg-red-600 text-white shadow-sm font-black'
              : 'bg-white text-red-700 border border-red-200 hover:bg-red-50'
          }`}
        >
          <span>Rejected Candidates</span>
          <span
            className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] font-bold ${
              selectedStatus === 'rejected' ? 'bg-white text-red-700' : 'bg-red-100 text-red-800'
            }`}
          >
            {rejectedCount}
          </span>
        </button>
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
            placeholder="Search by Name, App No., Mobile, Email..."
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
            <option value="All">All Active Candidates (Exclude Rejected)</option>
            <option value="draft">Draft Applications (In Progress)</option>
            <option value="submitted">Submitted (Pending Review)</option>
            <option value="approved">Approved & Verified</option>
            <option value="correction_needed">Correction Needed (Flagged)</option>
            <option value="rejected">Rejected Candidates (Archive)</option>
          </select>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">
              {selectedStatus === 'rejected' ? 'Rejected Candidate Dossiers' : 'Showing'} {filteredApps.length} Candidates
            </span>
            <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-semibold text-[11px]">
              {selectedStatus === 'All' ? 'All Active' : selectedStatus.replace('_', ' ')}
            </span>
          </div>
          <div className="text-slate-500 text-[11px] font-medium">
            {selectedStatus === 'All'
              ? `Active in portal: ${filteredApps.length} of ${totalCount} total dossiers (${draftCount} draft, ${rejectedCount} rejected)`
              : `Filter matches: ${filteredApps.length} of ${totalCount} total dossiers in system`}
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">Loading candidates...</div>
        ) : filteredApps.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            No candidate applications match the selected criteria.
          </div>
        ) : selectedStatus === 'rejected' ? (
          /* Specialized Rejected Candidates Table View */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-red-50 text-red-900 uppercase font-bold text-[10px] border-b border-red-200">
                <tr>
                  <th className="py-3 px-4">Application No.</th>
                  <th className="py-3 px-4">Candidate Profile & Contact</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Ground / Reason for Rejection</th>
                  <th className="py-3 px-4">Rejection Timestamp</th>
                  <th className="py-3 px-4">Portal Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100">
                {filteredApps.map((app) => (
                  <tr key={app.id} className="hover:bg-red-50/40 bg-rose-50/20">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {app.applicationNumber || app.registrationNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 uppercase">
                        {app.personalInfo?.fullName || (app as any).applicantName || 'Applicant'}
                      </div>
                      <div className="text-[11px] text-slate-600">
                        {app.personalInfo?.candidateEmail || 'N/A'}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        📞 {app.parentInfo?.fatherPhone || app.personalInfo?.candidateMobile || 'N/A'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded text-[11px]">
                        {app.classApplying}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 max-w-sm">
                      <div className="p-2.5 bg-white border border-red-200 rounded-xl text-xs font-semibold text-red-900 leading-relaxed shadow-xs">
                        {app.remarks || 'Documentation or eligibility criteria mismatch.'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      {new Date(app.updatedAt || app.createdAt).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase bg-rose-100 text-rose-800 border border-rose-300 block w-fit">
                        REJECTED
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Dossier Annulled
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/admin/applications/${app.id}`}
                          className="bg-gurukul-navy hover:bg-gurukul-navyLight text-white font-bold px-3 py-1.5 rounded-lg text-xs transition inline-flex items-center gap-1.5 shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect Dossier</span>
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
        ) : (
          /* Standard Applications Table View */
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
                      {app.applicationNumber || app.registrationNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 uppercase">
                        {app.personalInfo?.fullName || (app as any).applicantName || 'Applicant'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {app.personalInfo?.gender ? `${app.personalInfo.gender} • ` : ''}
                        {app.personalInfo?.dob || app.personalInfo?.candidateEmail || 'Registration in Progress'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-bold">
                        {app.classApplying}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 font-medium">{app.parentInfo?.fatherName || 'Guardian Pending'}</div>
                      <div className="font-mono text-slate-500 text-[11px]">
                        {app.parentInfo?.fatherPhone || app.personalInfo?.candidateMobile || 'N/A'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 max-w-[150px] truncate">
                      {app.examCentrePref?.preferredCenter1 || 'Not Selected Yet'}
                    </td>
                    <td className="py-3.5 px-4">
                      {app.status === 'draft' ? (
                        <span className="text-slate-500 font-medium flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                          ₹{app.amountPaid || 1200} (Draft)
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          ₹{app.amountPaid || 1200}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                          app.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : app.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : app.status === 'correction_needed'
                            ? 'bg-amber-100 text-amber-800'
                            : app.status === 'draft'
                            ? 'bg-slate-100 text-slate-700 border border-slate-300'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {app.status.replace('_', ' ')}
                      </span>
                      {app.status === 'rejected' && app.remarks && (
                        <div className="text-[10px] text-red-600 line-clamp-1 mt-0.5 font-medium" title={app.remarks}>
                          Reason: {app.remarks}
                        </div>
                      )}
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
            {deleteError && (
              <p className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200 font-medium">
                {deleteError}
              </p>
            )}
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
