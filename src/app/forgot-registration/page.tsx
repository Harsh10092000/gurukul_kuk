'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  FileSearch, 
  Mail, 
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  Copy, 
  Check, 
  LogIn, 
  ArrowLeft,
  GraduationCap
} from 'lucide-react';

export default function ForgotRegistrationPage() {
  const [step, setStep] = useState<'request' | 'otp' | 'success'>('request');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [maskedTarget, setMaskedTarget] = useState('');

  // Resend OTP states
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');

  // Success result states
  const [retrievedData, setRetrievedData] = useState<{
    registrationNumber?: string;
    hasRegistrationNumber?: boolean;
    name?: string;
    classApplying?: string;
    message?: string;
    maskedEmail?: string;
    maskedPhone?: string;
    sentToEmail?: boolean;
  } | null>(null);

  const [copied, setCopied] = useState(false);

  // Timer countdown
  useEffect(() => {
    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Step 1: Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResendSuccess('');

    const cleanInput = identifier.trim();
    if (!cleanInput) {
      setError('Please enter your registered 10-digit mobile number or email address.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_otp',
          identifier: cleanInput,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to dispatch verification code.');
        setLoading(false);
        return;
      }

      setMaskedTarget(data.maskedEmail || data.maskedPhone || cleanInput);
      setStep('otp');
      setResendTimer(30);
      setCanResend(false);
      setLoading(false);
    } catch {
      setError('Connection error. Please check your network and try again.');
      setLoading(false);
    }
  };

  // Step 2: Resend OTP
  const handleResendOtp = async () => {
    setError('');
    setResendSuccess('');
    setResendLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resend_otp',
          identifier: identifier.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to resend code.');
      } else {
        setResendSuccess('A fresh 6-digit verification code has been dispatched.');
        setResendTimer(30);
        setCanResend(false);
      }
    } catch {
      setError('Unable to resend OTP at this moment.');
    } finally {
      setResendLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!otp.trim() || otp.trim().length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_otp',
          identifier: identifier.trim(),
          otp: otp.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Verification failed.');
        setLoading(false);
        return;
      }

      setRetrievedData(data);
      setStep('success');
      setLoading(false);
    } catch {
      setError('An error occurred during verification.');
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (retrievedData?.registrationNumber) {
      navigator.clipboard.writeText(retrievedData.registrationNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-100 font-sans">
      <div className="max-w-md w-full space-y-6 bg-white p-8 sm:p-10 rounded-3xl shadow-xl border border-slate-200">
        
        {/* Top Emblem & Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto flex items-center justify-center">
            <Image
              src="/logo-gurukul.png"
              alt="Gurukul Kurukshetra Logo"
              width={64}
              height={64}
              className="brand-logo-img object-contain"
            />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-3 py-1 rounded-full inline-block">
            Candidate Assistance
          </span>
          <h2 className="text-2xl font-black tracking-tight text-gurukul-navy">
            {step === 'success' 
              ? 'Registration Number Sent' 
              : step === 'otp' 
              ? 'Verify Verification Code' 
              : 'Find Registration Number'}
          </h2>
          <p className="text-xs text-slate-500">
            {step === 'request' && 'Enter your registered mobile number or email to retrieve your permanent registration number.'}
            {step === 'otp' && `Enter the 6-digit OTP code dispatched to ${maskedTarget || 'your registered contact'}.`}
            {step === 'success' && 'Your permanent Registration Number has been sent to your registered email.'}
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Input Mobile or Email */}
        {step === 'request' && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Registered Mobile No. or Email *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. 9876543210 or applicant@gmail.com"
                  className="w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition font-medium"
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Enter the exact 10-digit mobile number or email used during registration.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-gurukul-600 hover:from-amber-600 hover:to-gurukul-700 text-white font-extrabold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Verifying & Sending OTP...</span>
              ) : (
                <>
                  <FileSearch className="w-4 h-4" />
                  <span>Send Verification Code</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Step 2: Enter OTP with Resend */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  6-Digit OTP Code *
                </label>
                <button
                  type="button"
                  onClick={() => setStep('request')}
                  className="text-[11px] text-gurukul-600 hover:underline inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" /> Change Contact
                </button>
              </div>

              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • • • •"
                className="w-full text-center text-xl font-mono font-black tracking-[0.4em] py-2.5 border-2 border-slate-300 rounded-xl focus:border-amber-500 outline-none"
              />

              {/* Resend OTP Row */}
              <div className="flex justify-between items-center text-xs mt-1.5 px-1">
                <span className="text-slate-500">Didn&apos;t receive code?</span>
                {canResend ? (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendLoading}
                    className="text-amber-700 font-bold hover:underline inline-flex items-center gap-1 transition"
                  >
                    <RotateCcw className={`w-3 h-3 ${resendLoading ? 'animate-spin' : ''}`} />
                    <span>Resend OTP</span>
                  </button>
                ) : (
                  <span className="text-slate-400 font-medium">
                    Resend code in <span className="font-mono font-bold text-amber-700">{resendTimer}s</span>
                  </span>
                )}
              </div>

              {resendSuccess && (
                <p className="text-[11px] text-emerald-600 font-medium mt-1.5 text-center bg-emerald-50 py-1 rounded border border-emerald-200">
                  {resendSuccess}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-gurukul-navy to-gurukul-navyLight hover:from-slate-900 hover:to-gurukul-navy text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Retrieving Registration Number...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  <span>Verify & Retrieve Registration No.</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Step 3: Success Screen */}
        {step === 'success' && retrievedData && (
          <div className="space-y-5">
            {retrievedData.hasRegistrationNumber ? (
              <>
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-2xl p-6 text-center space-y-4 shadow-sm">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner border border-emerald-200">
                    <Mail className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gurukul-navy">
                      Registration Number Sent to Your Email!
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Dear <strong className="text-slate-900">{retrievedData.name}</strong>, for account security, your permanent Registration Number has been dispatched to your registered email address:
                    </p>
                  </div>

                  <div className="bg-white border-2 border-emerald-400/60 rounded-xl py-2.5 px-4 shadow-inner inline-block">
                    <span className="font-mono text-xs font-bold text-emerald-800">
                      ✉️ {retrievedData.maskedEmail || 'Your Registered Email'}
                    </span>
                  </div>

                  <div className="p-3 bg-emerald-100/60 rounded-xl border border-emerald-200 text-left text-xs text-emerald-900 space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Email Dispatched Successfully</span>
                    </p>
                    <p className="text-[11px] text-emerald-800 leading-relaxed pl-5">
                      Please check your inbox (and Spam / Junk folder) for the message from <strong>Gurukul Kurukshetra Admissions</strong>. It contains your Registration Number and portal login instructions.
                    </p>
                  </div>
                </div>

                <Link
                  href="/"
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-amber-500 to-gurukul-600 hover:from-amber-600 hover:to-gurukul-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Proceed to Candidate Sign In →</span>
                </Link>
              </>
            ) : (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-xs text-amber-900 space-y-2">
                  <p className="font-bold text-sm">Account Found: {retrievedData.name}</p>
                  <p className="text-slate-600 leading-relaxed">
                    {retrievedData.message || 'Your candidate account is registered. Permanent Registration Numbers are issued after application submission and fee payment.'}
                  </p>
                </div>
                <Link
                  href="/"
                  className="w-full inline-flex items-center justify-center gap-2 py-3 bg-gurukul-navy hover:bg-slate-900 text-white font-extrabold text-xs rounded-xl shadow transition"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In with Mobile / Email & Password →</span>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Bottom Back Navigation */}
        <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-800 underline">
            ← Back to Sign In
          </Link>
          <Link href="/forgot-password" className="text-amber-700 font-semibold hover:underline">
            Forgot Password?
          </Link>
        </div>

      </div>
    </div>
  );
}
