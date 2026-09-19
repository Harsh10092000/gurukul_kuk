'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import VisualCaptcha from '@/components/VisualCaptcha';
import NotificationBar from '@/components/NotificationBar';
import { resolveAdmissionPhase } from '@/lib/admissionPhases';

export default function ExamPortalGateway() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loggedInUser, setLoggedInUser] = useState<any>(null);

  // Sign In Form State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaCode, setCaptchaCode] = useState('7Nk9x');
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

  const [scheduleLoaded, setScheduleLoaded] = useState(false);
  const [portalSettings, setPortalSettings] = useState<any>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const generateCaptcha = (clearError: boolean = false) => {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercase = 'abcdefghjkmnpqrstuvwxyz';
    const numbers = '23456789';
    const allChars = uppercase + lowercase + numbers;

    const guaranteed = [
      uppercase[Math.floor(Math.random() * uppercase.length)],
      lowercase[Math.floor(Math.random() * lowercase.length)],
      numbers[Math.floor(Math.random() * numbers.length)],
    ];

    for (let i = guaranteed.length; i < 5; i++) {
      guaranteed.push(allChars[Math.floor(Math.random() * allChars.length)]);
    }

    for (let i = guaranteed.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [guaranteed[i], guaranteed[j]] = [guaranteed[j], guaranteed[i]];
    }

    setCaptchaCode(guaranteed.join(''));
    setCaptchaInput('');
    if (clearError) {
      setCaptchaError('');
    }
  };

  useEffect(() => {
    generateCaptcha();

    fetch('/api/schedule')
      .then((res) => res.json())
      .then((data) => {
        if (data.status) {
          setSchedule(data.status);
        }
        setScheduleLoaded(true);
      })
      .catch(() => setScheduleLoaded(true));

    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) setPortalSettings(data.settings);
        setSettingsLoaded(true);
      })
      .catch(() => {
        setSettingsLoaded(true);
      });

    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user && !data.user.isTemporary) {
          setLoggedInUser(data.user);
        } else {
          setLoggedInUser(null);
          try {
            localStorage.removeItem('gurukul_application_draft');
          } catch (e) { }
        }
        setCheckingAuth(false);
      })
      .catch(() => setCheckingAuth(false));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCaptchaError('');

    if (identifier.includes('@')) {
      setError('Candidate login requires Registration ID or Mobile Number. Email login is not allowed.');
      return;
    }

    if (captchaInput.trim() !== captchaCode) {
      generateCaptcha(false);
      setCaptchaError('Incorrect Security PIN. Please re-enter.');
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
        setError(data.error || 'Login failed. Please check your credentials.');
        setLoading(false);
        generateCaptcha();
        return;
      }

      try {
        localStorage.removeItem('gurukul_application_draft');
      } catch (e) { }

      if (data.user.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
      generateCaptcha();
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
    <div className="w-full min-h-screen bg-gradient-to-br from-[#dbeafe] via-[#fffdf8] via-45% to-[#fde1be] pb-16 font-sans">
      {/* Official Dynamic Notification Bar */}
      <NotificationBar phaseInfo={phaseInfo} scheduleLoaded={scheduleLoaded && settingsLoaded} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        {/* Page Title & Context Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 space-y-1.5">
          <span className="bg-portal-navy text-portal-gold text-[11px] font-semibold px-3 py-1 rounded-full uppercase tracking-wider font-mono">
            Session 2027-28
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-portal-navy tracking-tight">
            Entrance Examination &amp; Admission Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Online Registration, Application Verification &amp; Candidate Services
          </p>
        </div>

        {/* Dual-Pane Gateway Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Left Column (7 Cols): Registered Candidate Sign In */}
          <div className="lg:col-span-7 portal-card overflow-hidden">
            <div className="portal-card-navy px-6 py-4 flex justify-between items-center">
              <div>
                <span className="portal-badge-gold text-[10px] mb-1 inline-block">Registered Candidates</span>
                <h2 className="font-bold text-base text-white tracking-tight">
                  Candidate Sign In
                </h2>
              </div>
              <span className="text-[11px] text-slate-300 font-mono hidden sm:inline-block">
                Session 2027-28
              </span>
            </div>

            <div className="p-6 sm:p-8 space-y-5">
              <p className="text-xs text-slate-600 leading-relaxed">
                Sign in to complete your form, upload documents, pay the entrance examination fee (₹800), download Admit Card, or check merit results.
              </p>

              {loggedInUser ? (
                <div className="space-y-4 py-2">
                  <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-950 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-mono">
                      Active Session
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">
                      Welcome, {loggedInUser.name}
                    </h4>
                    <p className="text-xs text-slate-600">
                      You are currently signed in. You can proceed directly to your centralized candidate dashboard:
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Link
                      href={loggedInUser.role === 'admin' ? '/admin/dashboard' : '/dashboard'}
                      className="flex-1 py-2.5 bg-portal-navy hover:bg-slate-900 text-portal-gold font-bold text-xs rounded-lg text-center transition shadow-xs"
                    >
                      {loggedInUser.role === 'admin' ? 'Open Admin Console' : 'Go to Candidate Dashboard'}
                    </Link>
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch('/api/auth/logout', { method: 'POST' });
                        setLoggedInUser(null);
                        try {
                          localStorage.removeItem('gurukul_application_draft');
                        } catch (e) { }
                        window.location.reload();
                      }}
                      className="py-2.5 px-5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 rounded-lg text-xs font-semibold transition"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {error && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {captchaError && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 font-medium">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                      <span>{captchaError}</span>
                    </div>
                  )}

                  {/* Clean Login Form */}
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                          Registration No. / Mobile Number <span className="text-rose-500">*</span>
                        </label>
                        <Link href="/forgot-registration" className="text-portal-gold hover:underline text-xs font-semibold">
                          Forgot Reg No?
                        </Link>
                      </div>
                      <input
                        type="text"
                        required
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="e.g. NILB-10001 or 9876543210"
                        className="form-input-field"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                          Password <span className="text-rose-500">*</span>
                        </label>
                        <Link href="/forgot-password" className="text-portal-navy hover:underline text-xs font-semibold">
                          Forgot Password?
                        </Link>
                      </div>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          className="form-input-field pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                          title={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Security PIN Captcha */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                        Security PIN (Case Sensitive) <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <VisualCaptcha code={captchaCode} onRefresh={() => generateCaptcha(true)} />
                        <input
                          type="text"
                          required
                          value={captchaInput}
                          onChange={(e) => {
                            setCaptchaInput(e.target.value);
                            if (captchaError) setCaptchaError('');
                          }}
                          placeholder="Enter PIN"
                          maxLength={6}
                          autoCapitalize="none"
                          autoComplete="off"
                          spellCheck={false}
                          className="form-input-field font-mono font-bold flex-1"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary w-full mt-2"
                    >
                      {loading ? 'Verifying Credentials...' : 'Sign In to Candidate Portal'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>

          {/* Right Column (5 Cols): New Candidate Registration & Quick Services */}
          <div className="lg:col-span-5 space-y-6">

            {/* Step 1: New Candidate Registration Card */}
            {!scheduleLoaded ? (
              <div className="portal-card p-6 space-y-4 animate-pulse">
                <div className="h-6 w-40 bg-slate-200 rounded" />
                <div className="h-4 w-full bg-slate-100 rounded" />
                <div className="h-10 w-full bg-slate-200 rounded-lg" />
              </div>
            ) : (
              <div className="portal-card p-6 space-y-4 flex flex-col justify-between border-t-4 border-t-portal-gold">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-portal-navy">
                      Step 1: Registration
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded ${phaseInfo.registrationCard.isOpen ? 'portal-badge-emerald' : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}>
                      {phaseInfo.registrationCard.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {phaseInfo.registrationCard.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {phaseInfo.registrationCard.description}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <Link
                    href={phaseInfo.registrationCard.actionHref}
                    className="btn-primary w-full shadow-xs"
                  >
                    {phaseInfo.registrationCard.actionText}
                  </Link>
                </div>
              </div>
            )}

            {/* Candidate Quick Services Cards */}
            <div className="portal-card p-5 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
                Candidate Quick Services
              </h4>

              <div className="space-y-2">
                <Link
                  href="/status"
                  className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-lg border border-slate-200/80 transition flex items-center justify-between group"
                >
                  <div>
                    <h5 className="font-semibold text-xs text-slate-800 group-hover:text-portal-navy transition">
                      Track Application Status
                    </h5>
                    <p className="text-[11px] text-slate-500">View payment and verification progress</p>
                  </div>
                </Link>

                <Link
                  href="/admit-card"
                  className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-lg border border-slate-200/80 transition flex items-center justify-between group"
                >
                  <div>
                    <h5 className="font-semibold text-xs text-slate-800 group-hover:text-portal-navy transition">
                      Download Admit Card (Hall Ticket)
                    </h5>
                    <p className="text-[11px] text-slate-500">Available after central roll number release</p>
                  </div>
                </Link>

                {portalSettings?.resultsDeclared && (
                  <Link
                    href="/result"
                    className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-lg border border-slate-200/80 transition flex items-center justify-between group"
                  >
                    <div>
                      <h5 className="font-semibold text-xs text-slate-800 group-hover:text-portal-navy transition">
                        View Entrance Result &amp; Scorecard
                      </h5>
                      <p className="text-[11px] text-slate-500">Subject-wise marks and merit ranking</p>
                    </div>
                  </Link>
                )}
              </div>
            </div>

            {/* Administrative Staff Access Strip */}
            <div className="portal-card-navy p-4 rounded-xl flex items-center justify-between">
              <div>
                <h5 className="font-bold text-xs text-white">Administrative Portal</h5>
                <p className="text-[11px] text-slate-300">Gurukul Examination Board &amp; Officers</p>
              </div>
              <Link
                href="/admin/login"
                className="text-xs bg-white/10 hover:bg-white/20 text-portal-gold font-semibold px-3 py-1.5 rounded-lg transition border border-white/10"
              >
                Staff Login
              </Link>
            </div>

          </div>
        </div>

        {/* Examination Schedule Section */}
        <div className="mt-8 portal-card p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <span className="portal-badge-gold text-[10px] uppercase font-mono mb-1 inline-block">Official Timeline</span>
              <h3 className="font-bold text-base text-slate-900">
                Important Examination Schedule (Session 2027-28)
              </h3>
            </div>
            <span className="text-xs text-slate-500">
              Gurukul Kurukshetra Institutional Schedule
            </span>
          </div>

          {!scheduleLoaded ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 animate-pulse">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-3.5 bg-slate-100 rounded-lg space-y-2">
                  <div className="h-3 w-12 bg-slate-200 rounded" />
                  <div className="h-4 w-full bg-slate-200 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {phaseInfo.stages.map((item, idx) => (
                <div key={idx} className="data-cell space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase">
                      Stage {item.stageNumber}
                    </span>
                    <span className={`text-[9px] px-2 py-0.5 rounded font-semibold ${item.badgeClass}`}>
                      {item.status}
                    </span>
                  </div>
                  <h4 className="font-semibold text-xs text-slate-900 leading-snug">{item.event}</h4>
                  <p className="text-xs font-semibold text-portal-navy pt-0.5">
                    {item.date}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Candidate Information & Guidelines */}
        <div className="mt-6 bg-white border border-slate-200 rounded-xl p-6 text-xs text-slate-700 space-y-3 shadow-xs">
          <h4 className="font-bold text-slate-900 text-sm">
            Key Guidelines for Entrance Examination Candidates
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-600 leading-relaxed pt-1">
            <div className="space-y-1.5">
              <p>• <strong>Registration ID:</strong> A permanent Registration ID (<code>NILB-xxxxx</code> for Boys, <code>NILG-xxxxx</code> for Girls) is allocated upon ₹800 fee confirmation.</p>
              <p>• <strong>Admit Card &amp; Exam Day Rules:</strong> Candidates must download their Entrance Admit Card and bring a <strong>COLOURED printout</strong> along with <strong>ONE ORIGINAL Photo ID proof</strong> on examination day.</p>
            </div>
            <div className="space-y-1.5">
              <p>• <strong>4 Mandatory Documents:</strong> Keep passport photo, candidate signature, guardian signature, and Aadhaar card ready before submission.</p>
              <p>• <strong>Entrance Fee:</strong> Online examination and registration fee of ₹800 is payable securely via UPI, Net Banking, or Debit Card.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
