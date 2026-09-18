'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  FileSpreadsheet, 
  Eye, 
  Trash2, 
  ShieldCheck, 
  Clock, 
  Check, 
  EyeOff, 
  ChevronLeft, 
  ChevronRight,
  Loader2
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

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Bulk Admit Card Issuance State
  const [admitCardsReleased, setAdmitCardsReleased] = useState<boolean | null>(null);
  const [admitCardsReleasedAt, setAdmitCardsReleasedAt] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState('');
  const [bulkErrorMsg, setBulkErrorMsg] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);

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

  const formatDob = (dobStr?: string) => {
    if (!dobStr) return '—';
    const s = dobStr.trim();
    const match = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      return `${match[3]}-${match[2]}-${match[1]}`;
    }
    return s;
  };

  const fetchSettings = () => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) {
          setAdmitCardsReleased(data.settings.admitCardsReleased === true);
          setAdmitCardsReleasedAt(data.settings.admitCardsReleasedAt || null);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchApplications();
    fetchSettings();
  }, []);

  const handleBulkGenerateAdmitCards = async () => {
    setBulkLoading(true);
    setBulkErrorMsg('');
    setBulkSuccessMsg('');
    setShowBulkModal(false);
    try {
      const res = await fetch('/api/admit-card/bulk', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setAdmitCardsReleased(true);
        setAdmitCardsReleasedAt(data.releasedAt || new Date().toISOString());
        setBulkSuccessMsg(`Success! Generated and officially released Admit Cards for ${data.count} candidates.`);
        fetchApplications();
        setTimeout(() => setBulkSuccessMsg(''), 8000);
      } else {
        setBulkErrorMsg(data.error || 'Failed to generate bulk admit cards.');
      }
    } catch {
      setBulkErrorMsg('Failed to generate bulk admit cards.');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleToggleAdmitCards = async (release: boolean) => {
    setBulkLoading(true);
    setBulkErrorMsg('');
    setBulkSuccessMsg('');
    try {
      const res = await fetch('/api/admit-card/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admitCardsReleased: release }),
      });
      const data = await res.json();
      if (data.success) {
        setAdmitCardsReleased(release);
        if (release) {
          setAdmitCardsReleasedAt(data.admitCardsReleasedAt || new Date().toISOString());
          setBulkSuccessMsg('Admit cards are now officially released and visible to all registered candidates.');
        } else {
          setBulkSuccessMsg('Admit cards are now hidden from candidates.');
        }
        fetchApplications();
        setTimeout(() => setBulkSuccessMsg(''), 8000);
      } else {
        setBulkErrorMsg(data.error || 'Failed to update admit card release status.');
      }
    } catch {
      setBulkErrorMsg('Network error while updating admit card release status.');
    } finally {
      setBulkLoading(false);
    }
  };

  const registeredApplications = applications.filter((app) => {
    if (!app) return false;
    if (app.status === 'draft') return false;
    if ((app.registrationNumber || '').startsWith('DRAFT-')) return false;
    return true;
  });

  const filteredApps = registeredApplications.filter((app) => {
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
        ? true
        : app.status === selectedStatus;

    return matchesSearch && matchesClass && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredApps.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const paginatedApps = filteredApps.slice((validCurrentPage - 1) * pageSize, validCurrentPage * pageSize);

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

  const activeCount = registeredApplications.length;
  const submittedCount = registeredApplications.filter((a) => a.status === 'submitted' || a.status === 'under_review').length;
  const approvedCount = registeredApplications.filter((a) => a.status === 'approved').length;
  const correctionCount = registeredApplications.filter((a) => a.status === 'correction_needed').length;

  return (
    <div className="space-y-6">
      {/* Top Title & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Candidate Application Management
          </h1>
          <p className="text-xs text-slate-500">
            Review, verify, and process registered candidate dossiers for Entrance Session 2027-28
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/admin/export"
            download
            className="btn-secondary text-xs px-3 py-1.5"
          >
            Export CSV
          </a>
        </div>
      </div>      {/* Bulk Admit Card Release Banner */}
      <div className="portal-card-navy p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-amber-300">
              Examination Board
            </span>
            {admitCardsReleased === null ? (
              <span className="bg-slate-800/80 text-amber-300 border border-slate-700 text-[10px] font-medium px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin text-amber-300" />
                Checking Status...
              </span>
            ) : admitCardsReleased ? (
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                Admit Cards: Released &amp; Visible to Students
              </span>
            ) : (
              <span className="bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                Admit Cards: Hidden / In Preparation
              </span>
            )}
          </div>
          <h2 className="text-lg font-black tracking-tight text-white">
            Admit Card Release &amp; Visibility Control
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            {admitCardsReleased === null
              ? 'Loading official admit card distribution and publishing status...'
              : admitCardsReleased
              ? 'Admit cards and entrance roll numbers are actively published and downloadable by candidates from their dashboard.'
              : 'Admit cards are hidden from students. Click below to generate entrance roll numbers and officially release hall tickets.'}
          </p>
        </div>

        <div className="flex-shrink-0 flex flex-wrap gap-2.5">
          {admitCardsReleased === null ? (
            <button
              type="button"
              disabled
              className="bg-slate-800 text-slate-300 border border-slate-700 text-xs h-10 px-4 font-bold flex items-center gap-2 rounded-xl opacity-80 cursor-wait shadow-sm"
            >
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              <span>Checking Status...</span>
            </button>
          ) : admitCardsReleased ? (
            <button
              type="button"
              onClick={() => handleToggleAdmitCards(false)}
              disabled={bulkLoading}
              className="btn-danger text-xs h-10 px-4 font-bold flex items-center gap-2 shadow-sm"
            >
              {bulkLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
              <span>{bulkLoading ? 'Updating...' : 'Hide Admit Cards'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowBulkModal(true)}
              disabled={bulkLoading}
              className="btn-accent text-xs h-10 px-5 font-bold flex items-center gap-2 shadow-md"
            >
              {bulkLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              <span>{bulkLoading ? 'Processing...' : 'Release Admit Cards for All'}</span>
            </button>
          )}
        </div>
      </div>

      {bulkSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 text-xs font-semibold flex items-center gap-2.5 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{bulkSuccessMsg}</span>
        </div>
      )}

      {bulkErrorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-rose-950 text-xs font-semibold flex items-center gap-2.5 shadow-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{bulkErrorMsg}</span>
        </div>
      )}

      {/* Status Category Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        <button
          onClick={() => { setSelectedStatus('All'); setCurrentPage(1); }}
          className={`px-3.5 py-2 rounded-xl transition ${
            selectedStatus === 'All'
              ? 'bg-portal-navy text-white shadow-sm ring-1 ring-portal-navy font-bold'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Active ({activeCount})
        </button>
        <button
          onClick={() => { setSelectedStatus('submitted'); setCurrentPage(1); }}
          className={`px-3.5 py-2 rounded-xl transition ${
            selectedStatus === 'submitted'
              ? 'bg-portal-navy text-white shadow-sm ring-1 ring-portal-navy font-bold'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Pending Review ({submittedCount})
        </button>
        <button
          onClick={() => { setSelectedStatus('approved'); setCurrentPage(1); }}
          className={`px-3.5 py-2 rounded-xl transition ${
            selectedStatus === 'approved'
              ? 'bg-portal-navy text-white shadow-sm ring-1 ring-portal-navy font-bold'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Approved ({approvedCount})
        </button>
        <button
          onClick={() => { setSelectedStatus('correction_needed'); setCurrentPage(1); }}
          className={`px-3.5 py-2 rounded-xl transition ${
            selectedStatus === 'correction_needed'
              ? 'bg-portal-navy text-white shadow-sm ring-1 ring-portal-navy font-bold'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Correction Needed ({correctionCount})
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="portal-card p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, ID, phone, email..."
            className="form-input-field"
          />
        </div>

        <div>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="form-input-field font-medium"
          >
            <option value="All">All Classes (6, 7, 8, 9, 11)</option>
            <option value="Class 6">Class 6th</option>
            <option value="Class 7">Class 7th</option>
            <option value="Class 8">Class 8th</option>
            <option value="Class 9">Class 9th</option>
            <option value="Class 11">Class 11th</option>
          </select>
        </div>

        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="form-input-field font-medium"
          >
            <option value="All">All Registered Candidates</option>
            <option value="registered">Registered (Fee Paid ₹800)</option>
            <option value="approved">Approved &amp; Verified</option>
          </select>
        </div>
      </div>

      {/* Applications Table */}
      <div className="portal-card p-0 overflow-hidden border border-slate-200/90 shadow-sm">
        <div className="p-4 sm:px-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs bg-slate-50/50">
          <span className="font-bold text-slate-900">
            Showing {filteredApps.length} Candidates
          </span>
          <span className="text-slate-500 text-[11px] font-medium">
            {filteredApps.length} of {registeredApplications.length} registered dossiers
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500 font-medium">Loading candidate dossiers...</div>
        ) : filteredApps.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400 font-medium">
            No registered applications match your search and filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Reg ID</th>
                  <th className="py-3 px-4">Candidate</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Guardian / Contact</th>
                  <th className="py-3 px-4">Centre Preference</th>
                  <th className="py-3 px-4">Fee Status</th>
                  <th className="py-3 px-4">Dossier</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedApps.map((app) => {
                  const candidateName = app.personalInfo?.fullName || (app as any).applicantName || 'Applicant';
                  const candidateInitials = candidateName
                    .split(' ')
                    .map((n: string) => n[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-portal-navy">
                        {app.registrationNumber || app.applicationNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center flex-shrink-0 border border-slate-200">
                            {candidateInitials}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">
                              {candidateName}
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium">
                              {app.personalInfo?.gender ? `${app.personalInfo.gender} • ` : ''}
                              {app.personalInfo?.dob ? formatDob(app.personalInfo.dob) : (app.personalInfo?.candidateEmail || '—')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-0.5 rounded-md text-[11px] font-semibold">
                          Class {app.classApplying}{app.stream ? ` (${app.stream})` : ''}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-slate-900 font-medium">{app.parentInfo?.fatherName || 'Guardian Pending'}</div>
                        <div className="font-mono text-slate-500 text-[11px]">
                          {app.parentInfo?.fatherPhone || app.personalInfo?.candidateMobile || 'N/A'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 max-w-[160px] truncate text-xs font-medium">
                        {app.studyLocation?.firstPreference || app.examCentrePref?.preferredCenter1 || 'Gurukul Nilokheri'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-emerald-700 font-bold flex items-center gap-1.5 font-mono">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ₹{app.amountPaid || 800}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="portal-badge-emerald">
                          Registered
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/applications/${app.id}`}
                            className="btn-primary text-xs h-8 px-3"
                          >
                            View
                          </Link>
                          <button
                            type="button"
                            onClick={() => setAppToDelete(app)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Delete Candidate Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {filteredApps.length > 0 && (
          <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-slate-600">
              Showing <strong>{(validCurrentPage - 1) * pageSize + 1}</strong> to{' '}
              <strong>{Math.min(validCurrentPage * pageSize, filteredApps.length)}</strong> of{' '}
              <strong>{filteredApps.length}</strong> candidates
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={validCurrentPage <= 1}
                className="px-2.5 py-1 rounded border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              <span className="px-2 font-medium text-slate-700">
                Page {validCurrentPage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={validCurrentPage >= totalPages}
                className="px-2.5 py-1 rounded border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Application Modal */}
      {appToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-elevated border border-slate-200 space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">
              Delete Candidate Application?
            </h3>
            <p className="text-xs text-slate-600 leading-normal">
              Permanently delete application <strong>{appToDelete.applicationNumber}</strong> for candidate <strong>{appToDelete.personalInfo?.fullName || 'Candidate'}</strong>? This action cannot be reversed.
            </p>
            {deleteError && (
              <p className="text-xs text-rose-700 bg-rose-50 p-2 rounded font-medium">
                {deleteError}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAppToDelete(null)}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteApp}
                disabled={actionLoading}
                className="btn-danger text-xs px-3.5 py-1.5"
              >
                {actionLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Admit Card Release Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-elevated border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">
              Generate &amp; Release Admit Cards for ALL Candidates
            </h3>
            <p className="text-xs text-slate-600 leading-normal">
              Official roll numbers and examination hall tickets will be generated simultaneously for all registered candidates with confirmed fee payment.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 space-y-1">
              <strong className="block text-slate-900">What will happen:</strong>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-600">
                <li>Automated sequential roll numbers will be allocated to all students.</li>
                <li>Admit card download buttons will become active on candidate dashboards.</li>
                <li>Admit card release announcement will be broadcast on portal.</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                disabled={bulkLoading}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkGenerateAdmitCards}
                disabled={bulkLoading}
                className="btn-primary text-xs px-4 py-1.5 font-bold"
              >
                {bulkLoading ? 'Generating...' : 'Confirm Release'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
