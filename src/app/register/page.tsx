'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  UserPlus, 
  Mail, 
  Lock, 
  Phone, 
  User, 
  AlertCircle, 
  ArrowRight, 
  CheckCircle, 
  Copy, 
  Check,
  ShieldCheck,
  Eye,
  EyeOff,
  KeyRound,
  RotateCcw
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password Visibility State
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP Verification State
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [otp, setOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // UI state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);

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

  // Validate form details and request OTP
  const handleInitiateRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. Name validation
    if (!name.trim() || name.trim().length < 2) {
      setError('Please enter candidate’s full name as per Aadhaar Card.');
      return;
    }

    // 2. Email validation (RFC 5322 standard regex)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address (e.g., student@example.com).');
      return;
    }

    // 3. Indian Phone number validation
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(cleanPhone)) {
      setError('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
      return;
    }

    // 4. Password validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    // 5. Confirm password match
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please ensure both password fields are identical.');
      return;
    }

    setLoading(true);

    try {
      // Send OTP to email / WhatsApp
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

  // Resend OTP handler
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

  // Verify OTP and complete registration
  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!otp.trim() || otp.trim().length !== 6) {
      setError('Please enter the 6-digit OTP received on your email / WhatsApp.');
      return;
    }

    setLoading(true);
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    try {
      // 1. Verify OTP first
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

      // 2. Complete Account Creation
      const regRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: cleanPhone,
          password,
          otp: otp.trim(),
        }),
      });
      const regData = await regRes.json();

      if (!regRes.ok) {
        setError(regData.error || 'Failed to complete registration.');
        setLoading(false);
        return;
      }

      // 3. Success! Purge any previous user's draft from browser so new candidate starts clean
      try {
        localStorage.removeItem('gurukul_application_draft');
      } catch (e) {}

      setRegisteredSuccess(true);
      setLoading(false);
    } catch {
      setError('An error occurred during account registration. Please try again.');
      setLoading(false);
    }
  };

  // Screen 3: Registration & Verification Success Card (Registration No is deferred until fee payment)
  if (registeredSuccess) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 bg-slate-100">
        <div className="max-w-lg w-full bg-white p-8 rounded-3xl shadow-2xl border border-slate-200 text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle className="w-10 h-10" />
          </div>

          <div>
            <span className="text-[10px] font-mono font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
              Account Verified Successfully
            </span>
            <h2 className="text-2xl font-black text-gurukul-navy mt-2">
              Registration & Verification Completed!
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Your account has been created and your contact details have been verified.
            </p>
          </div>

          {/* Candidate Profile Summary */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 text-left space-y-2">
            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div>
                <span className="text-slate-400 block font-medium">Candidate Name:</span>
                <strong className="text-slate-800">{name}</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Mobile Number:</span>
                <strong className="text-slate-800">+91-{phone.slice(-10)}</strong>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block font-medium">Registered Email:</span>
                <strong className="text-slate-800">{email}</strong>
              </div>
            </div>
          </div>

          {/* Next Steps CTA */}
          <div className="space-y-3 pt-2">
            <button
              onClick={() => router.push('/apply')}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-gurukul-600 hover:from-amber-600 hover:to-gurukul-700 text-white font-extrabold text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2"
            >
              <span>Proceed to Fill Entrance Application Form</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              href="/dashboard"
              className="block text-xs text-slate-500 hover:text-slate-900 font-semibold"
            >
              Go to Candidate Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Screen 2: OTP Verification Card
  if (step === 'otp') {
    return (
      <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-100">
        <div className="max-w-md w-full space-y-6 bg-white p-8 sm:p-10 rounded-3xl shadow-xl border border-slate-200">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-amber-100 text-gurukul-600 rounded-2xl flex items-center justify-center mx-auto">
              <KeyRound className="w-7 h-7" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gurukul-600 bg-amber-100 px-3 py-1 rounded-full inline-block">
              Security Step 2: Verification
            </span>
            <h2 className="text-2xl font-black tracking-tight text-gurukul-navy">
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
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleVerifyAndRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 text-center">
                Enter 6-Digit OTP *
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • • • •"
                className="w-full text-center text-2xl font-mono font-black tracking-[0.5em] py-3 border-2 border-slate-300 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-3.5 px-4 rounded-xl shadow-md text-base font-extrabold text-white bg-gradient-to-r from-amber-500 to-gurukul-600 hover:from-amber-600 hover:to-gurukul-700 disabled:opacity-50 transition flex items-center justify-center tracking-wide"
            >
              {loading ? 'Verifying...' : 'Verify'}
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
              className="hover:text-slate-800 underline"
            >
              ← Edit Phone / Email
            </button>

            {canResend ? (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading}
                className="text-gurukul-600 font-bold hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Resend OTP
              </button>
            ) : (
              <span className="text-slate-400 font-medium">
                Resend OTP in <strong>{resendTimer}s</strong>
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Screen 1: Details Entry with Password Visibility Eye Icons
  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-100">
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
          <span className="text-[10px] font-bold uppercase tracking-wider text-gurukul-600 bg-amber-100 px-3 py-1 rounded-full inline-block">
            Entrance Session 2026-27
          </span>
          <h2 className="text-2xl font-black tracking-tight text-gurukul-navy">
            Candidate Registration
          </h2>
          <p className="text-xs text-slate-500">
            Verify via Email/WhatsApp OTP to generate your permanent Registration Number.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="mt-4 space-y-4" onSubmit={handleInitiateRegistration}>
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Candidate Full Name (As per AADHAAR CARD) *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="As per candidate's Aadhaar Card"
                className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
              />
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Used for sending Registration Number, Admit Card, and notifications.
            </p>
          </div>

          {/* Mobile Phone Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Mobile / WhatsApp Number *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
              <span className="absolute left-9 top-3 text-xs font-bold text-slate-500">+91</span>
              <input
                type="tel"
                required
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="9876543210"
                className="w-full pl-16 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition font-mono"
              />
            </div>
          </div>

          {/* Password with Eye Icon */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password with Eye Icon and Match Check */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Confirm Password *
              </label>
              {confirmPassword && (
                <span className={`text-[10px] font-bold ${
                  password === confirmPassword ? 'text-emerald-600' : 'text-red-500'
                }`}>
                  {password === confirmPassword ? '✓ Passwords Match' : '✗ Passwords Differ'}
                </span>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className={`w-full pl-10 pr-10 py-2.5 text-sm border rounded-xl focus:ring-2 outline-none transition ${
                  confirmPassword && password !== confirmPassword 
                    ? 'border-red-400 focus:ring-red-300' 
                    : 'border-slate-300 focus:ring-amber-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                title={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 rounded-xl shadow-md text-base font-extrabold text-white bg-gradient-to-r from-amber-500 to-gurukul-600 hover:from-amber-600 hover:to-gurukul-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition flex items-center justify-center tracking-wide"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </form>

        <div className="pt-2 text-center text-xs text-slate-600">
          Already registered?{' '}
          <Link href="/" className="font-bold text-gurukul-600 hover:underline">
            Sign In with Registration No.
          </Link>
        </div>
      </div>
    </div>
  );
}
