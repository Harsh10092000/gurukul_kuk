'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  ArrowRight, 
  Download, 
  Award, 
  User, 
  Calendar, 
  Phone, 
  ShieldCheck, 
  Copy, 
  Check, 
  RefreshCw,
  Building2,
  AlertTriangle,
  ChevronRight,
  HelpCircle
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

  // Auto-search if query param present in URL
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
        setError(data.error || 'No application record found matching the details provided. Please check your inputs.');
      }
    } catch {
      setError('An error occurred while connecting to the verification server. Please try again.');
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
    } catch {}
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return {
          label: 'Verified & Approved',
          style: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          dot: 'bg-emerald-500',
          desc: 'Your application has been thoroughly verified and accepted by Gurukul Admission Cell.',
        };
      case 'correction_needed':
        return {
          label: 'Correction Required',
          style: 'bg-amber-100 text-amber-900 border-amber-300',
          dot: 'bg-amber-500',
          desc: 'The Admission Cell has requested corrections in your submitted dossier.',
        };
      case 'rejected':
        return {
          label: 'Application Rejected',
          style: 'bg-rose-100 text-rose-800 border-rose-300',
          dot: 'bg-rose-500',
          desc: 'Application did not meet eligibility or age criteria.',
        };
      case 'admit_card_ready':
      case 'admitted':
        return {
          label: 'Admit Card Ready / Qualified',
          style: 'bg-blue-100 text-blue-800 border-blue-300',
          dot: 'bg-blue-500',
          desc: 'Roll number allotted and examination seat confirmed.',
        };
      case 'submitted':
      case 'under_review':
      default:
        return {
          label: 'Under Scrutiny',
          style: 'bg-blue-50 text-blue-900 border-blue-200',
          dot: 'bg-blue-500',
          desc: 'Your application is currently undergoing document verification by the examination officers.',
        };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Page Header */}
        <div className="text-center space-y-2">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-gurukul-700 bg-amber-100 border border-amber-300 px-3.5 py-1 rounded-full inline-block">
            Official Verification Portal
          </span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gurukul-navy tracking-tight">
            Track Registration &amp; Application Status
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mx-auto">
            Real-time tracking for Gurukul Entrance Examination Session 2026-27. Verify scrutiny status, fee payment, hall ticket release, and results.
          </p>
        </div>

        {/* Search Card with Dual Modes */}
        <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-md space-y-5">
          
          {/* Search Mode Switcher Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            <button
              type="button"
              onClick={() => { setSearchMode('id'); setError(''); }}
              className={`flex-1 py-2 rounded-lg transition text-center ${
                searchMode === 'id'
                  ? 'bg-white text-gurukul-navy shadow-sm font-black'
                  : 'hover:text-slate-900'
              }`}
            >
              By Registration / Application No
            </button>
            <button
              type="button"
              onClick={() => { setSearchMode('mobile'); setError(''); }}
              className={`flex-1 py-2 rounded-lg transition text-center ${
                searchMode === 'mobile'
                  ? 'bg-white text-gurukul-navy shadow-sm font-black'
                  : 'hover:text-slate-900'
              }`}
            >
              By Registered Mobile &amp; DOB
            </button>
          </div>

          <form onSubmit={handleSearchSubmit} className="space-y-4">
            {searchMode === 'id' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Registration No / Application No *
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="e.g. GK26-10001 or NILB-00001"
                      className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-mono font-bold uppercase"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Provided on your payment confirmation receipt &amp; SMS
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Candidate Date of Birth (Optional for verification)
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Registered Mobile Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="10-digit mobile number"
                      className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Candidate Date of Birth *
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      type="date"
                      required
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gurukul-navy hover:bg-slate-800 disabled:opacity-50 text-white font-black text-xs rounded-xl transition shadow flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Searching Dossier...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 text-amber-400" />
                  <span>Track Application Status</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-rose-50 border-2 border-rose-200 text-rose-800 text-xs flex items-start gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block text-sm">Application Not Located</span>
              <p className="leading-relaxed">{error}</p>
              <p className="text-[11px] text-rose-600 pt-1">
                Need help? Call Gurukul Helpline: <strong>+91-1744-259114, 9896328329</strong>
              </p>
            </div>
          </div>
        )}

        {/* Tracking Details View */}
        {application && (
          <div className="space-y-6">

            {/* Candidate Dossier Header Banner */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-md space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-mono font-bold text-slate-500 uppercase">Registration ID:</span>
                    <span className="font-mono text-xl sm:text-2xl font-black text-gurukul-navy">
                      {application.registrationNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyId(application.registrationNumber)}
                      className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-gurukul-600 rounded-lg transition"
                      title="Copy Registration ID"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    Application Ref: <span className="font-mono font-bold text-slate-700">{application.applicationNumber}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                  <span className="px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-xs rounded-full">
                    {application.classApplying}
                  </span>
                  <div className={`px-3.5 py-1 rounded-full border text-xs font-extrabold flex items-center gap-1.5 ${getStatusBadge(application.status).style}`}>
                    <span className={`w-2 h-2 rounded-full ${getStatusBadge(application.status).dot}`} />
                    <span>{getStatusBadge(application.status).label}</span>
                  </div>
                </div>
              </div>

              {/* Dossier Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                  <span className="text-[11px] text-slate-400 font-semibold block">Candidate Name:</span>
                  <span className="font-bold text-slate-900 text-sm block truncate">{application.personalInfo.fullName}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                  <span className="text-[11px] text-slate-400 font-semibold block">Father's Name:</span>
                  <span className="font-bold text-slate-900 text-sm block truncate">{application.personalInfo.fatherName}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                  <span className="text-[11px] text-slate-400 font-semibold block">Campus Preference:</span>
                  <span className="font-bold text-gurukul-700 block truncate">{application.preferences.studyLocation}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                  <span className="text-[11px] text-slate-400 font-semibold block">Fee Status:</span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> ₹{application.amountPaid} Confirmed
                  </span>
                </div>
              </div>

              {/* Administrative Remarks Notice Box */}
              {application.remarks && (
                <div className={`p-4 rounded-2xl border text-xs space-y-1 ${
                  application.status === 'correction_needed'
                    ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                    : application.status === 'rejected'
                      ? 'bg-rose-50/80 border-rose-300 text-rose-950'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Administrative Note / Scrutiny Observation:</span>
                  </div>
                  <p className="leading-relaxed pl-5 font-medium">{application.remarks}</p>
                </div>
              )}

              {/* Action Buttons Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <div className="flex flex-wrap gap-2 text-xs">
                  {application.admitCard.available && application.admitCard.downloadUrl && (
                    <Link
                      href={application.admitCard.downloadUrl}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow transition flex items-center gap-1.5 animate-pulse"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Hall Ticket (Roll No: {application.admitCard.rollNumber})</span>
                    </Link>
                  )}

                  {application.result.declared && application.result.scorecardUrl && (
                    <Link
                      href={application.result.scorecardUrl}
                      className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-gurukul-navy font-extrabold rounded-xl shadow transition flex items-center gap-1.5"
                    >
                      <Award className="w-4 h-4" />
                      <span>View Result &amp; Scorecard</span>
                    </Link>
                  )}

                  <Link
                    href={`/admission-form?appId=${encodeURIComponent(application.registrationNumber)}`}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition flex items-center gap-1.5"
                  >
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span>Print Submitted Form</span>
                  </Link>
                </div>

                <Link
                  href="/"
                  className="px-5 py-2.5 bg-gurukul-navy hover:bg-slate-800 text-amber-300 font-extrabold text-xs rounded-xl shadow transition flex items-center gap-1.5"
                >
                  <span>Candidate Portal Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

            </div>

            {/* Detailed Progress Stepper / Lifecycle Timeline */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-md space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-gurukul-600" />
                  <h3 className="font-black text-base sm:text-lg text-gurukul-navy">
                    Application Milestone Progress
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  6 Key Examination Stages
                </span>
              </div>

              {/* Stepper Timeline */}
              <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                {application.milestones.map((milestone, idx) => {
                  const isCompleted = milestone.status === 'completed';
                  const isAction = milestone.status === 'action_needed';
                  const isRejected = milestone.status === 'rejected';
                  const isInProgress = milestone.status === 'in_progress';

                  return (
                    <div key={milestone.id} className="relative group">
                      {/* Stepper Dot */}
                      <div className={`absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] transition ${
                        isCompleted
                          ? 'bg-emerald-600 text-white shadow-sm ring-4 ring-emerald-100'
                          : isAction
                            ? 'bg-amber-500 text-white shadow-sm ring-4 ring-amber-100'
                            : isRejected
                              ? 'bg-rose-600 text-white ring-4 ring-rose-100'
                              : isInProgress
                                ? 'bg-blue-600 text-white ring-4 ring-blue-100 animate-pulse'
                                : 'bg-slate-200 text-slate-600'
                      }`}>
                        {isCompleted ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                      </div>

                      {/* Content Card */}
                      <div className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-2xl p-4 transition space-y-1.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <h4 className="font-extrabold text-xs sm:text-sm text-slate-900">
                            {milestone.title}
                          </h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full w-fit ${
                            isCompleted
                              ? 'bg-emerald-100 text-emerald-800'
                              : isAction
                                ? 'bg-amber-100 text-amber-900 font-black'
                                : isRejected
                                  ? 'bg-rose-100 text-rose-800 font-black'
                                  : isInProgress
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-slate-200 text-slate-600'
                          }`}>
                            {milestone.subtitle}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {milestone.details}
                        </p>
                        {milestone.date && (
                          <div className="text-[10px] font-mono text-slate-400 pt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" /> {milestone.date}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* Important Candidate Instructions Box */}
            <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-6 text-xs text-amber-950 space-y-2 shadow-sm">
              <h4 className="font-extrabold text-sm flex items-center gap-1.5 text-amber-900">
                <HelpCircle className="w-4 h-4 text-amber-700" />
                Information for Entrance Examination Candidates:
              </h4>
              <ul className="list-disc pl-5 space-y-1 text-amber-900/90 leading-relaxed">
                <li>Your official Gurukul Registration Number (<code>{application.registrationNumber}</code>) is permanent and must be quoted in all correspondence.</li>
                <li>Hall Tickets / Admit Cards must be printed in color along with candidate photograph and brought to the examination centre along with the student's original Aadhaar Card.</li>
                <li>Candidate reporting time on examination day is strictly 45 minutes prior to the commencement of the written test.</li>
              </ul>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
