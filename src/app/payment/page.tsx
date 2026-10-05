'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Lock,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  LogOut,
  ArrowRight,
  AlertCircle,
  Sparkles,
  KeyRound,
} from 'lucide-react';

interface TestUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  registrationNumber: string;
}

const TEST_PAYMENT_AMOUNT = 1; // Strictly ₹1.00 for testing sideflow

function PaymentTestingPortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const stepParam = searchParams.get('step');
  const orderId = searchParams.get('orderId') || searchParams.get('order_id') || '';
  const txnId = searchParams.get('txnId') || searchParams.get('txn_id') || '';
  const amountParam = searchParams.get('amount') || '1';
  const statusParam = searchParams.get('status') || '';

  // Auth & UI State
  const [currentUser, setCurrentUser] = useState<TestUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Form State for Login
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Read stored test session on mount
  useEffect(() => {
    try {
      const match = document.cookie
        .split('; ')
        .find((row) => row.startsWith('payment_test_session='));
      if (match) {
        const decoded = decodeURIComponent(match.split('=')[1]);
        const parsed = JSON.parse(decoded);
        if (parsed?.name) {
          setCurrentUser(parsed);
        }
      }
    } catch {
      // Ignore parse errors
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle Login Submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoginLoading(true);

    try {
      const res = await fetch('/api/payment/test/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Invalid credentials. Please try again.');
        setLoginLoading(false);
        return;
      }

      setCurrentUser(data.user);
      router.replace('/payment?step=pay');
    } catch {
      setErrorMsg('Failed to connect to authentication service. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Quick 1-Click Fill Test Account
  const handleQuickFill = () => {
    setUsername('test@gurukul.com');
    setPassword('Test@123');
    setErrorMsg('');
  };

  // Handle Payment Initiation to HDFC SmartGateway (Strictly ₹1)
  const handleProceedToPay = async () => {
    if (!currentUser) return;
    setSubmittingPayment(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/payment/test/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: currentUser.name,
          email: currentUser.email,
          phone: currentUser.phone,
          registrationNumber: currentUser.registrationNumber,
          amount: TEST_PAYMENT_AMOUNT,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success || !data.paymentUrl) {
        setErrorMsg(data.error || 'Failed to initialize HDFC payment session.');
        setSubmittingPayment(false);
        return;
      }

      // Open official HDFC SmartGateway checkout page
      window.location.href = data.paymentUrl;
    } catch {
      setErrorMsg('Could not reach payment gateway service. Please check your connection.');
      setSubmittingPayment(false);
    }
  };

  // Handle Logout (Clear test session and return to login)
  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/payment/test/logout', { method: 'POST' });
    } catch { }

    setCurrentUser(null);
    document.cookie = 'payment_test_session=; path=/; max-age=0;';
    setLoggingOut(false);
    router.replace('/payment');
  };

  const isThankYouStep = stepParam === 'thankyou' || statusParam === 'success';

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center font-sans">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-portal-navy border-t-amber-500 rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600">Initializing Payment Test Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white py-8 px-4 sm:px-6 font-sans text-slate-800">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-portal-navy/10 flex items-center justify-center border border-portal-navy/20 p-1.5 flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/the-gurukul-nilokheri-logo.png"
                alt="Gurukul Crest"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.currentTarget as any).src = '/logo-gurukul.png';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-portal-navy bg-portal-navy/10 px-2 py-0.5 rounded font-mono">
                  Testing Flow
                </span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> HDFC SmartGateway
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 pt-0.5">
                Payment Gateway Testing Portal
              </h1>
            </div>
          </div>

          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-slate-400 font-mono block">MERCHANT MID</span>
            <span className="text-xs font-bold font-mono text-slate-800">SG6256</span>
          </div>
        </div>

        {/* STEP 3: THANK YOU SCREEN (ONLY LOGOUT BUTTON SHOWN AS REQUESTED) */}
        {isThankYouStep ? (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-elevated overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Top Banner Strip */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 sm:p-8 text-white text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-md">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest bg-white/20 px-3 py-0.5 rounded-full inline-block mb-1.5">
                Transaction Verified
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Payment Successful!
              </h2>
              <p className="text-xs text-emerald-100 max-w-sm mx-auto mt-1">
                The banking gateway has successfully processed and authorized your payment.
              </p>
            </div>

            {/* Receipt Particulars */}
            <div className="p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Bank Status
                  </span>
                  <span className="font-mono font-bold text-emerald-700 text-sm mt-0.5 block flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    CHARGED / SUCCESS
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block tracking-wider">
                    Amount Paid
                  </span>
                  <span className="font-black text-emerald-900 text-base mt-0.5 block font-mono">
                    ₹{parseFloat(amountParam || '1').toFixed(2)} INR
                  </span>
                </div>

                {txnId && (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 sm:col-span-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      HDFC Bank Transaction ID
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-[11px] mt-0.5 block break-all">
                      {txnId}
                    </span>
                  </div>
                )}

                {orderId && (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 sm:col-span-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      Merchant Order ID
                    </span>
                    <span className="font-mono text-slate-700 text-[11px] mt-0.5 block break-all">
                      {orderId}
                    </span>
                  </div>
                )}
              </div>

              {/* ONLY LOGOUT BUTTON ONLY AS REQUESTED */}
              <div className="pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full btn-primary text-xs h-12 justify-center gap-2 bg-portal-navy hover:bg-slate-900 text-white font-bold shadow-md rounded-xl transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{loggingOut ? 'Signing Out...' : 'Sign Out / Logout'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : !currentUser ? (
          /* STEP 1: LOGIN SCREEN (WHEN NOT LOGGED IN) */
          <div className="bg-white border border-slate-200 rounded-2xl shadow-elevated p-6 sm:p-8 space-y-6">
            <div className="space-y-1.5 text-center">
              <div className="w-12 h-12 rounded-full bg-portal-navy/10 text-portal-navy flex items-center justify-center mx-auto border border-portal-navy/20">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Payment Test Portal Login
              </h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Sign in with test credentials or your candidate account to initiate the HDFC SmartGateway test flow.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  Username / Email / Mobile / Reg No.
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="test@gurukul.com"
                  className="input-field text-xs py-2.5 w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="input-field text-xs pl-9 py-2.5 w-full"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full btn-primary text-xs py-3 font-bold justify-center shadow-md bg-portal-navy hover:bg-slate-900 text-white rounded-xl gap-2"
              >
                {loginLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In to Test Payment</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Fill Test Account */}
            <div className="pt-2 border-t border-slate-100 flex flex-col items-center gap-2">
              <span className="text-[11px] text-slate-500 font-medium">Quick Test Credentials:</span>
              <button
                type="button"
                onClick={handleQuickFill}
                className="text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>test@gurukul.com / Test@123 (Click to auto-fill)</span>
              </button>
            </div>
          </div>
        ) : (
          /* STEP 2: SIMPLE 1-RUPEE PAYMENT SCREEN (LOGGED IN) */
          <div className="bg-white border border-slate-200 rounded-2xl shadow-elevated p-6 sm:p-8 space-y-6">
            {/* Authenticated User Info */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-portal-navy text-white flex items-center justify-center font-bold text-xs">
                  {currentUser.name.charAt(0)}
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">{currentUser.name}</span>
                  <span className="text-[11px] text-slate-500 font-mono">{currentUser.email}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Switch User</span>
              </button>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {statusParam === 'cancelled' && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>Payment was cancelled at the gateway. You can re-attempt the payment below.</span>
              </div>
            )}

            {/* Simple Clean Amount Card */}
            <div className="p-6 rounded-2xl bg-slate-900 text-white text-center space-y-1">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                Amount to Pay
              </span>
              <div className="text-4xl font-black text-amber-400">
                ₹1.00 <span className="text-sm font-medium text-slate-300">INR</span>
              </div>
            </div>

            {/* Only the Payment Button */}
            <div>
              <button
                type="button"
                onClick={handleProceedToPay}
                disabled={submittingPayment}
                className="w-full btn-primary py-4 font-bold justify-center shadow-lg bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2 text-base transition-all"
              >
                {submittingPayment ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Connecting to HDFC SmartGateway...</span>
                  </div>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    <span>Pay ₹1.00 via HDFC Gateway</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Minimal Footer */}
        <div className="text-center text-xs text-slate-400">
          <p className="flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>256-Bit SSL Encrypted Banking • HDFC SmartGateway</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PaymentTestingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-portal-navy border-t-amber-500 rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-600">Loading Payment Gateway Test Portal...</p>
          </div>
        </div>
      }
    >
      <PaymentTestingPortalContent />
    </Suspense>
  );
}
