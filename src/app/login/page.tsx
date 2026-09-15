'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  LogIn, 
  Mail, 
  Lock, 
  AlertCircle, 
  ArrowRight, 
  ShieldCheck, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Phone, 
  HelpCircle, 
  CheckCircle2, 
  Calendar,
  ExternalLink
} from 'lucide-react';
import VisualCaptcha from '@/components/VisualCaptcha';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<any>(null);

  // Captcha state
  const [captchaCode, setCaptchaCode] = useState('7K9N2');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaError, setCaptchaError] = useState('');

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

    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          if (data.user.role === 'admin') {
            router.replace('/admin/dashboard');
          } else {
            router.replace('/dashboard');
          }
        }
      })
      .catch(() => {});
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCaptchaError('');

    if (captchaInput.trim().toUpperCase() !== captchaCode.toUpperCase()) {
      setCaptchaError('Security PIN / Captcha does not match. Please try again.');
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
        setError(data.error || 'Login failed. Please check credentials.');
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
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
      generateCaptcha();
    }
  };

  return (
    <div className="min-h-[85vh] bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Top Breadcrumb & Badge */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 border-b border-slate-200/80 pb-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link href="/" className="hover:text-gurukul-600 font-semibold">Portal Home</Link>
            <span>/</span>
            <span className="text-slate-900 font-bold">Candidate Portal Login</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-black uppercase px-3 py-1 rounded-full font-mono flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-700" />
              Academic Session 2026-27
            </span>
          </div>
        </div>

        {/* Main 2-Column Portal Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column (5 Cols): Institutional Information & Candidate Guidelines */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-14 h-14 flex-shrink-0 flex items-center justify-center bg-slate-50 rounded-2xl p-1 border border-slate-200">
                  <Image
                    src="/logo-gurukul.png"
                    alt="Gurukul Kurukshetra Emblem"
                    width={56}
                    height={56}
                    className="brand-logo-img object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-base font-black text-gurukul-navy leading-tight">
                    GURUKUL KURUKSHETRA
                  </h3>
                  <p className="text-xs text-amber-700 font-bold font-serif">
                    तमसो मा ज्योतिर्गमय
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Established in 1912 • CBSE Affiliated (No. 530006)
                  </p>
                </div>
              </div>

              {/* Instructions Header */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-gurukul-navy flex items-center gap-2 mb-3">
                  <HelpCircle className="w-4 h-4 text-amber-600" />
                  Candidate Login Guidelines &amp; Assistance
                </h4>
                <ul className="space-y-3 text-xs text-slate-600 leading-relaxed">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      <strong className="text-slate-900">Permanent Registration No:</strong> Enter your unique registration number (e.g., <span className="font-mono text-amber-800 font-bold">GK26-10006</span>) or registered mobile number / email ID.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      <strong className="text-slate-900">Account Password:</strong> Type the confidential password you created during initial registration. Use the eye icon to verify.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      <strong className="text-slate-900">Security PIN:</strong> Type the 5-character captcha code exactly as shown (case-sensitive). Click refresh if text is unclear.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                      4
                    </span>
                    <span>
                      <strong className="text-slate-900">Candidate Services:</strong> Once signed in, you can view your application dossier, download Entrance Hall Tickets (Admit Cards), check scrutiny status, and view scorecards.
                    </span>
                  </li>
                </ul>
              </div>

              {/* Admission Helpline */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 space-y-2.5 shadow-md">
                <h5 className="font-bold text-xs text-amber-400 flex items-center gap-2">
                  <Phone className="w-4 h-4" /> Admission Helpdesk &amp; Technical Support
                </h5>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  For queries regarding registration numbers, passwords, syllabus, or exam dates:
                </p>
                <div className="text-xs space-y-1 font-mono text-amber-200 pt-1">
                  <div>+91-1744-259114</div>
                  <div>+91-9896328329 (09:00 AM - 05:00 PM IST)</div>
                  <div className="text-[11px] font-sans text-slate-300">admissions@gurukulkurukshetra.com</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (7 Cols): The Login Form Card */}
          <div className="lg:col-span-7">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xl space-y-6">
              
              {/* Card Title & Branding */}
              <div className="border-b border-slate-100 pb-5">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-gurukul-600 bg-amber-50 border border-amber-200 px-3 py-0.5 rounded-full inline-block">
                    Official Entrance Examination Desk
                  </span>
                  <span className="text-xs text-slate-500 font-medium">Session 2026-27</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-gurukul-navy mt-1">
                  Candidate Portal Login
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Sign in with your Registration Number or Registered Mobile/Email to access your admission dashboard.
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-3.5 rounded-xl bg-red-50 border-2 border-red-200 flex items-center gap-2.5 text-xs text-red-800 font-semibold">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* Captcha Error */}
              {captchaError && (
                <div className="p-3.5 rounded-xl bg-amber-50 border-2 border-amber-300 flex items-center gap-2.5 text-xs text-amber-900 font-semibold">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
                  <span>{captchaError}</span>
                </div>
              )}

              {/* Login Form */}
              <form className="space-y-4" onSubmit={handleSubmit}>
                {/* Identifier */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Registration No. / Registered Email / Phone *
                    </label>
                    <Link href="/forgot-registration" className="text-amber-700 hover:underline text-[11px] font-bold">
                      Forgot Reg No?
                    </Link>
                  </div>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. GK26-10006 or 9876543210 or email"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition font-medium text-slate-900"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Account Password *
                    </label>
                    <Link href="/forgot-password" className="text-gurukul-600 hover:underline text-[11px] font-bold">
                      Forgot Password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition text-slate-900"
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

                {/* Security PIN / Captcha */}
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
                  className="w-full mt-3 py-3 px-4 rounded-xl shadow-lg text-sm font-black text-slate-950 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-600 hover:to-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition flex items-center justify-center gap-2 border border-amber-300"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                      Authenticating Credentials...
                    </span>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Sign In to Candidate Dashboard</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </button>
              </form>

              {/* Bottom Navigation Links */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <p className="text-slate-600">
                  Haven&apos;t registered yet?{' '}
                  <Link href="/register" className="font-black text-amber-700 hover:underline">
                    Create New Account &amp; Apply
                  </Link>
                </p>
                <Link
                  href="/admin/login"
                  className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium transition"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                  <span>Staff / Admin Login</span>
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
