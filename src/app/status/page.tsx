'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Download,
  Award,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

interface ApplicationTrackerData {
  applicationNumber: string;
  registrationNumber: string;
  rollNumber: string | null;
  classApplying: string;
  status: string;
  paymentStatus: string;
  amountPaid: number;
  transactionId: string | null;
  remarks: string | null;
  createdAt: string;
  personalInfo: {
    fullName: string;
    fatherName: string;
    gender: string;
    category: string;
    dob: string;
    maskedMobile: string;
    maskedAadhaar?: string;
  };
  preferences: {
    studyLocation: string;
    examCentre: string;
  };
  admitCard: {
    available: boolean;
    rollNumber?: string;
    examCentreName?: string;
    examDate?: string;
    reportingTime?: string;
    downloadUrl?: string;
    releaseDate?: string;
  };
  result: {
    declared: boolean;
    totalMarks?: number;
    maxTotalMarks?: number;
    percentage?: number;
    rank?: number;
    qualifyingStatus?: string;
    scorecardUrl?: string;
    scheduledDate?: string;
  };
  milestones: Array<{
    id: string;
    title: string;
    subtitle: string;
    status: 'completed' | 'in_progress' | 'action_needed' | 'rejected' | 'scheduled' | 'pending';
    date?: string;
    details: string;
  }>;
}

export default function StatusPage() {
  const [searchMode, setSearchMode] = useState<'id' | 'mobile'>('id');
  const [query, setQuery] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [application, setApplication] = useState<ApplicationTrackerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('q') || params.get('id') || params.get('regNo') || params.get('appNo');
      if (q) {
        setQuery(q);
        executeSearch(q, '');
      }
    }
  }, []);

  const executeSearch = async (searchQuery: string, searchDob: string, searchPhone?: string) => {
    setLoading(true);
    setError('');
    setSearched(true);

    try {
      let url = '/api/track?';
      if (searchQuery) {
        url += `query=${encodeURIComponent(searchQuery.trim())}`;
        if (searchDob) url += `&dob=${encodeURIComponent(searchDob.trim())}`;
      } else if (searchPhone && searchDob) {
        url += `phone=${encodeURIComponent(searchPhone.trim())}&dob=${encodeURIComponent(searchDob.trim())}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (res.ok && data.application) {
        setApplication(data.application);
      } else {
        setApplication(null);
        setError(data.error || 'No application record found matching the details provided. Please verify your credentials.');
      }
    } catch {
      setError('Connection error while retrieving application status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchMode === 'id') {
      if (!query.trim()) {
        setError('Please enter your Registration ID or Application Number.');
        return;
      }
      executeSearch(query, dob);
    } else {
      if (!phone.trim() || !dob.trim()) {
        setError('Please enter both your registered 10-digit mobile number and date of birth.');
        return;
      }
      executeSearch('', dob, phone);
    }
  };

  const handleCopyId = (text: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return {
          label: 'Verified & Approved',
          style: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-600',
        };
      case 'correction_needed':
        return {
          label: 'Correction Required',
          style: 'bg-amber-50 text-amber-900 border-amber-300',
          dot: 'bg-amber-600',
        };
      case 'rejected':
        return {
          label: 'Application Rejected',
          style: 'bg-rose-50 text-rose-800 border-rose-200',
          dot: 'bg-rose-600',
        };
      case 'admit_card_ready':
      case 'admitted':
        return {
          label: 'Admit Card Ready',
          style: 'bg-blue-50 text-blue-800 border-blue-200',
          dot: 'bg-blue-600',
        };
      case 'submitted':
      case 'under_review':
      default:
        return {
          label: 'Under Scrutiny',
          style: 'bg-slate-100 text-slate-800 border-slate-300',
          dot: 'bg-portal-navy',
        };
    }
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Page Header */}
        <div className="portal-card-navy rounded-2xl px-6 py-8 text-center space-y-2">
          <span className="portal-badge-gold text-[10px] uppercase font-mono">
            Official Verification Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Track Application Status
          </h1>
          <p className="text-xs text-slate-300 max-w-xl mx-auto leading-relaxed">
            Check real-time application verification status, fee confirmation, hall ticket issuance, and entrance results for Session 2027-28.
          </p>
        </div>

        {/* Search Box */}
        <div className="max-w-xl mx-auto portal-card p-6 space-y-4 border-t-4 border-t-portal-navy">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider pb-1">Find Your Application</div>
          {/* Mode Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => { setSearchMode('id'); setError(''); }}
              className={`flex-1 py-1.5 rounded transition text-center ${searchMode === 'id'
                ? 'bg-white text-portal-navy shadow-sm font-bold'
                : 'hover:text-slate-900'
                }`}
            >
              By Registration No
            </button>
            <button
              type="button"
              onClick={() => { setSearchMode('mobile'); setError(''); }}
              className={`flex-1 py-1.5 rounded transition text-center ${searchMode === 'mobile'
                ? 'bg-white text-portal-navy shadow-sm font-bold'
                : 'hover:text-slate-900'
                }`}
            >
              By Mobile &amp; DOB
            </button>
          </div>

          <form onSubmit={handleSearchSubmit} className="space-y-4">
            {searchMode === 'id' ? (
              <div className="space-y-3">
                <div>
                  <label className="form-label">
                    Registration ID / Application Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g. NILB-00001 or GK26-10001"
                    className="form-input-field font-mono font-semibold uppercase"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Found on your fee payment confirmation receipt or SMS
                  </span>
                </div>

                <div>
                  <label className="form-label">
                    Date of Birth (Optional Verification)
                  </label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="form-input-field font-mono"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="form-label">
                    Registered Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="10-digit mobile number"
                    className="form-input-field font-mono"
                  />
                </div>

                <div>
                  <label className="form-label">
                    Candidate Date of Birth <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="form-input-field font-mono"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary text-xs py-2.5 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                  <span>Searching Application...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Track Status</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="max-w-xl mx-auto p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block">Application Not Located</span>
              <p className="leading-relaxed">{error}</p>
              <p className="text-[11px] text-slate-500 pt-0.5">
                For assistance, contact Gurukul Helpline: 01744-259114, 9896328329
              </p>
            </div>
          </div>
        )}

        {/* Application Status Result */}
        {application && (
          <div className="space-y-6">
            {/* Summary Dossier Card */}
            <div className="portal-card overflow-hidden">
              {/* Card header */}
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] text-slate-500 uppercase font-semibold tracking-wide">Registration ID</span>
                    <span className="font-mono text-base font-bold text-portal-navy">
                      {application.registrationNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyId(application.registrationNumber)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded transition"
                      title="Copy Registration ID"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    App Ref: <span className="font-mono font-medium text-slate-700">{application.applicationNumber}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="portal-badge-navy text-xs">
                    {application.classApplying}
                  </span>
                  <div className={`px-2.5 py-0.5 rounded border text-xs font-semibold flex items-center gap-1.5 ${getStatusBadge(application.status).style}`}>
                    <span className={`w-2 h-2 rounded-full ${getStatusBadge(application.status).dot}`} />
                    <span>{getStatusBadge(application.status).label}</span>
                  </div>
                </div>
              </div>
              <div className="p-6 sm:p-8 space-y-5">

                {/* Dossier Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="data-cell">
                    <span className="text-[10px] text-slate-500 block uppercase tracking-wide font-semibold mb-0.5">Candidate</span>
                    <span className="font-semibold text-slate-900 block truncate">{application.personalInfo.fullName}</span>
                  </div>
                  <div className="data-cell">
                    <span className="text-[10px] text-slate-500 block uppercase tracking-wide font-semibold mb-0.5">Father&apos;s Name</span>
                    <span className="font-semibold text-slate-900 block truncate">{application.personalInfo.fatherName}</span>
                  </div>
                  <div className="data-cell">
                    <span className="text-[10px] text-slate-500 block uppercase tracking-wide font-semibold mb-0.5">Campus Pref.</span>
                    <span className="font-semibold text-slate-900 block truncate">{application.preferences.studyLocation}</span>
                  </div>
                  <div className="data-cell">
                    <span className="text-[10px] text-slate-500 block uppercase tracking-wide font-semibold mb-0.5">Fee Status</span>
                    <span className="font-semibold text-emerald-700 block">₹{application.amountPaid} Confirmed</span>
                  </div>
                </div>

                {/* Administrative Remarks */}
                {application.remarks && (
                  <div className={`p-3.5 rounded-lg border text-xs space-y-1 ${application.status === 'correction_needed'
                    ? 'bg-amber-50 border-amber-300 text-amber-950'
                    : application.status === 'rejected'
                      ? 'bg-rose-50 border-rose-200 text-rose-950'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}>
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Scrutiny Observation:</span>
                    </div>
                    <p className="leading-relaxed pl-5 font-medium">{application.remarks}</p>
                  </div>
                )}

                {application.admitCard.available && (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-[11px] text-amber-900 font-medium space-y-0.5">
                    <span className="font-bold text-amber-950 block">Mandatory Examination Day Instruction:</span>
                    <span>Candidate must carry a <strong>COLOURED printout</strong> of Admit Card and <strong>ONE ORIGINAL Photo ID Proof</strong> (Aadhaar / School ID).</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <div className="flex flex-wrap gap-2 text-xs">
                    {application.admitCard.available && application.admitCard.downloadUrl && (
                      <Link
                        href={application.admitCard.downloadUrl}
                        className="btn-accent text-xs px-3.5 py-1.5 font-bold"
                      >
                        Download Admit Card (Roll: {application.admitCard.rollNumber})
                      </Link>
                    )}

                    {application.result.declared && application.result.scorecardUrl && (
                      <Link
                        href={application.result.scorecardUrl}
                        className="btn-primary text-xs px-3.5 py-1.5"
                      >
                        View Scorecard
                      </Link>
                    )}
                  </div>

                  <Link
                    href="/login"
                    className="btn-primary text-xs px-4 py-1.5"
                  >
                    Candidate Login
                  </Link>
                </div>
              </div>
            </div>

            {/* Milestones Stepper */}
            <div className="portal-card p-6 sm:p-8 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-sm text-slate-900">
                  Application Milestone Progress
                </h3>
                <span className="text-[11px] text-slate-500">
                  6 Examination Stages
                </span>
              </div>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
                {application.milestones.map((milestone, idx) => {
                  const isCompleted = milestone.status === 'completed';
                  const isAction = milestone.status === 'action_needed';
                  const isRejected = milestone.status === 'rejected';
                  const isInProgress = milestone.status === 'in_progress';

                  return (
                    <div key={milestone.id} className="relative">
                      <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${isCompleted
                        ? 'bg-emerald-600 text-white'
                        : isAction
                          ? 'bg-amber-500 text-white'
                          : isRejected
                            ? 'bg-rose-600 text-white'
                            : isInProgress
                              ? 'bg-portal-navy text-white'
                              : 'bg-slate-200 text-slate-600'
                        }`}>
                        {isCompleted ? '✓' : idx + 1}
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <h4 className="font-semibold text-xs text-slate-900">
                            {milestone.title}
                          </h4>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded w-fit ${isCompleted
                            ? 'bg-emerald-100 text-emerald-800'
                            : isAction
                              ? 'bg-amber-100 text-amber-900'
                              : isRejected
                                ? 'bg-rose-100 text-rose-800'
                                : isInProgress
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-slate-200 text-slate-600'
                            }`}>
                            {milestone.subtitle}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-normal">
                          {milestone.details}
                        </p>
                        {milestone.date && (
                          <div className="text-[10px] text-slate-400 font-mono pt-0.5">
                            {milestone.date}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Candidate Advisory Card */}
            <div className="p-4 rounded-lg bg-portal-navy/5 border border-portal-navy/10 text-xs text-slate-700 space-y-1.5">
              <h4 className="font-semibold text-portal-navy text-[11px] uppercase tracking-wide">
                Candidate Advisory
              </h4>
              <ul className="list-disc pl-4 space-y-1 text-slate-600">
                <li>Keep your permanent Registration Number (<code className="font-mono bg-slate-100 px-1 rounded">{application.registrationNumber}</code>) safe for future reference.</li>
                <li>Hall Tickets must be printed in clear color and presented alongside original photo identity proof at the exam venue.</li>
                <li>Reporting time on exam day is strictly 45 minutes prior to the examination start time.</li>
              </ul>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
