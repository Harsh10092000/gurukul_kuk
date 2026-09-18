'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  RotateCcw 
} from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');

  React.useEffect(() => {
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

    if (!identifier.trim()) {
      setError('Please enter your registered email address or mobile number.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          actionType: 'forgot_password',
          identifier: identifier.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to dispatch recovery code.');
        setLoading(false);
        return;
      }

      setStep('reset');
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
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          actionType: 'forgot_password',
          identifier: identifier.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to resend code.');
      } else {
        setResendSuccess('Verification code resent successfully.');
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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!otp.trim() || otp.trim().length !== 6) {
      setError('Please enter the valid 6-digit OTP.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please ensure both passwords match.');
      return;
    }

    setLoading(true);

    try {
      const verifyRes = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          identifier: identifier.trim(),
          otp: otp.trim(),
        }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        setError(verifyData.error || 'Invalid or expired verification code.');
        setLoading(false);
        return;
      }

      const resetRes = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          otp: otp.trim(),
          newPassword,
        }),
      });
      const resetData = await resetRes.json();

      if (!resetRes.ok) {
        setError(resetData.error || 'Failed to reset password.');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
      setTimeout(() => {
        router.push('/');
      }, 2500);
    } catch {
      setError('An error occurred during password reset.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 font-sans">
        <div className="max-w-md w-full space-y-4 bg-white p-8 rounded-xl shadow-xs border border-slate-200 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
          <h2 className="text-xl font-bold text-portal-navy">
            Password Reset Successfully
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your candidate account password has been updated. Redirecting you to sign in...
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="btn-primary w-full"
            >
              Sign In to Candidate Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 font-sans">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-xl shadow-xs border border-slate-200">
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
            Account Recovery
          </span>
          <h2 className="text-xl font-bold tracking-tight text-portal-navy">
            {step === 'request' ? 'Forgot Password' : 'Reset Your Password'}
          </h2>
          <p className="text-xs text-slate-500">
            {step === 'request'
              ? 'Enter your registered email or mobile to receive a secure recovery code.'
              : `Enter the 6-digit OTP sent to ${identifier} and choose a new password.`}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {step === 'request' ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="form-label">
                Registered Email or Mobile Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. student@example.com or 9876543210"
                className="form-input-field"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Sending Recovery Code...' : 'Send Recovery OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="form-label text-center">
                6-Digit Recovery OTP <span className="text-rose-500">*</span>
              </label>
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

            <div>
              <label className="form-label">
                New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="form-input-field pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="form-label">
                Confirm New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="form-input-field pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Resetting Password...' : 'Save New Password'}
            </button>
          </form>
        )}

        <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
          <Link href="/" className="hover:text-portal-navy transition font-medium">
            Return to Sign In
          </Link>
          <Link href="/register" className="text-portal-navy font-semibold hover:underline">
            New Registration
          </Link>
        </div>
      </div>
    </div>
  );
}
