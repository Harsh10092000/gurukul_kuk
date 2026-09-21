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

  const getStatusDetails = (app: ApplicationTrackerData) => {
    if (app.admitCard?.available) {
      return {
        badge: 'Admit Card Ready',
        badgeStyle: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        badgeDot: 'bg-indigo-600',
        cardStyle: 'bg-indigo-50/70 border-indigo-200',
        icon: Download,
        iconBg: 'bg-indigo-100 text-indigo-700',
        title: 'Entrance Admit Card Released',
        description: 'Your Entrance Examination Roll Number has been allotted and the official Admit Card / Hall Ticket is ready to download.',
        nextStep: 'Download and print your coloured Admit Card and carry it along with an original Photo ID to the exam centre.',
      };
    }
    switch (app.status) {
      case 'approved':
        return {
          badge: 'Verified & Approved',
          badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          badgeDot: 'bg-emerald-600',
          cardStyle: 'bg-emerald-50/70 border-emerald-200',
          icon: CheckCircle2,
          iconBg: 'bg-emerald-100 text-emerald-700',
          title: 'Application Verified & Approved',
          description: 'Your candidate dossier, eligibility criteria, and submitted documents have been successfully verified and approved by the Gurukul Admission Cell.',
          nextStep: 'Roll number generation and Admit Card release will follow as per the admission schedule.',
        };
      case 'correction_needed':
        return {
          badge: 'Correction Required',
          badgeStyle: 'bg-amber-50 text-amber-900 border-amber-300',
          badgeDot: 'bg-amber-600',
          cardStyle: 'bg-amber-50/80 border-amber-300',
          icon: AlertTriangle,
          iconBg: 'bg-amber-100 text-amber-700',
          title: 'Action Required: Discrepancy Flagged',
          description: app.remarks || 'The scrutiny team has identified discrepancies in your application details or uploaded certificates. Please log in to your portal to rectify the issues.',
          nextStep: 'Log in to the Candidate Portal to update your required documents or information.',
        };
      case 'rejected':
        return {
          badge: 'Application Rejected',
          badgeStyle: 'bg-rose-50 text-rose-800 border-rose-200',
          badgeDot: 'bg-rose-600',
          cardStyle: 'bg-rose-50/70 border-rose-200',
          icon: AlertCircle,
          iconBg: 'bg-rose-100 text-rose-700',
          title: 'Application Not Approved',
          description: app.remarks || 'Your application does not fulfill the admission criteria for Session 2027-28.',
          nextStep: 'Contact The Gurukul Admission Helpdesk (+91 7027849858 / 59) for further inquiries.',
        };
      case 'submitted':
      case 'under_review':
      default:
        return {
          badge: 'Under Scrutiny',
          badgeStyle: 'bg-blue-50 text-blue-900 border-blue-200',
          badgeDot: 'bg-blue-600',
          cardStyle: 'bg-blue-50/70 border-blue-200',
          icon: Clock,
          iconBg: 'bg-blue-100 text-blue-700',
          title: 'Under Administrative Scrutiny',
          description: 'Your admission form has been received with confirmed fee payment. Candidate dossier, photograph, and documents are currently undergoing verification by the Admission Scrutiny Committee.',
          nextStep: 'No action required from candidate at this time. Admit card and roll number will be issued once scrutiny is complete.',
        };
    }
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

  const statusInfo = application ? getStatusDetails(application) : null;
  const StatusIcon = statusInfo?.icon;

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
                For assistance, contact The Gurukul Helpline: +91 7027849858 / 59
              </p>
            </div>
          </div>
        )}

        {/* Application Status Result */}
        {application && statusInfo && StatusIcon && (
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
                  <div className={`px-2.5 py-0.5 rounded border text-xs font-semibold flex items-center gap-1.5 ${statusInfo.badgeStyle}`}>
                    <span className={`w-2 h-2 rounded-full ${statusInfo.badgeDot}`} />
                    <span>{statusInfo.badge}</span>
                  </div>
                </div>
              </div>

              {/* Prominent Current Status Banner */}
              <div className={`p-5 sm:p-6 border-b ${statusInfo.cardStyle}`}>
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 sm:p-3 rounded-xl ${statusInfo.iconBg} shrink-0 mt-0.5 shadow-sm`}>
                    <StatusIcon className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                          Current Application Status
                        </span>
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                          {statusInfo.title}
                        </h2>
                      </div>
                      <span className={`px-3 py-1 rounded-full border text-xs font-bold flex items-center gap-1.5 shadow-xs ${statusInfo.badgeStyle}`}>
                        <span className={`w-2 h-2 rounded-full ${statusInfo.badgeDot}`} />
                        {statusInfo.badge}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed pt-0.5 font-normal">
                      {statusInfo.description}
                    </p>

                    {statusInfo.nextStep && (
                      <div className="pt-2.5 mt-2 border-t border-slate-200/70 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs text-slate-600">
                        <span className="font-bold text-slate-800 shrink-0">Current Action / Next Step:</span>
                        <span className="font-medium text-slate-700">{statusInfo.nextStep}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8 space-y-5">
                {/* Dossier Grid */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                    Candidate Dossier Summary
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
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
                      <span className="text-[10px] text-slate-500 block uppercase tracking-wide font-semibold mb-0.5">Class</span>
                      <span className="font-semibold text-slate-900 block">{application.classApplying}</span>
                    </div>
                    <div className="data-cell">
                      <span className="text-[10px] text-slate-500 block uppercase tracking-wide font-semibold mb-0.5">Category</span>
                      <span className="font-semibold text-slate-900 block">{application.personalInfo.category || 'General'}</span>
                    </div>
                    <div className="data-cell">
                      <span className="text-[10px] text-slate-500 block uppercase tracking-wide font-semibold mb-0.5">Fee Status</span>
                      <span className="font-semibold text-emerald-700 block">₹{application.amountPaid} Confirmed</span>
                    </div>
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
          </div>
        )}

      </div>
    </div>
  );
}
