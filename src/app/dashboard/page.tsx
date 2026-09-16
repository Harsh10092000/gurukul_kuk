'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  FileText,
  CreditCard,
  Clock,
  Download,
  CheckCircle2,
  AlertCircle,
  Printer,
  Award,
  Calendar,
  MapPin,
  User,
  ExternalLink,
  Phone,
  LogOut,
  BookmarkCheck,
  ArrowRight,
  Upload,
  X,
  Send,
  RefreshCw,
  FileCheck,
  XCircle,
  Info,
  ShieldCheck,
  HelpCircle,
  AlertTriangle,
  MessageSquare
} from 'lucide-react';
import { Application, AdmitCard, ExamResult } from '@/lib/types';
import ConfirmModal from '@/components/ConfirmModal';

export default function ApplicantDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [admitCard, setAdmitCard] = useState<AdmitCard | null>(null);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [draftSaved, setDraftSaved] = useState(false);

  // Rejection & Grievance State
  const [refillLoading, setRefillLoading] = useState(false);
  const [showQueryModal, setShowQueryModal] = useState(false);
  const [querySubject, setQuerySubject] = useState('Ground of Rejection Clarification');
  const [queryPhone, setQueryPhone] = useState('');
  const [queryText, setQueryText] = useState('');
  const [queryLoading, setQueryLoading] = useState(false);
  const [querySuccess, setQuerySuccess] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);

  // Document upload & resubmission state
  const [uploadedDocs, setUploadedDocs] = useState<{ [key: string]: string }>({});
  const [uploadedDocNames, setUploadedDocNames] = useState<{ [key: string]: string }>({});
  const [candidateClarification, setCandidateClarification] = useState('');
  const [revisedPersonal, setRevisedPersonal] = useState({
    fullName: '',
    dob: '',
    aadhaarNumber: '',
    category: 'General',
  });
  const [revisedAcademic, setRevisedAcademic] = useState({
    previousSchoolName: '',
    previousBoard: 'CBSE',
    previousClassMarksPercentage: '',
  });
  const [resubmitLoading, setResubmitLoading] = useState(false);
  const [resubmitMsg, setResubmitMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeResubmitTab, setActiveResubmitTab] = useState<'docs' | 'personal' | 'academic'>('docs');

  // Accessible centralized confirmation & notification modal state
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant?: 'warning' | 'danger' | 'info' | 'success';
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('draftSaved') === 'true') {
        setDraftSaved(true);
      }
    }

    // 1. Fetch current authenticated user & enforce strict Admin Role Guard
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((authData) => {
        if (!authData.user) {
          window.location.href = '/login';
          return;
        }

        // STRICT ROLE SEPARATION: Admin can NEVER access candidate dashboard!
        if (authData.user.role === 'admin') {
          window.location.href = '/admin/dashboard';
          return;
        }

        if (authData.user.isTemporary) {
          window.location.href = '/apply';
          return;
        }

        setCurrentUser(authData.user);
        const user = authData.user;

        // Purge any un-scoped legacy draft from shared browser storage
        try {
          localStorage.removeItem('gurukul_application_draft');
        } catch (e) { }

        // 2. Fetch candidate's own application
        fetch('/api/applications')
          .then((res) => res.json())
          .then(async (data) => {
            if (!data.application || data.application.paymentStatus !== 'completed') {
              window.location.href = '/apply';
              return;
            }

            setApplication(data.application);

            try {
              const admitRes = await fetch(`/api/admit-card?appId=${data.application.id}`);
              const admitData = await admitRes.json();
              if (admitData.admitCard) setAdmitCard(admitData.admitCard);
            } catch (admitErr) {
              console.warn('Admit card fetch notice:', admitErr);
            }

            try {
              const resRes = await fetch(`/api/results?appId=${data.application.id}`);
              const resData = await resRes.json();
              if (resData.result) setResult(resData.result);
            } catch (resErr) {
              console.warn('Result fetch notice:', resErr);
            }

            setLoading(false);
          })
          .catch((err) => {
            console.error('Applications loading error:', err);
            setLoading(false);
          });
      })
      .catch(() => {
        window.location.href = '/login';
      });
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, docKey: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setResubmitMsg({ type: 'error', text: 'Uploaded file must be under 5MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setUploadedDocs((prev) => ({ ...prev, [docKey]: base64 }));
      setUploadedDocNames((prev) => ({ ...prev, [docKey]: file.name }));
      setResubmitMsg({ type: 'success', text: `Selected "${file.name}" for upload.` });
    };
    reader.readAsDataURL(file);
  };

  const handleResubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!application) return;

    try {
      setResubmitLoading(true);
      setResubmitMsg(null);
      const res = await fetch(`/api/applications/${application.id}/resubmit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documents: Object.keys(uploadedDocs).length > 0 ? uploadedDocs : undefined,
          personalInfo: revisedPersonal,
          academicInfo: revisedAcademic,
          clarification: candidateClarification,
        }),
      });

      const data = await res.json();
      if (data.success && data.application) {
        setApplication(data.application);
        setResubmitMsg({
          type: 'success',
          text: 'Your revised details & documents have been successfully submitted to the Admission Committee for re-verification.',
        });
        setUploadedDocs({});
        setUploadedDocNames({});
        setCandidateClarification('');
      } else {
        setResubmitMsg({ type: 'error', text: data.error || 'Failed to submit revision' });
      }
    } catch (err: any) {
      setResubmitMsg({ type: 'error', text: 'Network error during resubmission. Please try again.' });
    } finally {
      setResubmitLoading(false);
    }
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

  const handleRefillApplication = () => {
    setModalState({
      isOpen: true,
      title: 'Refill Fresh Application?',
      message: 'Your previous rejected application details will be cleared and you can start a fresh application from Step 1.\n\nAre you sure you want to proceed?',
      variant: 'warning',
      confirmText: 'Start Fresh',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setModalState((prev) => ({ ...prev, isOpen: false }));
        setRefillLoading(true);
        try {
          const res = await fetch('/api/applications/refill', {
            method: 'POST',
          });
          const data = await res.json();
          if (data.success) {
            // Purge any local draft from storage
            try {
              if (currentUser?.id) {
                localStorage.removeItem(`gurukul_draft_${currentUser.id}`);
              }
              localStorage.removeItem('gurukul_application_draft');
            } catch { }

            // Redirect directly to Step 1 of fresh application
            window.location.href = '/apply?step=1&fresh=true';
          } else {
            setModalState({
              isOpen: true,
              title: 'Refill Failed',
              message: data.error || 'Failed to initiate application refill. Please try again.',
              variant: 'danger',
              confirmText: 'Dismiss',
              cancelText: '',
              onConfirm: () => setModalState((prev) => ({ ...prev, isOpen: false })),
            });
            setRefillLoading(false);
          }
        } catch {
          setModalState({
            isOpen: true,
            title: 'Connection Error',
            message: 'Network error while resetting application form. Please check your connection and try again.',
            variant: 'danger',
            confirmText: 'Dismiss',
            cancelText: '',
            onConfirm: () => setModalState((prev) => ({ ...prev, isOpen: false })),
          });
          setRefillLoading(false);
        }
      },
    });
  };

  const handleSubmitQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    setQueryError(null);

    const cleanPhone = (queryPhone || currentUser?.phone || '').replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setQueryError('Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).');
      return;
    }

    if (!queryText.trim() || queryText.trim().length < 10) {
      setQueryError('Please provide a detailed description (minimum 10 characters).');
      return;
    }

    setQueryLoading(true);
    try {
      const res = await fetch('/api/applications/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: querySubject,
          phone: cleanPhone,
          query: queryText.trim(),
          applicationNumber: application?.applicationNumber || application?.registrationNumber || '',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setQuerySuccess(true);
        setQueryText('');
      } else {
        setQueryError(data.error || 'Failed to submit grievance query.');
      }
    } catch {
      setQueryError('Network error while submitting query. Please try again.');
    } finally {
      setQueryLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Loading your entrance dashboard...</p>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="max-w-4xl mx-auto my-12 px-4 sm:px-6 space-y-8 font-sans">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-gurukul-navy to-gurukul-navyLight text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <span className="bg-amber-400 text-gurukul-navy text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider font-mono shadow-sm">
              Registered Candidate Account
            </span>
            <h1 className="text-2xl sm:text-3xl font-black">
              Welcome, {currentUser?.name || 'Candidate'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Gurukul Kurukshetra Online Entrance Examination Portal • Academic Session 2026-27
            </p>
          </div>
          <Link
            href="/apply"
            className="bg-amber-500 hover:bg-amber-600 text-gurukul-navy font-black text-xs px-6 py-3 rounded-xl shadow-lg transition flex items-center gap-2 flex-shrink-0"
          >
            <span>Start Online Application</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Application Start Prompt Card */}
        <div className="bg-white rounded-3xl border-2 border-slate-200 p-8 sm:p-12 text-center space-y-6 shadow-sm">
          <div className="w-20 h-20 mx-auto flex items-center justify-center bg-amber-50 rounded-2xl border border-amber-200">
            <Image src="/logo-gurukul.png" alt="Logo" width={64} height={64} className="brand-logo-img object-contain" />
          </div>
          <div className="max-w-lg mx-auto space-y-2">
            <h2 className="text-2xl font-black text-gurukul-navy">
              No Application Form Submitted Yet
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Dear <strong className="text-slate-900">{currentUser?.name || 'Applicant'}</strong>, your candidate account is active. Please complete your online admission application, upload verification documents, and pay the entrance fee to receive your permanent Registration Number and Admit Card.
            </p>
          </div>
          <div className="pt-2 flex justify-center">
            <Link
              href="/apply"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-gurukul-600 to-amber-600 hover:from-gurukul-700 hover:to-amber-700 text-white font-extrabold px-8 py-3.5 rounded-2xl shadow-lg hover:shadow-xl transition text-sm"
            >
              <span>Begin Application Form 2026-27</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // REJECTED APPLICATION VIEW: Strict NTA Examination Authority Model
  // When an application is rejected, ALL previous details and tabs are blocked.
  // Candidate sees ONLY the authoritative Rejection Screen & Modal Dialog with Refill and Raise Query options.
  if (application.status === 'rejected') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8 font-sans">
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-red-950 via-slate-900 to-red-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-red-800/40 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2 z-10">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="bg-red-500/90 text-white text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider font-mono shadow-sm flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5" />
                Admission Scrutiny Finding
              </span>
              <span className="bg-white/20 text-xs font-bold px-3 py-1 rounded-full font-mono">
                Ref: {application.applicationNumber || application.registrationNumber}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Application Dossier Disqualified
            </h1>
            <p className="text-xs sm:text-sm text-red-200">
              Gurukul Kurukshetra Online Entrance Examination Portal • Academic Session 2026-27
            </p>
          </div>

          <div className="z-10 flex gap-2">
            <button
              onClick={() => {
                fetch('/api/auth/logout', { method: 'POST' }).then(() => {
                  window.location.href = '/login';
                });
              }}
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 border border-white/20"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Authoritative NTA Rejection Modal Card */}
        <div className="bg-white rounded-3xl border-2 border-red-200 shadow-xl overflow-hidden">
          {/* Official Red Header Band */}
          <div className="bg-red-600 text-white p-5 sm:p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/30 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-7 h-7 text-amber-300" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-red-200 font-extrabold">
                Central Examination & Scrutiny Board
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-wide">
                APPLICATION FORM REJECTED / DISQUALIFIED
              </h2>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Candidate summary details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Candidate Name</span>
                <strong className="text-slate-900">{application.personalInfo?.fullName || currentUser?.name || 'Candidate'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Application No</span>
                <strong className="font-mono text-gurukul-navy">{application.applicationNumber || application.registrationNumber}</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Class Applied</span>
                <strong className="text-slate-900">{application.classApplying}</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Decision Status</span>
                <span className="inline-block text-[11px] font-extrabold text-red-700 bg-red-100 px-2 py-0.5 rounded-md">
                  REJECTED
                </span>
              </div>
            </div>

            {/* Official Ground of Rejection Alert Box */}
            <div className="bg-red-50/90 border-2 border-red-300 rounded-2xl p-5 sm:p-6 space-y-2">
              <div className="flex items-center gap-2 text-red-900 font-black text-xs uppercase tracking-wider">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span>Official Committee Remarks / Ground for Rejection:</span>
              </div>
              <div className="text-sm font-bold text-red-950 bg-white p-4 rounded-xl border border-red-200 leading-relaxed font-sans">
                &ldquo;{application.remarks || 'Application does not meet the prescribed age criteria, minimum qualifying eligibility, or documentation standards.'}&rdquo;
              </div>
            </div>

            {/* Official NTA Policy Disclaimer */}
            <div className="bg-slate-50 border-l-4 border-gurukul-navy rounded-r-2xl p-4 text-xs text-slate-600 space-y-2">
              <p className="font-bold text-slate-800">
                Important Regulatory Notice (Admission Session 2026-27):
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-600 leading-relaxed">
                <li>All particulars, documents, and records linked with this submission have been officially annulled.</li>
                <li>No Admit Card or Examination Roll Number will be generated for this rejected dossier.</li>
                <li>You may <strong>Refill a Fresh Application Form</strong> with correct details before the deadline, or submit an official Grievance if you believe this decision requires review.</li>
              </ul>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button
                onClick={handleRefillApplication}
                disabled={refillLoading}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-sm px-6 py-4 rounded-2xl shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2.5 disabled:opacity-50"
              >
                {refillLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Purging Old Record & Preparing Fresh Form...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Refill Fresh Application Form</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  if (!queryPhone && currentUser?.phone) {
                    setQueryPhone(currentUser.phone.replace(/\D/g, '').slice(-10));
                  }
                  setShowQueryModal(true);
                }}
                className="bg-white hover:bg-slate-50 text-gurukul-navy font-black text-sm px-6 py-4 rounded-2xl border-2 border-slate-300 shadow-sm transition flex items-center justify-center gap-2"
              >
                <HelpCircle className="w-4 h-4 text-gurukul-600" />
                <span>Raise Query / Grievance to Helpdesk</span>
              </button>
            </div>
          </div>

          {/* Helpdesk Contact Footer */}
          <div className="bg-slate-100 p-4 px-6 border-t border-slate-200 text-center text-xs text-slate-600 flex flex-wrap justify-between items-center gap-2">
            <span>Admission Helpdesk: <strong>+91-1744-259114 / 9896328329</strong></span>
            <span>Official Email: <strong>admissions@gurukulkurukshetra.com</strong></span>
          </div>
        </div>

        {/* Grievance Submission Modal */}
        {showQueryModal && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gurukul-600 bg-amber-50 px-2.5 py-0.5 rounded-full">
                    Grievance Redressal Mechanism
                  </span>
                  <h3 className="text-lg font-black text-gurukul-navy mt-1">
                    Submit Candidate Query / Grievance
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowQueryModal(false);
                    setQuerySuccess(false);
                    setQueryError(null);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {querySuccess ? (
                <div className="p-6 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-center space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                  <h4 className="text-base font-black text-emerald-950">
                    Grievance Lodged Successfully!
                  </h4>
                  <p className="text-xs text-emerald-800 leading-relaxed max-w-sm mx-auto">
                    Your query has been assigned to the Examination Controller. An update will be communicated to your registered mobile number and email.
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        setShowQueryModal(false);
                        setQuerySuccess(false);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition shadow-sm"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitQuery} className="space-y-4 text-xs">
                  {queryError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl font-bold">
                      {queryError}
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Query Subject / Category
                    </label>
                    <select
                      value={querySubject}
                      onChange={(e) => setQuerySubject(e.target.value)}
                      className="w-full border rounded-xl p-2.5 font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="Ground of Rejection Clarification">Ground of Rejection Clarification</option>
                      <option value="Document Resubmission Permission">Document Resubmission Permission</option>
                      <option value="Eligibility Criteria Review">Eligibility Criteria Review</option>
                      <option value="Technical Error During Form Submission">Technical Error During Form Submission</option>
                      <option value="Other Admission Query">Other Admission Query</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block font-bold text-slate-700">
                        Contact Mobile Number <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[10px] font-mono text-slate-400">
                        {queryPhone.length}/10 digits
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 font-bold text-slate-400 select-none text-xs">
                        +91
                      </span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        pattern="[6-9][0-9]{9}"
                        maxLength={10}
                        value={queryPhone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setQueryPhone(val);
                        }}
                        placeholder="9876543210"
                        className="w-full border rounded-xl pl-12 pr-3 py-2.5 font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500 font-mono text-xs tracking-wider"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Enter 10-digit mobile number (numbers only, starts with 6, 7, 8, or 9)
                    </p>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Detailed Query / Clarification <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={4}
                      value={queryText}
                      onChange={(e) => setQueryText(e.target.value)}
                      placeholder="Please explain in detail why you believe your application should be reviewed or what clarification you need from the committee..."
                      className="w-full border rounded-xl p-3 font-normal text-slate-800 outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowQueryModal(false)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={queryLoading}
                      className="bg-gurukul-navy hover:bg-slate-900 text-white font-extrabold px-6 py-2.5 rounded-xl transition flex items-center gap-2 disabled:opacity-50"
                    >
                      {queryLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5 text-amber-400" />
                          <span>Submit Grievance</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // DRAFT APPLICATION VIEW: When user saved as draft
  if (application.status === 'draft') {
    const completedStep = application.currentStep || 1;
    const resumeStep = Math.min(completedStep < 7 ? completedStep + 1 : 7, 7);
    const formSteps = [
      { num: 1, title: 'Personal Particulars', desc: 'Candidate name, DOB, Aadhaar & category' },
      { num: 2, title: 'Parent & Guardian Details', desc: 'Father & Mother particulars, mobile & income' },
      { num: 3, title: 'Residential Address', desc: 'Permanent street address, State, District & PIN' },
      { num: 4, title: 'Academic History', desc: 'Previous school, board, marks & class sought' },
      { num: 5, title: 'Exam Centre Preferences', desc: '1st & 2nd choice entrance examination centre' },
      { num: 6, title: 'Documents & Photographs', desc: 'Photo, signature & Aadhaar card copy' },
      { num: 7, title: 'Fee Payment & Submission', desc: 'Review application & complete fee payment' },
    ];
    const progressPct = Math.min(Math.round((completedStep / 7) * 100), 100);

    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-gurukul-navy to-gurukul-navyLight text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3 z-10">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="bg-amber-400 text-gurukul-navy text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider font-mono shadow-sm">
                Application Draft • Step {completedStep} of 7 Completed
              </span>
              <span className="bg-white/20 text-xs font-bold px-3 py-1 rounded-full">
                Class: {application.classApplying}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black">
              Welcome, {currentUser?.name || application.personalInfo?.fullName || 'Candidate'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Gurukul Kurukshetra Online Entrance Examination Portal • Academic Session 2026-27
            </p>
          </div>

          <div className="z-10 flex flex-wrap gap-3 items-center">
            <Link
              href={`/apply?step=${resumeStep}`}
              className="bg-amber-500 hover:bg-amber-600 text-gurukul-navy font-black text-xs px-5 py-2.5 rounded-xl shadow-lg transition flex items-center gap-1.5"
            >
              <span>Continue Filling Form</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Draft Alert Notification */}
        {draftSaved && (
          <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 flex items-center gap-3 shadow-sm">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            <div>
              <h4 className="font-extrabold text-sm">Application Draft Preserved Successfully!</h4>
              <p className="text-xs text-emerald-800">
                All details entered up to Step {completedStep} have been safely stored. You can resume filling right where you left off.
              </p>
            </div>
          </div>
        )}

        {/* Hero Resume Card with Progress Bar */}
        <div className="bg-gradient-to-br from-amber-50/80 via-white to-orange-50/50 border-2 border-amber-300 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                <BookmarkCheck className="w-4 h-4 text-amber-600" />
                Draft Status: In Progress
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                Step {completedStep} of 7 Completed ({progressPct}%)
              </h2>
              <p className="text-xs text-slate-600">
                Continue your application form to select examination centres, upload verification documents, and complete fee payment.
              </p>
            </div>

            <Link
              href={`/apply?step=${resumeStep}`}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-gurukul-600 to-amber-600 hover:from-gurukul-700 hover:to-amber-700 text-white font-extrabold text-sm px-6 py-3.5 rounded-2xl shadow-lg hover:shadow-xl transition flex-shrink-0"
            >
              <span>Continue Filling Application Form</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Visual Progress Bar */}
          <div className="space-y-2">
            <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden p-0.5">
              <div
                className="bg-gradient-to-r from-amber-500 via-amber-600 to-emerald-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-bold text-slate-500">
              <span>Step 1: Personal Particulars</span>
              <span>Step 4: Academics</span>
              <span>Step 7: Payment & Submission</span>
            </div>
          </div>
        </div>

        {/* 7-Step Progress Roadmap */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
            <Clock className="w-4 h-4 text-gurukul-600" /> Application Steps Roadmap
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {formSteps.map((fs) => {
              const isDone = fs.num <= completedStep;
              const isCurrent = fs.num === resumeStep;
              return (
                <div
                  key={fs.num}
                  className={`p-4 rounded-xl border transition flex flex-col justify-between ${isDone
                    ? 'bg-emerald-50/40 border-emerald-300 text-emerald-950'
                    : isCurrent
                      ? 'bg-amber-50/70 border-amber-300 text-amber-950 ring-2 ring-amber-400/40'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider font-mono">
                        Step {fs.num}
                      </span>
                      {isDone ? (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Completed
                        </span>
                      ) : isCurrent ? (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                          Current
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Pending</span>
                      )}
                    </div>
                    <h4 className="font-bold text-xs text-slate-900">{fs.title}</h4>
                    <p className="text-[11px] text-slate-500 leading-snug">{fs.desc}</p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-200/60">
                    <Link
                      href={`/apply?step=${fs.num}`}
                      className={`text-xs font-bold flex items-center gap-1 hover:underline ${isDone ? 'text-emerald-700' : isCurrent ? 'text-amber-700' : 'text-slate-600'
                        }`}
                    >
                      <span>{isDone ? 'Review / Edit' : 'Fill this step'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Draft Particulars Dossier Overview */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-gurukul-600" /> Saved Draft Particulars
            </h3>
            <Link
              href={`/apply?step=${resumeStep}`}
              className="text-xs font-bold text-gurukul-600 hover:text-gurukul-700 flex items-center gap-1"
            >
              <span>Continue Filling Form</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block">Candidate Name:</span>
              <span className="font-bold text-slate-900">{application.personalInfo?.fullName || 'Not Filled'}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Applying Class:</span>
              <span className="font-bold text-gurukul-700 bg-amber-50 px-2 py-0.5 rounded inline-block">{application.classApplying}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Aadhaar Card:</span>
              <span className="font-mono font-bold text-slate-900">{application.personalInfo?.aadhaarNumber || 'Not Filled'}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Father&apos;s Full Name:</span>
              <span className="font-bold text-slate-900">{application.parentInfo?.fatherName || 'Not Filled'}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Father&apos;s Mobile:</span>
              <span className="font-mono font-bold text-slate-900">{application.parentInfo?.fatherPhone || 'Not Filled'}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Mother&apos;s Full Name:</span>
              <span className="font-bold text-slate-900">{application.parentInfo?.motherName || 'Not Filled'}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Annual Income:</span>
              <span className="font-bold text-slate-900">{application.parentInfo?.annualIncome || 'Not Selected'}</span>
            </div>
            <div>
              <span className="text-slate-400 block">City & State:</span>
              <span className="font-bold text-slate-900">
                {application.addressInfo?.city ? `${application.addressInfo.city}, ${application.addressInfo.state}` : 'Not Filled'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const steps = [
    { label: 'Registration & ₹800 Fee Paid', completed: true, current: false },
    { label: 'Official Admission Form Ready', completed: true, current: false },
    {
      label: 'Admit Card Generation',
      completed: !!admitCard && admitCard.isReleased,
      current: !admitCard || !admitCard.isReleased,
    },
    {
      label: 'Written Entrance Exam',
      completed: !!result,
      current: !!admitCard?.isReleased && !result,
    },
    {
      label: 'Result & Merit Scorecard',
      completed: !!result?.isPublished,
      current: false,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Top Welcome Header */}
      <div className="bg-gradient-to-r from-gurukul-navy to-gurukul-navyLight text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-3 z-10">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="bg-amber-500 text-gurukul-navy text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider font-mono shadow-sm">
              Registration ID: {application.registrationNumber || application.applicationNumber}
            </span>
            <span className="bg-white/20 text-xs font-bold px-3 py-1 rounded-full">
              Class: {application.classApplying}{application.stream ? ` (${application.stream})` : ''}
            </span>
            {admitCard?.rollNumber && (
              <span className="bg-slate-900/80 text-amber-300 text-[11px] font-semibold px-3 py-1 rounded-full border border-amber-400/30">
                Roll No: {admitCard.rollNumber}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">
            Welcome, {currentUser?.name || application.personalInfo?.fullName || 'Candidate'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            GURUKUL Online Entrance Examination Portal • Session 2026-27
          </p>
        </div>

        <div className="z-10 flex flex-wrap gap-3 items-center">
          <Link
            href="/admission-form"
            className="bg-gurukul-navy hover:bg-slate-800 text-amber-300 font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-lg transition flex items-center gap-1.5 border border-amber-400/40"
            title="Download / Print Official Admission Verification & Enrolment Form"
          >
            <Printer className="w-4 h-4" />
            <span>Admission Form</span>
          </Link>

          {admitCard && admitCard.isReleased && (
            <Link
              href="/admit-card"
              className="bg-amber-500 hover:bg-amber-600 text-gurukul-navy font-black text-xs px-5 py-2.5 rounded-xl shadow-lg transition flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Download Admit Card</span>
            </Link>
          )}

          {result?.isPublished && (
            <Link
              href="/result"
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-lg transition flex items-center gap-1.5"
            >
              <Award className="w-4 h-4" />
              <span>View Scorecard</span>
            </Link>
          )}
        </div>
      </div>

      {/* Resubmission / Action Alert Messages */}
      {resubmitMsg && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-sm transition ${resubmitMsg.type === 'success'
            ? 'bg-emerald-50 border-2 border-emerald-300 text-emerald-950'
            : 'bg-red-50 border-2 border-red-300 text-red-950'
            }`}
        >
          <div className="flex items-center gap-2.5">
            {resubmitMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <span>{resubmitMsg.text}</span>
          </div>
          <button
            onClick={() => setResubmitMsg(null)}
            className="text-slate-400 hover:text-slate-700 ml-4"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Status Notification Banner: Approved */}
      {application.status === 'approved' && (
        <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-50 to-teal-50 border-2 border-emerald-400 rounded-3xl p-6 sm:p-7 shadow-sm flex items-start gap-3.5">
          <div className="p-2.5 bg-emerald-500 text-white rounded-2xl shadow-sm flex-shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <span className="bg-emerald-100 text-emerald-950 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-emerald-300 font-mono">
              Admission Scrutiny Status • Approved
            </span>
            <h3 className="text-lg font-black text-emerald-950 mt-1">
              🎉 Application Dossier Approved &amp; Verified!
            </h3>
            <p className="text-xs text-emerald-800 mt-0.5 max-w-2xl leading-relaxed">
              The Central Admissions Committee has officially verified and approved your credentials for <strong>{application.classApplying}</strong>.
              {application.remarks && (
                <span className="block mt-1.5 font-medium italic text-emerald-900 bg-white/70 px-3 py-1.5 rounded-lg border border-emerald-200/80">
                  &ldquo;{application.remarks}&rdquo;
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Application Status Timeline Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-6 flex items-center gap-2">
          <Clock className="w-4 h-4 text-gurukul-600" />
          Application Progress Tracker
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative">
          {steps.map((st, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border text-left transition ${st.completed
                ? 'bg-emerald-50/50 border-emerald-300 text-emerald-950'
                : st.current
                  ? 'bg-amber-50 border-amber-300 text-amber-950 ring-2 ring-amber-400/40'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold uppercase">Step 0{idx + 1}</span>
                {st.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-slate-300" />
                )}
              </div>
              <h4 className="font-bold text-xs leading-snug">{st.label}</h4>
              <span className="text-[10px] mt-1 block">
                {st.completed ? 'Completed' : st.current ? 'In Progress' : 'Pending'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Grid of Details & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Application Dossier */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-gurukul-600" /> Candidate Dossier Summary
              </h3>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800">
                Status: REGISTERED (FEE PAID)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block">Registration ID:</span>
                <span className="font-mono font-black text-amber-700 text-sm">
                  {application.registrationNumber || application.applicationNumber}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Class Seeking Admission:</span>
                <span className="font-bold text-slate-900">
                  Class {application.classApplying}{application.stream ? ` (${application.stream})` : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Application Fee (₹800):</span>
                <span className="font-bold text-emerald-700">PAID (CONFIRMED)</span>
              </div>

              <div>
                <span className="text-slate-400 block">Candidate Name:</span>
                <span className="font-bold text-slate-900">{application.personalInfo?.fullName}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Date of Birth:</span>
                <span className="font-bold text-slate-900">{formatDob(application.personalInfo?.dob)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Gender / Category:</span>
                <span className="font-bold text-slate-900">
                  {application.personalInfo?.gender} ({application.personalInfo?.category || 'General'})
                </span>
              </div>

              <div>
                <span className="text-slate-400 block">Aadhaar Number:</span>
                <span className="font-mono font-bold text-slate-900">{application.personalInfo?.aadhaarNumber || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block"> PEN:</span>
                <span className="font-mono font-bold text-slate-900">{application.personalInfo?.panNumber || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Family ID:</span>
                <span className="font-mono font-bold text-slate-900">{application.personalInfo?.familyId || '—'}</span>
              </div>

              <div>
                <span className="text-slate-400 block">Father&apos;s Name:</span>
                <span className="font-bold text-slate-900">{application.parentInfo?.fatherName}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Mother&apos;s Name:</span>
                <span className="font-bold text-slate-900">{application.parentInfo?.motherName}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Registered Phone:</span>
                <span className="font-bold text-slate-900">{application.parentInfo?.fatherPhone || application.personalInfo?.candidateMobile}</span>
              </div>

              <div>
                <span className="text-slate-400 block">1st Study Location Preference:</span>
                <span className="font-bold text-gurukul-navy">{application.studyLocation?.firstPreference || 'Gurukul Nilokheri'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">2nd Study Location Preference:</span>
                <span className="font-semibold text-slate-700">{application.studyLocation?.secondPreference || 'None'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Payment Reference:</span>
                <span className="font-mono text-[11px] text-slate-600 truncate block">{application.paymentInfo?.transactionId || 'CONFIRMED'}</span>
              </div>

              <div className="sm:col-span-3">
                <span className="text-slate-400 block">Residential Address:</span>
                <span className="font-medium text-slate-800">
                  {application.addressInfo?.streetAddress}, {application.addressInfo?.district}, {application.addressInfo?.state} - {application.addressInfo?.pincode}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <span className="font-bold text-slate-800 block text-xs">Official Admission & Enrolment Form (A4)</span>
                <span className="text-[11px] text-slate-500">
                  Available immediately for download. Print and bring along with Admit Card on examination day.
                </span>
              </div>
              <Link
                href="/admission-form"
                className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-black text-amber-300 font-bold px-4 py-2 rounded-xl text-xs transition border border-amber-400/30"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Admission Form</span>
              </Link>
            </div>
          </div>

          {/* Quick Admit Card Alert if ready */}
          {admitCard && admitCard.isReleased && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <span className="bg-amber-200 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                  Roll No: {admitCard.rollNumber}
                </span>
                <h4 className="font-black text-slate-900 text-base">
                  Entrance Examination Admit Card Issued
                </h4>
                <p className="text-xs text-slate-600">
                  Venue: <strong>{admitCard.examCentreName}</strong> | Date: <strong>{admitCard.examDate}</strong> ({admitCard.reportingTime})
                </p>
              </div>

              <Link
                href="/admit-card"
                className="bg-gurukul-600 hover:bg-gurukul-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow transition flex items-center gap-1.5 flex-shrink-0"
              >
                <Printer className="w-4 h-4" />
                <span>Print Hall Ticket</span>
              </Link>
            </div>
          )}
        </div>

        {/* Right 1 Col: Fee Payment Receipt & Helpline */}
        <div className="space-y-6">
          {/* Payment Receipt */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
              <CreditCard className="w-4 h-4 text-emerald-600" /> Fee Payment Receipt
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Status:</span>
                <span className="font-bold text-emerald-600 uppercase flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Paid & Verified
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid:</span>
                <span className="font-mono font-bold text-slate-900">₹{application.amountPaid || 1200}.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction Ref:</span>
                <span className="font-mono text-slate-700 text-[11px]">{application.transactionId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Gateway:</span>
                <span className="text-slate-700">Razorpay Secure Online</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Submission Date:</span>
                <span className="text-slate-700">{new Date(application.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Helpline Box */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md space-y-3">
            <h4 className="font-bold text-sm text-amber-400 flex items-center gap-2">
              <Phone className="w-4 h-4" /> Admission Helpdesk
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Have questions regarding document verification, syllabus, or exam centres? Contact the Gurukul Kurukshetra Examination Cell.
            </p>
            <div className="pt-2 text-xs space-y-1 font-mono text-amber-200">
              <div>+91-1744-259114</div>
              <div>+91-9896328329</div>
            </div>
          </div>
        </div>
      </div>

      {/* Accessible Centralized Modal */}
      <ConfirmModal
        isOpen={modalState.isOpen}
        title={modalState.title}
        message={modalState.message}
        variant={modalState.variant}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        onConfirm={modalState.onConfirm}
        onCancel={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
