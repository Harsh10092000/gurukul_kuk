'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  KeyRound, 
  Mail, 
  Lock, 
  Phone, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
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
          action: 'resend',
          actionType: 'forgot_password',
          identifier: identifier.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to resend recovery code.');
      } else {
        setResendSuccess('A fresh 6-digit recovery code has been dispatched to your email/mobile.');
        setResendTimer(30);
        setCanResend(false);
      }
    } catch {
      setError('Unable to resend recovery code at this moment.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!otp.trim() || otp.trim().length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please ensure both fields are identical.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          otp: otp.trim(),
          newPassword,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Password reset failed.');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch {
      setError('An unexpected error occurred during password reset.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 bg-slate-100 font-sans">
        <div className="max-w-md w-full bg-white p-8 sm:p-10 rounded-3xl shadow-xl border border-slate-200 text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gurukul-navy">Password Reset Successfully!</h2>
            <p className="text-xs text-slate-500 mt-1">
              Your account password has been updated. You can now sign in to the portal with your Registration Number and new password.
            </p>
          </div>
          <Link
            href="/"
            className="w-full inline-block py-3.5 bg-gurukul-navy hover:bg-gurukul-navyLight text-white font-extrabold text-xs rounded-xl shadow-lg transition"
          >
            Go to Candidate Sign In Gateway →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-100 font-sans">
      <div className="max-w-md w-full space-y-6 bg-white p-8 sm:p-10 rounded-3xl shadow-xl border border-slate-200">
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
            Account Recovery
          </span>
          <h2 className="text-2xl font-black tracking-tight text-gurukul-navy">
            {step === 'request' ? 'Forgot Password?' : 'Reset Your Password'}
          </h2>
          <p className="text-xs text-slate-500">
            {step === 'request'
              ? 'Enter your registered email or mobile to receive a secure recovery code.'
              : `Enter the 6-digit OTP sent to ${identifier} and choose a new password.`}
          </p>
        </div>


        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === 'request' ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Registered Email / Mobile Number *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. student@example.com or 9876543210"
                  className="w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-gurukul-600 hover:from-amber-600 hover:to-gurukul-700 text-white font-extrabold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Sending Recovery Code...</span>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Send Recovery OTP</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 text-center">
                6-Digit Recovery OTP *
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • • • •"
                className="w-full text-center text-xl font-mono font-black tracking-[0.4em] py-2.5 border-2 border-slate-300 rounded-xl focus:border-amber-500 outline-none"
              />
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
                <p className="text-[11px] text-emerald-600 font-medium mt-1 text-center bg-emerald-50 py-1 rounded border border-emerald-200">
                  {resendSuccess}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                New Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Confirm New Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-gurukul-navy to-gurukul-navyLight hover:from-slate-900 hover:to-gurukul-navy text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Resetting Password...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  <span>Update Password & Save</span>
                </>
              )}
            </button>
          </form>
        )}

        <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-800 underline">
            ← Back to Sign In
          </Link>
          <Link href="/register" className="text-gurukul-600 font-bold hover:underline">
            New Registration →
          </Link>
        </div>
      </div>
    </div>
  );
}
