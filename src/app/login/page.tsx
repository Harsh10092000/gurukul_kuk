'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import VisualCaptcha from '@/components/VisualCaptcha';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Captcha state
  const [captchaCode, setCaptchaCode] = useState('7Nk9x');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaError, setCaptchaError] = useState('');

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

    if (identifier.includes('@')) {
      setError('Candidate login requires Registration ID or Mobile Number. Email login is not allowed.');
      return;
    }

    if (captchaInput.trim() !== captchaCode) {
      generateCaptcha(false);
      setCaptchaError('Incorrect Security PIN. Please try again.');
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
    <div className="min-h-[85vh] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto">
        {/* Top Breadcrumb & Badge */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link href="/" className="hover:text-portal-navy transition font-medium">Portal Home</Link>
            <span>/</span>
            <span className="text-slate-900 font-semibold">Candidate Login</span>
          </div>
          <span className="bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-semibold uppercase px-3 py-0.5 rounded-full font-mono">
            Session 2027-28
          </span>
        </div>

        {/* Main 2-Column Portal Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Left Column: Guidelines */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center">
                  <Image
                    src="/logo-gurukul.png"
                    alt="Gurukul Emblem"
                    width={48}
                    height={48}
                    className="brand-logo-sm object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-base font-bold text-portal-navy leading-tight">
                    GURUKUL KURUKSHETRA
                  </h3>
                  <p className="text-xs text-amber-700 font-serif">
                    तमसो मा ज्योतिर्गमय
                  </p>
                  <p className="text-[11px] text-slate-500">
                    CBSE Affiliated • No. 530006
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-800 mb-3">
                  Candidate Login Guidelines
                </h4>
                <ul className="space-y-3 text-xs text-slate-600 leading-relaxed">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      <strong className="text-slate-900">Registration Number:</strong> Enter your unique registration ID (e.g. <span className="font-mono font-semibold">NILB-10001</span>) or registered 10-digit mobile number.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      <strong className="text-slate-900">Account Password:</strong> Enter the confidential password chosen during initial registration.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      <strong className="text-slate-900">Security PIN:</strong> Type the 5-character captcha code exactly as shown (case-sensitive).
                    </span>
                  </li>
                </ul>
              </div>

              {/* Admissions Helpline Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-1.5 text-xs text-slate-600">
                <div className="font-semibold text-slate-900">Admissions Helpdesk</div>
                <div>Phone: +91-1744-259114, 9896328329</div>
                <div>Email: admissions@gurukuladmissions.org</div>
                <div className="text-[11px] text-slate-500 pt-1">Hours: 9:00 AM – 4:00 PM (Mon – Sat)</div>
              </div>
            </div>
          </div>

          {/* Right Column: The Login Form */}
          <div className="lg:col-span-7">
            <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs space-y-6">

              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-xl font-bold text-portal-navy">
                  Candidate Portal Login
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Sign in with your registered credentials to access your candidate dossier and services.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-800 font-medium">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              {captchaError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-800 font-medium">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                  <span>{captchaError}</span>
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit}>
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
                      Account Password <span className="text-rose-500">*</span>
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
                  {loading ? 'Authenticating...' : 'Sign In to Candidate Dashboard'}
                </button>
              </form>

              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <p className="text-slate-600">
                  New applicant?{' '}
                  <Link href="/register" className="font-semibold text-portal-navy hover:underline">
                    New Registration
                  </Link>
                </p>
                <Link
                  href="/admin/login"
                  className="text-slate-500 hover:text-slate-800 font-medium transition"
                >
                  Staff / Admin Sign In
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
