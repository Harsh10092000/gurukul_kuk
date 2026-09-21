'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  AlertCircle, 
  Eye, 
  EyeOff, 
  RotateCcw 
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // OTP Verification State
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [otp, setOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // UI state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [scheduleStatus, setScheduleStatus] = useState<{
    isOpen: boolean;
    message?: string;
  } | null>(null);

  // Check schedule on load
  React.useEffect(() => {
    fetch('/api/schedule')
      .then((r) => r.json())
      .then((data) => {
        if (data.details) {
          setScheduleStatus(data.details);
        } else if (data.isOpen !== undefined) {
          setScheduleStatus(data);
        }
      })
      .catch(() => {});
  }, []);

  // Timer countdown for OTP
  React.useEffect(() => {
    let interval: any = null;
    if (step === 'otp' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else if (resendTimer === 0) {
      setCanResend(true);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  const handleInitiateRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || name.trim().length < 2) {
      setError('Please enter candidate’s full name as per Aadhaar Card.');
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address (e.g., student@example.com).');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(cleanPhone)) {
      setError('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          actionType: 'register',
          email: email.trim(),
          phone: cleanPhone,
          name: name.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to dispatch verification code.');
        setLoading(false);
        return;
      }

      setStep('otp');
      setResendTimer(60);
      setCanResend(false);
      setLoading(false);
    } catch {
      setError('An error occurred while connecting to the verification server.');
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setLoading(true);
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          actionType: 'register',
          email: email.trim(),
          phone: cleanPhone,
          name: name.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to resend code.');
      } else {
        setResendTimer(60);
        setCanResend(false);
      }
    } catch {
      setError('Unable to resend OTP at this moment.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!otp.trim() || otp.trim().length !== 6) {
      setError('Please enter the 6-digit OTP received on your email / mobile.');
      return;
    }

    setLoading(true);
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    try {
      const verifyRes = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          identifier: email.trim().toLowerCase(),
          otp: otp.trim(),
        }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        setError(verifyData.error || 'Invalid or expired OTP code.');
        setLoading(false);
        return;
      }

      const regRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: cleanPhone,
          otp: otp.trim(),
        }),
      });
      const regData = await regRes.json();

      if (!regRes.ok) {
        setError(regData.error || 'Failed to complete registration.');
        setLoading(false);
        return;
      }

      try {
        sessionStorage.setItem(
          'gurukul_reg_info',
          JSON.stringify({
            fullName: name.trim(),
            candidateEmail: email.trim().toLowerCase(),
            candidateMobile: cleanPhone,
          })
        );
        localStorage.removeItem('gurukul_application_draft');
      } catch (e) {}

      router.push('/apply');
    } catch {
      setError('An error occurred during account registration. Please try again.');
      setLoading(false);
    }
  };

  // Screen 2: OTP Verification Card
  if (step === 'otp') {
    return (
      <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-xl border border-slate-200/90 shadow-[0_14px_36px_-4px_rgba(11,25,44,0.20),0_4px_16px_-2px_rgba(11,25,44,0.12)]">
          <div className="text-center space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-portal-navy bg-slate-100 px-3 py-1 rounded-full inline-block">
              Security Step 2: Verification
            </span>
            <h2 className="text-xl font-bold tracking-tight text-portal-navy">
              Enter Verification Code
            </h2>
            <p className="text-xs text-slate-500">
              We have dispatched a 6-digit OTP to:
              <br />
              <strong className="text-slate-800">{email}</strong> and{' '}
              <strong className="text-slate-800">+91-{phone.slice(-10)}</strong>
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleVerifyAndRegister} className="space-y-4">
            <div>
              <label className="form-label text-center">
                Enter 6-Digit OTP <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • • • •"
                className="w-full text-center text-2xl font-mono font-bold tracking-[0.5em] py-2.5 border border-slate-200 rounded-lg focus:border-portal-navy focus:ring-1 focus:ring-portal-navy outline-none transition bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="btn-primary w-full"
            >
              {loading ? 'Verifying...' : 'Verify OTP & Proceed to Registration'}
            </button>
          </form>

          {/* Resend OTP & Back */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <button
              type="button"
              onClick={() => {
                setStep('details');
                setError('');
              }}
              className="hover:text-portal-navy underline"
            >
              Edit Details
            </button>

            {canResend ? (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading}
                className="text-portal-gold font-semibold hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Resend OTP
              </button>
            ) : (
              <span className="text-slate-400">
                Resend OTP in <strong>{resendTimer}s</strong>
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Closed Schedule Guard
  if (scheduleStatus && !scheduleStatus.isOpen) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-md w-full space-y-5 bg-white p-8 rounded-xl shadow-xs border border-rose-200 text-center">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-3 py-1 rounded-full inline-block border border-rose-200">
              Registration Concluded
            </span>
            <h2 className="text-xl font-bold text-portal-navy">
              Online Registration Closed
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              {scheduleStatus.message || 'Online applications for Entrance Examination Session 2027-28 have concluded. New registrations are currently closed.'}
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 text-left space-y-1.5">
            <p className="font-semibold text-slate-800">For Already Registered Candidates:</p>
            <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[11px]">
              <li>Sign in to your Candidate Portal to check scrutiny status or download your submitted form.</li>
              <li>Track verification and roll number allotment using your Registration ID.</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Link
              href="/"
              className="btn-primary w-full"
            >
              Sign In to Candidate Portal
            </Link>
            <Link
              href="/status"
              className="btn-secondary w-full"
            >
              Track Application Status
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Screen 1: Details Entry
  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-xl border border-slate-200/90 shadow-[0_14px_36px_-4px_rgba(11,25,44,0.20),0_4px_16px_-2px_rgba(11,25,44,0.12)]">
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 mx-auto flex items-center justify-center">
            <Image
              src="/logo-gurukul.png"
              alt="Gurukul Logo"
              width={48}
              height={48}
              className="brand-logo-sm object-contain"
            />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-portal-gold bg-amber-50 px-3 py-0.5 rounded-full inline-block border border-amber-200">
            Entrance Session 2027-28
          </span>
          <h2 className="text-xl font-bold tracking-tight text-portal-navy">
            Candidate Registration
          </h2>
          <p className="text-xs text-slate-500">
            Verify via Email/Mobile OTP to begin your entrance examination application.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700 font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleInitiateRegistration}>
          <div>
            <label className="form-label">
              Candidate Full Name (As per Aadhaar Card) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Candidate full name"
              className="form-input-field"
            />
          </div>

          <div>
            <label className="form-label">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@example.com"
              className="form-input-field"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Used for dispatching Registration Number and Admit Card.
            </p>
          </div>

          <div>
            <label className="form-label">
              Mobile / WhatsApp Number <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-semibold text-slate-500">+91</span>
              <input
                type="tel"
                required
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="9876543210"
                className="form-input-field pl-11 font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-2"
          >
            {loading ? 'Dispatching OTP...' : 'Send Verification OTP'}
          </button>
        </form>

        <div className="pt-2 text-center text-xs text-slate-600 border-t border-slate-100">
          Already registered?{' '}
          <Link href="/" className="font-semibold text-portal-navy hover:underline">
            Sign In with Registration No.
          </Link>
        </div>
      </div>
    </div>
  );
}
