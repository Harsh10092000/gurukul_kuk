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
  Phone,
  BookmarkCheck,
  X
} from 'lucide-react';
import { Application, AdmitCard, ExamResult } from '@/lib/types';
import ConfirmModal from '@/components/ConfirmModal';

export default function ApplicantDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [admitCard, setAdmitCard] = useState<AdmitCard | null>(null);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [resultsDeclared, setResultsDeclared] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [draftSaved, setDraftSaved] = useState(false);

  // Resubmission State
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

  // Modal State
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

    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((authData) => {
        if (!authData.user) {
          window.location.href = '/login';
          return;
        }

        if (authData.user.role === 'admin') {
          window.location.href = '/admin/dashboard';
          return;
        }

        if (authData.user.isTemporary) {
          window.location.href = '/apply';
          return;
        }

        setCurrentUser(authData.user);

        try {
          localStorage.removeItem('gurukul_application_draft');
        } catch (e) { }

        fetch('/api/applications')
          .then((res) => res.json())
          .then(async (data) => {
            if (!data.application || data.application.paymentStatus !== 'completed') {
              window.location.href = '/apply';
              return;
            }

            setApplication(data.application);
            await syncDashboardData(data.application.id);
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

  const syncDashboardData = async (targetAppId?: string) => {
    const appId = targetAppId || application?.id;
    if (!appId) return;

    try {
      const [settingsRes, statusRes, admitRes, resultRes] = await Promise.allSettled([
        fetch('/api/settings').then((r) => r.json()),
        fetch('/api/results/status').then((r) => r.json()),
        fetch(`/api/admit-card?appId=${appId}`).then((r) => r.json()),
        fetch(`/api/results?appId=${appId}`).then((r) => r.json()),
      ]);

      if (settingsRes.status === 'fulfilled' && settingsRes.value?.settings) {
        setSettings(settingsRes.value.settings);
      }
      if (statusRes.status === 'fulfilled' && typeof statusRes.value?.resultsDeclared === 'boolean') {
        setResultsDeclared(statusRes.value.resultsDeclared);
      }
      if (admitRes.status === 'fulfilled' && admitRes.value?.admitCard) {
        setAdmitCard(admitRes.value.admitCard);
      }
      if (resultRes.status === 'fulfilled' && resultRes.value?.result) {
        setResult(resultRes.value.result);
      }
    } catch (syncErr) {
      console.warn('Dashboard synchronization notice:', syncErr);
    }
  };

  // Real-time synchronization whenever admin changes status in admin portal
  useEffect(() => {
    if (!application?.id) return;

    const interval = setInterval(() => {
      syncDashboardData(application.id);
    }, 6000);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        syncDashboardData(application.id);
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [application?.id]);

  const formatDob = (dobStr?: string) => {
    if (!dobStr) return '—';
    const s = dobStr.trim();
    const match = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      return `${match[3]}-${match[2]}-${match[1]}`;
    }
    return s;
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-portal-navy border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Loading candidate portal...</p>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="max-w-4xl mx-auto my-12 px-4 space-y-6">
        <div className="bg-portal-navy text-white rounded-xl p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <span className="bg-slate-800 text-slate-300 text-xs font-semibold px-2.5 py-0.5 rounded uppercase tracking-wider">
              Candidate Account
            </span>
            <h1 className="text-xl sm:text-2xl font-bold">
              Welcome, {currentUser?.name || 'Candidate'}
            </h1>
            <p className="text-xs text-slate-300">
              Gurukul Kurukshetra Online Entrance Examination Portal • Session 2027-28
            </p>
          </div>
          <Link
            href="/apply"
            className="btn-accent text-xs px-4 py-2 flex-shrink-0"
          >
            Start Online Application
          </Link>
        </div>

        <div className="portal-card p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto flex items-center justify-center bg-slate-100 rounded-full border border-slate-200">
            <Image src="/logo-gurukul.png" alt="Logo" width={48} height={48} className="object-contain" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-lg font-bold text-slate-900">
              No Admission Form Submitted Yet
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Dear <strong className="text-slate-900">{currentUser?.name || 'Applicant'}</strong>, your candidate account is active. Please complete your online admission application, upload verification documents, and pay the entrance fee to receive your permanent Registration Number and Admit Card.
            </p>
          </div>
          <div className="pt-2 flex justify-center">
            <Link
              href="/apply"
              className="btn-primary text-xs px-6 py-2.5"
            >
              Begin Admission Form 2027-28
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // DRAFT APPLICATION VIEW
  if (application.status === 'draft') {
    const completedStep = application.currentStep || 1;
    const resumeStep = Math.min(completedStep < 7 ? completedStep + 1 : 7, 7);
    const formSteps = [
      { num: 1, title: 'Instructions & Advisory', desc: 'Eligibility rules and candidate undertaking' },
      { num: 2, title: 'Candidate Details', desc: 'Name, DOB, Aadhaar number & category' },
      { num: 3, title: 'Parent Particulars', desc: 'Father & Mother details, mobile & income' },
      { num: 4, title: 'Address & Contact', desc: 'Permanent street address, State, District & PIN' },
      { num: 5, title: 'Campus Preference', desc: '1st and 2nd preferred study locations' },
      { num: 6, title: 'Upload Documents', desc: 'Photo, signature, parent signature & Aadhaar' },
      { num: 7, title: 'Review & Payment', desc: 'Review particulars & complete ₹800 fee payment' },
    ];
    const progressPct = Math.min(Math.round((completedStep / 7) * 100), 100);

    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Top Header */}
        <div className="bg-portal-navy text-white rounded-xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-amber-500 text-slate-900 text-xs font-bold px-2.5 py-0.5 rounded uppercase tracking-wider">
                Draft • Step {completedStep} of 7
              </span>
              <span className="bg-slate-800 text-slate-300 text-xs px-2.5 py-0.5 rounded">
                Class: {application.classApplying}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold">
              Welcome, {currentUser?.name || application.personalInfo?.fullName || 'Candidate'}
            </h1>
            <p className="text-xs text-slate-300">
              Online Entrance Application • Session 2027-28
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/apply?step=${resumeStep}`}
              className="btn-accent text-xs px-4 py-2"
            >
              Continue Application
            </Link>
          </div>
        </div>

        {draftSaved && (
          <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2.5 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <div>
              <strong>Application Saved:</strong> Details entered up to Step {completedStep} are securely stored. You can resume anytime.
            </div>
          </div>
        )}

        {/* Progress Overview Card */}
        <div className="portal-card p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Application Progress
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Step {completedStep} of 7 Completed ({progressPct}%)
              </h2>
            </div>
            <Link
              href={`/apply?step=${resumeStep}`}
              className="btn-primary text-xs px-4 py-2 self-start sm:self-auto"
            >
              Resume Form
            </Link>
          </div>

          <div className="space-y-1.5">
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-portal-navy h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Step 1: Instructions</span>
              <span>Step 4: Address</span>
              <span>Step 7: Payment</span>
            </div>
          </div>
        </div>

        {/* 7 Steps Roadmap */}
        <div className="portal-card p-6 space-y-4">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
            Application Roadmap
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {formSteps.map((fs) => {
              const isDone = fs.num <= completedStep;
              const isCurrent = fs.num === resumeStep;
              return (
                <div
                  key={fs.num}
                  className={`p-3.5 rounded-lg border text-left flex flex-col justify-between ${isDone
                    ? 'bg-emerald-50/50 border-emerald-200 text-slate-800'
                    : isCurrent
                      ? 'bg-white border-portal-navy ring-1 ring-portal-navy text-slate-900'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-semibold uppercase">Step {fs.num}</span>
                      {isDone ? (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                          Done
                        </span>
                      ) : isCurrent ? (
                        <span className="text-[10px] font-semibold text-portal-navy bg-slate-100 px-1.5 py-0.5 rounded">
                          Current
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Pending</span>
                      )}
                    </div>
                    <h4 className="font-semibold text-xs text-slate-900">{fs.title}</h4>
                    <p className="text-[11px] text-slate-500 leading-snug">{fs.desc}</p>
                  </div>

                  <div className="pt-2 mt-2 border-t border-slate-100">
                    <Link
                      href={`/apply?step=${fs.num}`}
                      className="text-xs font-medium text-portal-navy hover:underline"
                    >
                      {isDone ? 'Review' : 'Fill'}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Saved Particulars Overview */}
        <div className="portal-card p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm">
              Saved Draft Particulars
            </h3>
            <Link
              href={`/apply?step=${resumeStep}`}
              className="text-xs font-semibold text-portal-navy hover:underline"
            >
              Continue Filling
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">Candidate Name</span>
              <span className="font-semibold text-slate-900">{application.personalInfo?.fullName || '—'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Applying Class</span>
              <span className="font-semibold text-portal-navy">{application.classApplying}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Aadhaar Number</span>
              <span className="font-mono text-slate-900">{application.personalInfo?.aadhaarNumber || '—'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Father&apos;s Name</span>
              <span className="font-semibold text-slate-900">{application.parentInfo?.fatherName || '—'}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // SUBMITTED & CONFIRMED APPLICATION VIEW
  const isAdmitCardReleased = Boolean(
    (admitCard && admitCard.isReleased) || settings?.admitCardsReleased === true
  );

  const isResultDeclared = Boolean(
    (result && result.isPublished) || resultsDeclared || settings?.resultsDeclared === true
  );

  const steps = [
    { label: 'Registration & ₹800 Fee', sublabel: 'Fee Confirmed', completed: true, current: false },
    {
      label: 'Application Verification',
      sublabel: application.status === 'rejected' ? 'Application Rejected' : 'Dossier Verified',
      completed: application.status !== 'rejected',
      current: false,
    },
    {
      label: 'Admit Card Generation',
      sublabel: isAdmitCardReleased ? 'Released & Ready' : 'Admit Card: In Progress',
      completed: isAdmitCardReleased,
      current: !isAdmitCardReleased,
    },
    {
      label: 'Written Entrance Exam',
      sublabel: isResultDeclared
        ? 'Exam Concluded'
        : admitCard?.examDate
        ? `${admitCard.examDate}`
        : 'Date Scheduled',
      completed: isResultDeclared,
      current: isAdmitCardReleased && !isResultDeclared,
    },
    {
      label: 'Result & Selection',
      sublabel: result?.qualifyingStatus
        ? result.qualifyingStatus
        : isResultDeclared
        ? 'Result Declared'
        : 'Evaluation Pending',
      completed: isResultDeclared && Boolean(result?.isPublished),
      current: isResultDeclared && !result?.isPublished,
    },
  ];

  const candidateInitials = (application.personalInfo?.fullName || currentUser?.name || 'GK')
    .split(' ')
    .map((n: string) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 font-sans">
      {/* Top Welcome Hero Banner */}
      <div className="portal-card-navy p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-start sm:items-center gap-4 sm:gap-5">
          {/* Avatar Monogram */}
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-xl sm:text-2xl flex items-center justify-center shadow-md flex-shrink-0 ring-4 ring-white/10">
            {candidateInitials}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-bold px-3 py-0.5 rounded-full font-mono">
                Reg ID: {application.registrationNumber || application.applicationNumber}
              </span>
              <span className="bg-white/10 text-slate-200 border border-white/15 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                Class {application.classApplying}{application.stream ? ` (${application.stream})` : ''}
              </span>
              {admitCard?.rollNumber && (
                <span className="bg-amber-500/30 text-amber-200 border border-amber-400/40 text-xs font-bold px-2.5 py-0.5 rounded-full font-mono">
                  Roll No: {admitCard.rollNumber}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-3xl font-black tracking-tight text-white">
              Welcome, {currentUser?.name || application.personalInfo?.fullName || 'Candidate'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              Entrance Examination &amp; Admission Portal • Session 2027-28
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5 items-center self-stretch sm:self-auto justify-start sm:justify-end border-t sm:border-t-0 border-white/10 pt-4 sm:pt-0">
          {isAdmitCardReleased && (
            <Link
              href="/admit-card"
              className="btn-accent text-xs h-10 px-4 font-bold flex items-center gap-2 shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Download Admit Card</span>
            </Link>
          )}

          {isResultDeclared && (
            <Link
              href={`/result?rollNo=${encodeURIComponent(admitCard?.rollNumber || application.rollNumber || application.registrationNumber || '')}&dob=${encodeURIComponent(application.personalInfo?.dob || '')}`}
              className="btn-primary text-xs h-10 px-4 flex items-center gap-2 border border-white/20 shadow-sm"
            >
              <Award className="w-4 h-4 text-amber-400" />
              <span>View Declared Result</span>
            </Link>
          )}
        </div>
      </div>

      {/* Resubmission Message */}
      {resubmitMsg && (
        <div
          className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between border shadow-sm ${resubmitMsg.type === 'success'
            ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
            : 'bg-rose-50 border-rose-300 text-rose-950'
            }`}
        >
          <div className="flex items-center gap-2.5">
            {resubmitMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            )}
            <span>{resubmitMsg.text}</span>
          </div>
          <button
            onClick={() => setResubmitMsg(null)}
            className="text-slate-400 hover:text-slate-600 ml-4"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Application Progress Roadmap */}
      <div className="portal-card p-6 sm:p-7 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Admission Journey
            </h2>
            <p className="text-sm font-bold text-slate-900 mt-0.5">
              Candidate Milestone Tracker
            </p>
          </div>
          <span className="portal-badge-gold">
            Official Session 2027-28
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-1">
          {steps.map((st, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden ${st.completed
                ? 'bg-emerald-50/70 border-emerald-300 text-slate-900 shadow-xs'
                : st.current
                  ? 'bg-amber-50/50 border-amber-400 ring-2 ring-amber-400/30 text-slate-950 shadow-sm'
                  : 'bg-slate-50/80 border-slate-200 text-slate-400'
                }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-mono font-bold uppercase ${st.completed ? 'text-emerald-800' : st.current ? 'text-amber-800' : 'text-slate-400'}`}>
                  Step 0{idx + 1}
                </span>
                {st.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : st.current ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                )}
              </div>
              <h4 className={`font-bold text-xs leading-tight ${st.completed ? 'text-slate-900' : st.current ? 'text-slate-950' : 'text-slate-500'}`}>
                {st.label}
              </h4>
              <span className={`text-[11px] mt-1.5 block font-medium ${st.completed ? 'text-emerald-700' : st.current ? 'text-amber-700 font-semibold' : 'text-slate-400'}`}>
                {st.sublabel}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Grid: Dossier + Receipts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Cols: Candidate Dossier */}
        <div className="lg:col-span-2 space-y-6">
          <div className="portal-card p-6 sm:p-7 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Candidate Dossier Summary
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verified particulars recorded for entrance examination and campus enrolment
                </p>
              </div>
              <span className="portal-badge-emerald">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirmed</span>
              </span>
            </div>

            {/* Dossier Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="data-cell">
                <span className="text-slate-500 block text-[10px] font-semibold uppercase tracking-wider">Registration ID</span>
                <span className="font-mono font-bold text-sm text-portal-navy mt-0.5 block">
                  {application.registrationNumber || application.applicationNumber}
                </span>
              </div>
              <div className="data-cell">
                <span className="text-slate-500 block text-[10px] font-semibold uppercase tracking-wider">Class Seeking</span>
                <span className="font-bold text-sm text-slate-900 mt-0.5 block">
                  Class {application.classApplying}{application.stream ? ` (${application.stream})` : ''}
                </span>
              </div>
              <div className="data-cell">
                <span className="text-slate-500 block text-[10px] font-semibold uppercase tracking-wider">Application Fee</span>
                <span className="font-bold text-sm text-emerald-700 mt-0.5 block">₹800.00 (Paid)</span>
              </div>

              <div className="data-cell">
                <span className="text-slate-500 block text-[10px] font-semibold uppercase tracking-wider">Candidate Full Name</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{application.personalInfo?.fullName}</span>
              </div>
              <div className="data-cell">
                <span className="text-slate-500 block text-[10px] font-semibold uppercase tracking-wider">Date of Birth</span>
                <span className="font-medium text-slate-900 mt-0.5 block">{formatDob(application.personalInfo?.dob)}</span>
              </div>
              <div className="data-cell">
                <span className="text-slate-500 block text-[10px] font-semibold uppercase tracking-wider">Gender &amp; Category</span>
                <span className="font-medium text-slate-900 mt-0.5 block">
                  {application.personalInfo?.gender} • {application.personalInfo?.category || 'General'}
                </span>
              </div>

              <div className="data-cell">
                <span className="text-slate-500 block text-[10px] font-semibold uppercase tracking-wider">Aadhaar Number</span>
                <span className="font-mono text-slate-800 mt-0.5 block">{application.personalInfo?.aadhaarNumber || '—'}</span>
              </div>
              <div className="data-cell">
                <span className="text-slate-500 block text-[10px] font-semibold uppercase tracking-wider">PEN Number</span>
                <span className="font-mono text-slate-800 mt-0.5 block">{application.personalInfo?.panNumber || '—'}</span>
              </div>
              <div className="data-cell">
                <span className="text-slate-500 block text-[10px] font-semibold uppercase tracking-wider">Family ID</span>
                <span className="font-mono text-slate-800 mt-0.5 block">{application.personalInfo?.familyId || '—'}</span>
              </div>

              <div className="data-cell">
                <span className="text-slate-500 block text-[10px] font-semibold uppercase tracking-wider">Father&apos;s Name</span>
                <span className="font-medium text-slate-900 mt-0.5 block">{application.parentInfo?.fatherName}</span>
              </div>
              <div className="data-cell">
                <span className="text-slate-500 block text-[10px] font-semibold uppercase tracking-wider">Mother&apos;s Name</span>
                <span className="font-medium text-slate-900 mt-0.5 block">{application.parentInfo?.motherName}</span>
              </div>
              <div className="data-cell">
                <span className="text-slate-500 block text-[10px] font-semibold uppercase tracking-wider">Registered Mobile</span>
                <span className="font-mono text-slate-900 mt-0.5 block">{application.parentInfo?.fatherPhone || application.personalInfo?.candidateMobile}</span>
              </div>

              <div className="data-cell sm:col-span-2">
                <span className="text-slate-500 block text-[10px] font-semibold uppercase tracking-wider">Campus Preferences</span>
                <span className="font-medium text-slate-900 mt-0.5 block">
                  1st: <strong>{application.studyLocation?.firstPreference || 'Gurukul Nilokheri'}</strong> • 2nd: {application.studyLocation?.secondPreference || 'None'}
                </span>
              </div>
              <div className="data-cell">
                <span className="text-slate-500 block text-[10px] font-semibold uppercase tracking-wider">Payment Reference</span>
                <span className="font-mono text-[11px] text-slate-700 truncate mt-0.5 block">{application.paymentInfo?.transactionId || 'CONFIRMED'}</span>
              </div>

              <div className="data-cell sm:col-span-3">
                <span className="text-slate-500 block text-[10px] font-semibold uppercase tracking-wider">Permanent Residential Address</span>
                <span className="font-medium text-slate-800 mt-0.5 block leading-relaxed">
                  {application.addressInfo?.streetAddress}, {application.addressInfo?.district}, {application.addressInfo?.state} - {application.addressInfo?.pincode}
                </span>
              </div>
            </div>

            {/* Mandatory Examination Day Guidelines Card */}
            <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-500/20 text-amber-900 border border-amber-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                    Exam Day Mandatory Requirements
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                  Candidates Must Bring to the Examination Centre:
                </h4>
                <ul className="text-[11.5px] text-slate-700 space-y-0.5 list-disc list-inside">
                  <li><strong className="text-slate-950">1. Coloured Admit Card:</strong> A clear coloured printout of your Hall Ticket (Black &amp; white copies are NOT permitted).</li>
                  <li><strong className="text-slate-950">2. Original Photo ID Proof:</strong> ONE original photo ID (Original Aadhaar Card, Passport, or School ID Card).</li>
                </ul>
              </div>
              {isAdmitCardReleased ? (
                <Link
                  href="/admit-card"
                  className="btn-primary text-xs h-9 px-4 flex items-center gap-2 flex-shrink-0 font-bold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Coloured Admit Card</span>
                </Link>
              ) : (
                <span className="text-[11px] text-amber-800 font-semibold bg-amber-100/70 border border-amber-300 px-3 py-1.5 rounded-lg">
                  Admit Card Pending Release
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Receipt & Helpdesk */}
        <div className="space-y-6">
          {/* Fee Payment Voucher Card */}
          <div className="portal-card p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                  Official Voucher
                </span>
                <h3 className="font-bold text-slate-900 text-sm">
                  Fee Payment Receipt
                </h3>
              </div>
              <span className="portal-badge-emerald">
                <CheckCircle2 className="w-3 h-3" />
                <span>Verified</span>
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-center space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Entrance Fee</span>
              <div className="text-2xl font-black text-slate-900 font-mono">
                ₹{application.amountPaid || 800}.00
              </div>
              <span className="text-[11px] text-emerald-700 font-semibold block">
                Paid Successfully
              </span>
            </div>

            <div className="space-y-2.5 pt-1">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Transaction ID</span>
                <span className="font-mono text-slate-800 font-medium text-[11px] truncate max-w-[140px]" title={application.transactionId}>
                  {application.transactionId}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Receipt Date</span>
                <span className="text-slate-800 font-medium">{new Date(application.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Payment Gateway</span>
                <span className="text-slate-800 font-medium">Online Verified (Razorpay)</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">Academic Session</span>
                <span className="text-slate-800 font-semibold">2027-28</span>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-slate-500 text-center bg-slate-50 py-2 px-3 rounded-lg border border-slate-100">
              Official electronic payment receipt verified for Session 2027-28.
            </div>
          </div>

          {/* Admission Helpdesk Box */}
          <div className="portal-card-navy p-6 space-y-3.5 text-white">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center">
                <Phone className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-amber-300 uppercase tracking-wider">
                  Admission Helpdesk
                </h4>
                <p className="text-[10px] text-slate-400">Examination Cell</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Have questions regarding document verification, syllabus, or exam centres? Contact the Gurukul Examination Cell.
            </p>

            <div className="pt-2 border-t border-slate-800 space-y-1.5 text-xs font-mono text-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-sans text-[11px]">Helpline 1:</span>
                <span>+91-1744-259114</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-sans text-[11px]">Helpline 2:</span>
                <span>+91-9896328329</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-sans text-[11px]">Email:</span>
                <span className="text-[11px]">admissions@gurukuladmissions.org</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Accessible Modal */}
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
