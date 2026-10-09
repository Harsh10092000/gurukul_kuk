'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw
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

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResendSuccess('');

    const cleanInput = identifier.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanInput || !emailRegex.test(cleanInput)) {
      setError('Please enter a valid registered email address (e.g. applicant@gmail.com).');
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

      setMaskedTarget(data.maskedEmail || cleanInput);
      setStep('otp');
      setResendTimer(30);
      setCanResend(false);
      setLoading(false);
    } catch {
      setError('An error occurred. Please check your network connection.');
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setResendSuccess('');
    setResendLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_otp',
          identifier: identifier.trim().toLowerCase(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to resend code.');
      } else {
        setResendSuccess('Verification code resent successfully to your email.');
        setResendTimer(30);
        setCanResend(false);
        setTimeout(() => setResendSuccess(''), 4000);
      }
    } catch {
      setError('Network error while resending code.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!otp.trim() || otp.trim().length !== 6) {
      setError('Please enter the valid 6-digit OTP code received on your email.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_otp',
          identifier: identifier.trim().toLowerCase(),
          otp: otp.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid or expired OTP code.');
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

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-xl shadow-xs border border-slate-200">
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 mx-auto flex items-center justify-center">
            <Image
              src="/logo-gurukul.png"
              alt="The Gurukul Logo"
              width={48}
              height={48}
              className="brand-logo-sm object-contain"
            />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-portal-gold bg-amber-50 px-3 py-0.5 rounded-full inline-block border border-amber-200">
            Candidate Assistance
          </span>
          <h2 className="text-xl font-bold tracking-tight text-portal-navy">
            {step === 'success' 
              ? 'Registration Number Found' 
              : step === 'otp' 
              ? 'Enter Email Verification Code' 
              : 'Find Registration Number'}
          </h2>
          <p className="text-xs text-slate-500">
            {step === 'request' && 'Enter your registered email address to retrieve your registration number.'}
            {step === 'otp' && `Enter the 6-digit OTP code dispatched to ${maskedTarget || identifier.trim().toLowerCase()}.`}
            {step === 'success' && 'Your Registration Number has been retrieved and dispatched to your email.'}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Input Email Only */}
        {step === 'request' && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="form-label">
                Registered Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. applicant@gmail.com"
                className="form-input-field"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Enter the email address used during registration to receive a verification OTP.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Sending Code...' : 'Send Verification OTP'}
            </button>
          </form>
        )}

        {/* Step 2: Enter OTP with Resend */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="form-label mb-0">
                  6-Digit OTP Code <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setStep('request')}
                  className="text-[11px] text-portal-navy hover:underline"
                >
                  Change Email
                </button>
              </div>

              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • • • •"
                className="w-full text-center text-xl font-mono font-bold tracking-[0.4em] py-2.5 border border-slate-200 rounded-lg focus:border-portal-navy focus:ring-1 focus:ring-portal-navy outline-none bg-white"
              />

              <div className="flex justify-between items-center text-xs mt-2 px-1">
                <span className="text-slate-500">Didn&apos;t receive code?</span>
                {canResend ? (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendLoading}
                    className="text-portal-gold font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    <RotateCcw className={`w-3 h-3 ${resendLoading ? 'animate-spin' : ''}`} />
                    <span>Resend OTP</span>
                  </button>
                ) : (
                  <span className="text-slate-400">
                    Resend code in <strong>{resendTimer}s</strong>
                  </span>
                )}
              </div>

              {resendSuccess && (
                <p className="text-[11px] text-emerald-700 bg-emerald-50 py-1 px-2 rounded border border-emerald-200 mt-2 text-center">
                  {resendSuccess}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Retrieving Registration Number...' : 'Verify & Retrieve Registration No.'}
            </button>
          </form>
        )}

        {/* Step 3: Success Screen */}
        {step === 'success' && retrievedData && (
          <div className="space-y-4">
            {retrievedData.hasRegistrationNumber ? (
              <>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center space-y-3">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <div>
                    <h3 className="text-base font-bold text-portal-navy">
                      Permanent Registration Number Found
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Dear <strong className="text-slate-900">{retrievedData.name}</strong>, your Registration Number is:
                    </p>
                  </div>

                  {retrievedData.registrationNumber && (
                    <div className="bg-white border-2 border-emerald-400 rounded-xl py-3 px-4 inline-block shadow-xs">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Permanent Registration ID</div>
                      <div className="font-mono text-xl sm:text-2xl font-black text-portal-navy tracking-widest mt-0.5">
                        {retrievedData.registrationNumber}
                      </div>
                      {retrievedData.classApplying && (
                        <div className="text-[11px] font-semibold text-emerald-700 mt-1">
                          Class: {retrievedData.classApplying}
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    This registration number has also been sent to <strong>{retrievedData.maskedEmail || 'your registered email'}</strong>. Please save it for candidate login and Admit Card download.
                  </p>
                </div>

                <Link
                  href="/"
                  className="btn-primary w-full"
                >
                  Proceed to Candidate Sign In
                </Link>
              </>
            ) : (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-xs text-amber-900 space-y-2">
                  <p className="font-bold text-sm">Account Found: {retrievedData.name}</p>
                  <p className="text-slate-600 leading-relaxed">
                    {retrievedData.message || 'Your candidate account is registered. Permanent Registration Numbers are issued after application submission and fee payment.'}
                  </p>
                </div>
                <Link
                  href="/"
                  className="btn-primary w-full"
                >
                  Sign In with Email &amp; Password
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Bottom Back Navigation */}
        <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
          <Link href="/" className="hover:text-portal-navy transition font-medium">
            Return to Sign In
          </Link>
          <Link href="/forgot-password" className="text-portal-navy font-semibold hover:underline">
            Forgot Password?
          </Link>
        </div>

      </div>
    </div>
  );
}
