'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  UserPlus, 
  LogIn, 
  Calendar, 
  FileText, 
  Award, 
  Download, 
  ShieldCheck, 
  Clock, 
  ArrowRight, 
  AlertCircle,
  Search,
  BookOpen,
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  RefreshCw,
  ChevronRight,
  Eye,
  EyeOff
} from 'lucide-react';
import VisualCaptcha from '@/components/VisualCaptcha';
import { resolveAdmissionPhase } from '@/lib/admissionPhases';

export default function ExamPortalGateway() {
  const router = useRouter();

  // Auth checking state
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loggedInUser, setLoggedInUser] = useState<any>(null);

  // Sign In Form State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaCode, setCaptchaCode] = useState('7N9K2');
  const [captchaError, setCaptchaError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Form Schedule State
  const [schedule, setSchedule] = useState<{
    isOpen: boolean;
    status: 'OPEN' | 'CLOSED' | 'EXTENDED' | 'UPCOMING';
    message: string;
    startDate?: string;
    endDate?: string;
    announcementNotice?: string;
  } | null>(null);

  // Whether schedule data has been fetched (avoid flash of wrong phase)
  const [scheduleLoaded, setScheduleLoaded] = useState(false);

  const [portalSettings, setPortalSettings] = useState<any>(null);

  // Generate random 5-character alphanumeric captcha
  const generateCaptcha = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(result);
    setCaptchaInput('');
    setCaptchaError('');
  };

  useEffect(() => {
    generateCaptcha();

    // Check form schedule
    fetch('/api/schedule')
      .then((res) => res.json())
      .then((data) => {
        // API returns: { isOpen, status, message, startDate, endDate, announcementNotice, details, config }
        if (data.details) {
          setSchedule({
            ...data.details,
            startDate: data.details.startDate || data.startDate,
            endDate: data.details.endDate || data.endDate,
          });
        } else if (data.isOpen !== undefined) {
          setSchedule(data);
        }
        setScheduleLoaded(true);
      })
      .catch(() => { setScheduleLoaded(true); });

    // Fetch portal settings & academic milestone dates
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) {
          setPortalSettings(data.settings);
        }
      })
      .catch(() => {});

    // Check if user is already authenticated
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setLoggedInUser(data.user);
        }
        setCheckingAuth(false);
      })
      .catch(() => {
        setCheckingAuth(false);
      });
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCaptchaError('');

    // Verify Captcha
    if (captchaInput.trim().toUpperCase() !== captchaCode.toUpperCase()) {
      setCaptchaError('Security PIN does not match. Please try again.');
      generateCaptcha();
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Authentication failed. Please check your credentials.');
        setLoading(false);
        generateCaptcha();
        return;
      }

      // Purge any un-scoped legacy draft from browser
      try {
        localStorage.removeItem('gurukul_application_draft');
      } catch (e) {}

      if (data.user.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch {
      setError('An error occurred during authentication. Please try again.');
      setLoading(false);
      generateCaptcha();
    }
  };

  const formatDateDisplay = (dateStr?: string, fallback: string = '') => {
    if (!dateStr) return fallback;
    try {
      // Handles YYYY-MM-DD or full ISO
      const parts = dateStr.split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
      }
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
      }
      return dateStr || fallback;
    } catch {
      return dateStr || fallback;
    }
  };

  const phaseInfo = resolveAdmissionPhase({
    registrationStartDate: portalSettings?.registrationStartDate || schedule?.startDate,
    registrationEndDate: portalSettings?.registrationEndDate || schedule?.endDate,
    admitCardReleaseDate: portalSettings?.admitCardReleaseDate,
    entranceExamDate: portalSettings?.entranceExamDate,
    resultDeclarationDate: portalSettings?.resultDeclarationDate,
    counselingStartDate: portalSettings?.counselingStartDate,
    academicSession: portalSettings?.academicSession,
    admitCardsReleased: portalSettings?.admitCardsReleased,
    resultsDeclared: portalSettings?.resultsDeclared,
    statusOverride: schedule?.status === 'EXTENDED' ? 'extended' : undefined,
  });

  return (
    <div className="w-full min-h-screen bg-slate-50 pb-16 font-sans">
      {/* Sleek Dynamic Phase-Aware Announcement Strip */}
      {!scheduleLoaded ? (
        /* Neutral skeleton shown while /api/schedule is fetching — prevents wrong-phase flash */
        <div className="py-2 px-4 text-center text-xs font-semibold flex items-center justify-center gap-2 border-b bg-slate-100 text-slate-400">
          <span className="text-[10px] uppercase px-2.5 py-0.5 rounded tracking-wide flex-shrink-0 bg-slate-200 animate-pulse">
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          </span>
          <span className="bg-slate-200 animate-pulse rounded w-64 h-3 inline-block" />
        </div>
      ) : (
        <div className={`py-2 px-4 text-center text-xs font-semibold flex items-center justify-center gap-2 border-b transition ${phaseInfo.banner.containerStyle}`}>
          <span className={`text-[10px] uppercase px-2.5 py-0.5 rounded tracking-wide flex-shrink-0 ${phaseInfo.banner.badgeStyle}`}>
            {phaseInfo.banner.badge}
          </span>
          <span className="truncate">
            {phaseInfo.banner.message}
          </span>
          {phaseInfo.banner.link && (
            <Link
              href={phaseInfo.banner.link.href}
              className="hover:underline flex items-center gap-1 font-bold ml-1 flex-shrink-0 group"
            >
              <span>{phaseInfo.banner.link.label}</span>
              <span className="font-extrabold group-hover:translate-x-0.5 transition-transform">→</span>
            </Link>
          )}
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        {/* Page Title & Context Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 space-y-1.5">
          <span className="bg-gurukul-navy text-amber-300 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider font-mono">
            Session 2026-27
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-gurukul-navy tracking-tight">
            Entrance Examination Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Official Online Application, Verification & Candidate Management System
          </p>
        </div>

        {/* Dual-Pane Gateway Layout (Clean & Balanced) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Left Column (7 Cols): Registered Candidate Sign In Portal */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
            {/* Form Header */}
            <div className="bg-gurukul-navy text-white px-6 py-4 flex justify-between items-center border-b-2 border-amber-500">
              <div className="flex items-center gap-2.5">
                <LogIn className="w-5 h-5 text-amber-400" />
                <h2 className="font-black text-base tracking-wide">
                  Registered Candidate Sign In
                </h2>
              </div>
              <span className="text-[10px] bg-white/10 text-amber-300 px-2.5 py-1 rounded font-bold uppercase">
                Step 2: Sign In
              </span>
            </div>

            <div className="p-6 sm:p-8 space-y-5">
              <p className="text-xs text-slate-600">
                Log in to complete your application, upload photo & signature, pay the entrance examination fee, download Admit Card, or check examination result.
              </p>

              {loggedInUser ? (
                <div className="space-y-4 py-2">
                  <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl text-xs text-amber-950 space-y-2 shadow-sm">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-mono">
                      Active Session
                    </span>
                    <h4 className="text-base font-black text-slate-900">
                      Welcome, {loggedInUser.name}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      You are currently signed in to the Gurukul Kurukshetra portal. You can proceed directly to your centralized dashboard:
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Link
                      href={loggedInUser.role === 'admin' ? '/admin/dashboard' : '/dashboard'}
                      className="flex-1 py-3 bg-gurukul-navy hover:bg-slate-900 text-amber-300 font-extrabold text-xs rounded-xl text-center transition shadow flex items-center justify-center gap-2"
                    >
                      <span>{loggedInUser.role === 'admin' ? 'Open Admin Console' : 'Go to Candidate Dashboard'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch('/api/auth/logout', { method: 'POST' });
                        setLoggedInUser(null);
                        try {
                          localStorage.removeItem('gurukul_application_draft');
                        } catch (e) {}
                        window.location.reload();
                      }}
                      className="py-3 px-5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                    >
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {error && (
                    <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {captchaError && (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{captchaError}</span>
                    </div>
                  )}

                  {/* Login Form */}
                  <form onSubmit={handleLogin} className="space-y-4">
                    {/* Field 1: Registration Number */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                          Registration No. / Registered Email / Phone *
                        </label>
                        <Link href="/forgot-registration" className="text-amber-700 hover:underline text-xs font-bold">
                          Forgot Reg No?
                        </Link>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <Mail className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                          type="text"
                          required
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          placeholder="e.g. GK26-10001 or 9876543210 or email"
                          className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition font-medium"
                        />
                      </div>
                    </div>

                    {/* Field 2: Password */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                          Password *
                        </label>
                        <Link href="/forgot-password" className="text-gurukul-600 hover:underline text-xs font-bold">
                          Forgot Password?
                        </Link>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <Lock className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-slate-400 hover:text-slate-700"
                          title={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Field 3: Visual Security Captcha */}
                    <div>
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1.5">
                        Security PIN (Case Sensitive) *
                      </label>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <VisualCaptcha code={captchaCode} onRefresh={generateCaptcha} />
                        <input
                          type="text"
                          required
                          value={captchaInput}
                          onChange={(e) => setCaptchaInput(e.target.value)}
                          placeholder="ENTER PIN"
                          maxLength={6}
                          className="flex-1 py-2.5 px-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition font-mono uppercase font-bold text-slate-900"
                        />
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 bg-gurukul-navy hover:bg-slate-800 text-white font-extrabold text-sm rounded-xl shadow transition flex items-center justify-center gap-2 mt-3"
                    >
                      {loading ? (
                        <span>Verifying Credentials...</span>
                      ) : (
                        <>
                          <LogIn className="w-4 h-4 text-amber-400" />
                          <span>Sign In to Candidate Portal</span>
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}


            </div>
          </div>

          {/* Right Column (5 Cols): New Candidate Registration & Quick Services */}
          <div className="lg:col-span-5 space-y-6">

            {/* Step 1: New Candidate Registration Card (Phase-Aware) */}
            {!scheduleLoaded ? (
              /* Skeleton card while schedule API loads */
              <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 shadow-md space-y-4 animate-pulse">
                <div className="flex justify-between items-center">
                  <div className="w-10 h-10 rounded-xl bg-slate-200" />
                  <div className="h-5 w-28 bg-slate-200 rounded-full" />
                </div>
                <div className="space-y-2 pt-2">
                  <div className="h-6 w-48 bg-slate-200 rounded" />
                  <div className="h-3 w-full bg-slate-100 rounded" />
                  <div className="h-3 w-3/4 bg-slate-100 rounded" />
                </div>
                <div className="pt-6 mt-4 border-t border-slate-100">
                  <div className="h-10 w-full bg-slate-200 rounded-xl" />
                </div>
              </div>
            ) : (
              <div className={`bg-white rounded-2xl border-2 ${phaseInfo.registrationCard.isOpen ? 'border-amber-500/40' : 'border-rose-200'} p-6 shadow-md relative overflow-hidden flex flex-col justify-between`}>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className={`w-10 h-10 rounded-xl ${phaseInfo.registrationCard.isOpen ? 'bg-amber-500 text-gurukul-navy' : 'bg-rose-100 text-rose-700'} flex items-center justify-center font-bold`}>
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <span className={`${phaseInfo.registrationCard.isOpen ? 'bg-amber-100 text-amber-900' : 'bg-rose-100 text-rose-800 border border-rose-300'} text-[10px] font-black uppercase px-3 py-1 rounded-full`}>
                      {phaseInfo.registrationCard.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-black tracking-tight text-gurukul-navy">
                      {phaseInfo.registrationCard.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {phaseInfo.registrationCard.description}
                    </p>
                  </div>
                </div>

                <div className="pt-6 mt-4 border-t border-slate-100">
                  <Link
                    href={phaseInfo.registrationCard.actionHref}
                    className={`w-full py-3 ${
                      phaseInfo.registrationCard.isPrimary
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-gurukul-navy'
                        : 'bg-gurukul-navy hover:bg-slate-800 text-amber-300'
                    } font-black text-xs rounded-xl shadow transition flex items-center justify-center gap-2 uppercase tracking-wide`}
                  >
                    <span>{phaseInfo.registrationCard.actionText}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}

            {/* Candidate Quick Services Cards */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 border-b pb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gurukul-600" /> Candidate Quick Services
              </h4>

              <div className="space-y-2">
                <Link
                  href="/status"
                  className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
                      <Search className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-slate-800 group-hover:text-gurukul-600 transition">
                        Track Application Status
                      </h5>
                      <p className="text-[10px] text-slate-500">View payment and verification state</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition" />
                </Link>

                <Link
                  href="/admit-card"
                  className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-slate-800 group-hover:text-emerald-700 transition">
                        Download Admit Card (Hall Ticket)
                      </h5>
                      <p className="text-[10px] text-slate-500">Available after roll number allotment</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition" />
                </Link>

                {portalSettings?.resultsDeclared && (
                  <Link
                    href="/result"
                    className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="font-bold text-xs text-slate-800 group-hover:text-amber-700 transition">
                          View Entrance Result & Scorecard
                        </h5>
                        <p className="text-[10px] text-slate-500">Subject-wise marks & merit ranking</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition" />
                  </Link>
                )}
              </div>
            </div>

            {/* Administrative Staff Access Card */}
            <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-white">Administrative Portal</h5>
                  <p className="text-[10px] text-slate-400">For Gurukul Admission Cell & Officers</p>
                </div>
              </div>
              <Link
                href="/admin/login"
                className="text-xs bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold px-3 py-1.5 rounded-lg transition"
              >
                Admin Sign In →
              </Link>
            </div>

          </div>
        </div>

        {/* Examination Schedule Section */}
        <div className="mt-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gurukul-600" />
              <h3 className="font-black text-sm sm:text-base text-gurukul-navy">
                Important Examination Schedule (Session 2026-27)
              </h3>
            </div>
            <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded font-bold">
              Strictly Followed by GURUKUL Network
            </span>
          </div>

          {!scheduleLoaded ? (
            /* Skeleton grid while data loads */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 animate-pulse">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-3.5 bg-slate-100 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="h-3 w-12 bg-slate-200 rounded" />
                    <div className="h-3 w-14 bg-slate-200 rounded" />
                  </div>
                  <div className="h-4 w-full bg-slate-200 rounded" />
                  <div className="h-3 w-20 bg-slate-200 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {phaseInfo.stages.map((item, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 hover:border-amber-400 transition">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                      Stage {item.stageNumber}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${item.badgeClass}`}>
                      {item.status}
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 leading-snug">{item.event}</h4>
                  <p className="text-xs font-semibold text-gurukul-600 flex items-center gap-1 pt-1">
                    <Clock className="w-3 h-3 text-amber-500" /> {item.date}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Candidate Information & Guidelines */}
        <div className="mt-6 bg-white border border-slate-200 rounded-2xl p-6 text-xs text-slate-700 space-y-3">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <BookOpen className="w-4 h-4 text-gurukul-600" />
            <span>Key Guidelines for Entrance Examination Candidates:</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-600 leading-relaxed pt-1">
            <div className="space-y-1.5">
              <p>• <strong>Registration ID Generation:</strong> A unique Registration ID (<code>NILB-xxxxx</code> for Boys, <code>NILG-xxxxx</code> for Girls) is generated server-side immediately upon successful ₹800 fee payment.</p>
              <p>• <strong>Official Application Form &amp; Hall Ticket:</strong> Your official Admission Form and Entrance Admit Card are generated immediately upon completed registration.</p>
            </div>
            <div className="space-y-1.5">
              <p>• <strong>4 Mandatory Documents:</strong> Keep candidate passport photo, candidate signature, parent signature, and Aadhaar card ready with interactive cropper before payment.</p>
              <p>• <strong>Entrance Fee:</strong> Online examination and registration fee of ₹800 must be paid online via Razorpay/Debit Card/UPI to confirm registration.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
