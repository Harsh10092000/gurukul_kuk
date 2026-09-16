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
  Trash2,
  ShieldCheck,
  Sparkles,
  Clock,
  Check,
  X,
  EyeOff,
  ChevronLeft,
  ChevronRight
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
  const [admitCardsReleased, setAdmitCardsReleased] = useState(false);
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
          setBulkSuccessMsg('Admit cards are now officially RELEASED and visible to all registered candidates.');
        } else {
          setBulkSuccessMsg('Admit cards are now HIDDEN from candidates (held in progress).');
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

  // Exclude drafts completely: only registered candidates are displayed
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
        ? app.status !== 'rejected' // Active filter: excludes rejected archives
        : app.status === selectedStatus;

    return matchesSearch && matchesClass && matchesStatus;
  });

  // Pagination calculation
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

  // Authoritative metrics derived from registered applications only
  const activeCount = registeredApplications.filter((a) => a.status !== 'rejected').length;
  const submittedCount = registeredApplications.filter((a) => a.status === 'submitted' || a.status === 'under_review').length;
  const approvedCount = registeredApplications.filter((a) => a.status === 'approved').length;
  const correctionCount = registeredApplications.filter((a) => a.status === 'correction_needed').length;
  const rejectedCount = registeredApplications.filter((a) => a.status === 'rejected').length;

  return (
    <div className="space-y-6">
      {/* Top Title & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gurukul-navy">
            Candidate Application Management
          </h1>
          <p className="text-xs text-slate-500">
            Review, verify, and process registered candidate dossiers for Entrance Session 2026-27
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

      {/* Central Bulk Admit Card Issuance & Visibility Control Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-gurukul-navy to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-lg border border-slate-700/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-amber-400">
              Examination Board Desk
            </span>
            {admitCardsReleased ? (
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-400" /> Admit Cards: Released &amp; Visible
              </span>
            ) : (
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" /> Admit Cards: Hidden / In Progress
              </span>
            )}
          </div>
          <h2 className="text-base sm:text-lg font-black text-white">
            Admit Card Release &amp; Candidate Visibility Control
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            {admitCardsReleased
              ? `Admit cards and examination roll numbers are officially released and visible to candidates. Announcement is active on website.`
              : 'Admit cards are held in progress by default and hidden from candidates. When the Admissions Board is ready, click below to release Admit Cards for all registered students.'}
          </p>
        </div>

        <div className="flex-shrink-0 flex flex-wrap gap-2.5 w-full md:w-auto">
          {admitCardsReleased ? (
            <button
              type="button"
              onClick={() => handleToggleAdmitCards(false)}
              disabled={bulkLoading}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>{bulkLoading ? 'Updating...' : 'Stop Showing / Hide Admit Cards'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowBulkModal(true)}
              disabled={bulkLoading}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition transform active:scale-95 disabled:opacity-50"
            >
              <Eye className="w-4 h-4 text-white" />
              <span>
                {bulkLoading
                  ? 'Processing Bulk Release...'
                  : 'Release Admit Cards (Make Visible to Candidates)'}
              </span>
            </button>
          )}
        </div>
      </div>

      {bulkSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{bulkSuccessMsg}</span>
        </div>
      )}

      {bulkErrorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl text-rose-900 text-xs font-bold flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{bulkErrorMsg}</span>
        </div>
      )}

      {/* Quick Status Category Filter Pills (Drafts Removed) */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
        <button
          onClick={() => { setSelectedStatus('All'); setCurrentPage(1); }}
          className={`px-3 py-1.5 rounded-xl transition ${
            selectedStatus === 'All'
              ? 'bg-gurukul-navy text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Active ({activeCount})
        </button>
        <button
          onClick={() => { setSelectedStatus('submitted'); setCurrentPage(1); }}
          className={`px-3 py-1.5 rounded-xl transition ${
            selectedStatus === 'submitted'
              ? 'bg-gurukul-navy text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Pending Review ({submittedCount})
        </button>
        <button
          onClick={() => { setSelectedStatus('approved'); setCurrentPage(1); }}
          className={`px-3 py-1.5 rounded-xl transition ${
            selectedStatus === 'approved'
              ? 'bg-gurukul-navy text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Approved &amp; Verified ({approvedCount})
        </button>
        <button
          onClick={() => { setSelectedStatus('correction_needed'); setCurrentPage(1); }}
          className={`px-3 py-1.5 rounded-xl transition ${
            selectedStatus === 'correction_needed'
              ? 'bg-gurukul-navy text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Correction Needed ({correctionCount})
        </button>
        <button
          onClick={() => { setSelectedStatus('rejected'); setCurrentPage(1); }}
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
            <option value="All">All Classes (6, 7, 8, 9, 11)</option>
            <option value="Class 6">Class 6th</option>
            <option value="Class 7">Class 7th</option>
            <option value="Class 8">Class 8th</option>
            <option value="Class 9">Class 9th</option>
            <option value="Class 11">Class 11th</option>
          </select>
        </div>

        {/* Filter by Status */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 text-xs border rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-medium"
          >
            <option value="All">All Registered Candidates (Confirmed)</option>
            <option value="registered">Registered (Fee Paid ₹800)</option>
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
              ? `Active in portal: ${filteredApps.length} of ${registeredApplications.length} registered dossiers (${rejectedCount} rejected)`
              : `Filter matches: ${filteredApps.length} of ${registeredApplications.length} registered dossiers in system`}
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">Loading candidates...</div>
        ) : filteredApps.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            No registered candidate applications match the selected criteria.
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
                {paginatedApps.map((app) => (
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
                  <th className="py-3 px-4">Registration ID</th>
                  <th className="py-3 px-4">Candidate Profile</th>
                  <th className="py-3 px-4">Class &amp; Stream</th>
                  <th className="py-3 px-4">Guardian &amp; Phone</th>
                  <th className="py-3 px-4">Preferred Study Location</th>
                  <th className="py-3 px-4">Fee Paid</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedApps.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {app.registrationNumber || app.applicationNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 uppercase">
                        {app.personalInfo?.fullName || (app as any).applicantName || 'Applicant'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {app.personalInfo?.gender ? `${app.personalInfo.gender} • ` : ''}
                        {app.personalInfo?.dob ? formatDob(app.personalInfo.dob) : (app.personalInfo?.candidateEmail || '—')}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-bold">
                        Class {app.classApplying}{app.stream ? ` (${app.stream})` : ''}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 font-medium">{app.parentInfo?.fatherName || 'Guardian Pending'}</div>
                      <div className="font-mono text-slate-500 text-[11px]">
                        {app.parentInfo?.fatherPhone || app.personalInfo?.candidateMobile || 'N/A'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 max-w-[170px] truncate text-xs font-semibold">
                      {app.studyLocation?.firstPreference || app.examCentrePref?.preferredCenter1 || 'Gurukul Nilokheri'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        ₹{app.amountPaid || 800}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                          app.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {app.status === 'rejected' ? 'REJECTED' : 'REGISTERED'}
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

        {/* Pagination Controls Bar */}
        {filteredApps.length > 0 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-slate-600 font-medium">
              Showing <strong className="text-slate-900">{(validCurrentPage - 1) * pageSize + 1}</strong> to{' '}
              <strong className="text-slate-900">{Math.min(validCurrentPage * pageSize, filteredApps.length)}</strong> of{' '}
              <strong className="text-slate-900">{filteredApps.length}</strong> registered candidates
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={validCurrentPage <= 1}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => {
                  if (
                    totalPages > 7 &&
                    pg !== 1 &&
                    pg !== totalPages &&
                    Math.abs(pg - validCurrentPage) > 2
                  ) {
                    if (pg === 2 || pg === totalPages - 1) {
                      return <span key={pg} className="px-1 text-slate-400">...</span>;
                    }
                    return null;
                  }
                  return (
                    <button
                      key={pg}
                      type="button"
                      onClick={() => setCurrentPage(pg)}
                      className={`w-8 h-8 rounded-lg font-bold transition flex items-center justify-center ${
                        pg === validCurrentPage
                          ? 'bg-gurukul-navy text-white shadow-xs'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {pg}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={validCurrentPage >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
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

      {/* Bulk Admit Card Release Confirmation Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  Generate &amp; Release Admit Cards for ALL Candidates
                </h3>
                <p className="text-[11px] text-slate-500">
                  Entrance Session 2026-27 • Examination Board
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              You are about to generate official roll numbers and examination hall tickets simultaneously for all registered candidates with fee paid (₹800).
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 space-y-2 text-xs text-amber-950 font-medium">
              <div className="font-bold flex items-center gap-1.5 text-amber-900">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                What will happen next:
              </div>
              <ul className="list-disc list-inside text-[11px] space-y-1 text-amber-900">
                <li>Automated sequential roll numbers will be allocated to all students.</li>
                <li>Admit card download buttons will become immediately active on students&apos; candidate dashboards.</li>
                <li>A notification banner and popup will be broadcast on the website announcing that Admit Cards have been released.</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                disabled={bulkLoading}
                className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkGenerateAdmitCards}
                disabled={bulkLoading}
                className="px-5 py-2 bg-gurukul-navy hover:bg-slate-900 text-amber-400 font-black text-xs rounded-xl shadow transition flex items-center gap-1.5"
              >
                {bulkLoading ? 'Generating Roll Numbers...' : 'Yes, Generate & Release for All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
