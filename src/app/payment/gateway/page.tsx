'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  Lock,
  QrCode,
  CreditCard,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  Smartphone,
  ExternalLink,
} from 'lucide-react';

interface PaymentOrderDetails {
  orderId: string;
  amount: number;
  currency: string;
  status: string;
  registrationNumber?: string | null;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  classApplying: string;
  gender: string;
  studyLocation: string;
  createdAt: string;
}

function PaymentGatewayInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id') || searchParams.get('orderId') || '';

  const [order, setOrder] = useState<PaymentOrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'upi' | 'card' | 'netbanking'>('upi');

  // Interactive Payment State
  const [paymentStep, setPaymentStep] = useState<'idle' | 'authorizing' | 'approved' | 'redirecting'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [upiId, setUpiId] = useState('');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes timer
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Fetch Order Particulars
  useEffect(() => {
    if (!orderId) {
      setError('Invalid payment request: No Order ID provided.');
      setLoading(false);
      return;
    }

    fetch(`/api/payment/hdfc/status?order_id=${encodeURIComponent(orderId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.success || !data.order) {
          setError(data.error || 'Payment order not found or session expired.');
          setLoading(false);
          return;
        }

        if (data.order.status === 'CHARGED') {
          // Already paid
          window.location.replace('/dashboard?registered=true');
          return;
        }

        setOrder(data.order);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to connect to payment gateway service. Please check your connection.');
        setLoading(false);
      });
  }, [orderId]);

  // Expiration countdown
  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle Confirmed Payment Submission
  const handleExecutePayment = (method: string) => {
    if (!orderId || paymentStep !== 'idle') return;

    setPaymentStep('authorizing');
    setStatusMessage('Initiating bank authorization with HDFC SmartGateway...');

    setTimeout(() => {
      setStatusMessage(`Authorizing ₹800.00 via ${method}...`);
      setTimeout(() => {
        setPaymentStep('approved');
        setStatusMessage('Payment Confirmed! Generating permanent registration & admit card...');

        setTimeout(() => {
          setPaymentStep('redirecting');
          // Submit directly to return endpoint
          window.location.href = `/api/payment/hdfc/return?order_id=${encodeURIComponent(orderId)}&dummy=true`;
        }, 1200);
      }, 1400);
    }, 1000);
  };

  // Handle Cancellation
  const handleCancelPayment = async () => {
    setCancelling(true);
    try {
      await fetch('/api/payment/hdfc/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
    } catch {
      // Proceed even if cancel endpoint call fails
    }
    // Return candidate back to step 6 with preserved form state
    router.push('/apply?cancelled=true');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white border border-slate-200 shadow-xl rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 border-4 border-portal-navy border-t-amber-500 rounded-full animate-spin mx-auto" />
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-800">Opening HDFC SmartGateway...</h2>
            <p className="text-xs text-slate-500">Establishing 256-bit encrypted banking session...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white border border-rose-200 shadow-xl rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-slate-900">Payment Gateway Error</h2>
            <p className="text-xs text-rose-700">{error || 'Session could not be initialized.'}</p>
          </div>
          <div className="pt-2">
            <Link
              href="/apply"
              className="btn-primary text-xs w-full justify-center py-2.5"
            >
              Return to Application Form
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white font-sans text-slate-800 py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Top Bank & Institution Brand Header */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-portal-navy/10 flex items-center justify-center border border-portal-navy/20 p-1.5">
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
                <span className="text-[11px] font-bold uppercase tracking-wider text-portal-navy bg-portal-navy/5 px-2 py-0.5 rounded border border-portal-navy/10">
                  Official Entrance Fee
                </span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Test / Demo Gateway
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 pt-0.5">
                The Gurukul Kurukshetra (MID: SG6256)
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 text-right">
            <div className="hidden sm:block">
              <span className="text-[10px] text-slate-400 block font-mono">POWERED BY</span>
              <span className="text-xs font-bold text-blue-900 tracking-tight flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-600" /> HDFC SmartGateway
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-700" />
              <span className="text-xs font-mono font-bold">{formatTimer(timeLeft)}</span>
            </div>
          </div>
        </div>

        {/* Order Details Banner */}
        <div className="bg-portal-navy text-white rounded-2xl shadow-md p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-white/80">
              <span>Candidate: <strong className="text-white">{order.candidateName}</strong></span>
              <span>•</span>
              <span>Class: <strong className="text-white">{order.classApplying}</strong></span>
            </div>
            <p className="text-xs text-white/70 font-mono">
              Order Ref: <span className="text-amber-300 font-bold">{order.orderId}</span>
            </p>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-white/70 block uppercase tracking-wider">Total Amount Due</span>
            <div className="flex items-baseline justify-end gap-1">
              <span className="text-3xl font-extrabold text-amber-400">₹{order.amount.toFixed(2)}</span>
              <span className="text-xs text-white/70 font-mono">INR</span>
            </div>
          </div>
        </div>

        {/* Active Payment Processing Modal Overlay */}
        {paymentStep !== 'idle' && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-8 text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
              {paymentStep === 'authorizing' && (
                <div className="w-16 h-16 border-4 border-portal-navy border-t-amber-500 rounded-full animate-spin mx-auto" />
              )}
              {paymentStep === 'approved' && (
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-300 animate-bounce">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
              )}
              {paymentStep === 'redirecting' && (
                <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              )}

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-900">
                  {paymentStep === 'authorizing' && 'Processing Banking Authorization...'}
                  {paymentStep === 'approved' && 'Payment Succeeded!'}
                  {paymentStep === 'redirecting' && 'Redirecting to Candidate Dashboard...'}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {statusMessage}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs font-mono space-y-1 text-slate-600">
                <div className="flex justify-between">
                  <span>Merchant:</span>
                  <span className="font-bold text-slate-900">The Gurukul (SG6256)</span>
                </div>
                <div className="flex justify-between">
                  <span>Transaction Amount:</span>
                  <span className="font-bold text-emerald-700">₹800.00</span>
                </div>
                <div className="flex justify-between">
                  <span>Session Security:</span>
                  <span className="text-slate-700">TLS 1.3 / AES-256</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Payment Checkout Box */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-elevated overflow-hidden">
          {/* Method Selector Tabs */}
          <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50/70 p-1.5 gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('upi')}
              className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'upi'
                  ? 'bg-white text-portal-navy shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <QrCode className="w-4 h-4 text-emerald-600" />
              <span>UPI / QR Code</span>
              <span className="hidden sm:inline text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                Fastest
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('card')}
              className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'card'
                  ? 'bg-white text-portal-navy shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <CreditCard className="w-4 h-4 text-blue-600" />
              <span>Debit / Credit Card</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('netbanking')}
              className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'netbanking'
                  ? 'bg-white text-portal-navy shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Building2 className="w-4 h-4 text-amber-600" />
              <span>Net Banking</span>
            </button>
          </div>

          <div className="p-6 sm:p-8">
            {/* TAB 1: UPI & QR CODE */}
            {activeTab === 'upi' && (
              <div className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6 items-center">
                  {/* Visual Dynamic QR Code */}
                  <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 text-center space-y-3">
                    <div className="relative p-3 bg-white rounded-xl shadow-sm border border-slate-200">
                      {/* SVG representation of UPI QR */}
                      <svg
                        className="w-48 h-48 mx-auto"
                        viewBox="0 0 100 100"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        {/* Finder patterns */}
                        <rect width="100" height="100" fill="white" />
                        <rect x="5" y="5" width="26" height="26" fill="#1e293b" rx="2" />
                        <rect x="9" y="9" width="18" height="18" fill="white" rx="1" />
                        <rect x="13" y="13" width="10" height="10" fill="#1e293b" />

                        <rect x="69" y="5" width="26" height="26" fill="#1e293b" rx="2" />
                        <rect x="73" y="9" width="18" height="18" fill="white" rx="1" />
                        <rect x="77" y="13" width="10" height="10" fill="#1e293b" />

                        <rect x="5" y="69" width="26" height="26" fill="#1e293b" rx="2" />
                        <rect x="9" y="73" width="18" height="18" fill="white" rx="1" />
                        <rect x="13" y="77" width="10" height="10" fill="#1e293b" />

                        {/* QR Matrix Elements */}
                        <rect x="36" y="8" width="5" height="5" fill="#1e293b" />
                        <rect x="46" y="8" width="5" height="5" fill="#1e293b" />
                        <rect x="56" y="8" width="5" height="5" fill="#1e293b" />
                        <rect x="41" y="18" width="5" height="5" fill="#1e293b" />
                        <rect x="51" y="18" width="5" height="5" fill="#1e293b" />

                        <rect x="8" y="36" width="5" height="5" fill="#1e293b" />
                        <rect x="18" y="41" width="5" height="5" fill="#1e293b" />
                        <rect x="8" y="51" width="5" height="5" fill="#1e293b" />
                        <rect x="23" y="56" width="5" height="5" fill="#1e293b" />

                        <rect x="36" y="36" width="28" height="28" fill="#0f172a" rx="4" />
                        <text
                          x="50"
                          y="53"
                          fill="#fbbf24"
                          fontSize="9"
                          fontWeight="bold"
                          textAnchor="middle"
                          fontFamily="sans-serif"
                        >
                          ₹800
                        </text>

                        <rect x="69" y="36" width="5" height="5" fill="#1e293b" />
                        <rect x="79" y="41" width="5" height="5" fill="#1e293b" />
                        <rect x="89" y="46" width="5" height="5" fill="#1e293b" />
                        <rect x="74" y="56" width="5" height="5" fill="#1e293b" />

                        <rect x="36" y="69" width="5" height="5" fill="#1e293b" />
                        <rect x="46" y="74" width="5" height="5" fill="#1e293b" />
                        <rect x="56" y="69" width="5" height="5" fill="#1e293b" />
                        <rect x="41" y="84" width="5" height="5" fill="#1e293b" />
                        <rect x="51" y="89" width="5" height="5" fill="#1e293b" />
                        <rect x="61" y="84" width="5" height="5" fill="#1e293b" />
                        <rect x="71" y="74" width="5" height="5" fill="#1e293b" />
                        <rect x="81" y="84" width="5" height="5" fill="#1e293b" />
                        <rect x="91" y="89" width="5" height="5" fill="#1e293b" />
                      </svg>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-800 block">
                        Scan &amp; Pay ₹800.00
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Supports Google Pay, PhonePe, Paytm, BHIM, CRED
                      </p>
                    </div>
                  </div>

                  {/* UPI Action Panel */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-700 block">
                        Or Enter Candidate / Parent UPI ID
                      </span>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          placeholder="e.g. yourname@okhdfcbank"
                          className="input-field text-xs flex-1"
                        />
                      </div>
                      <span className="text-[11px] text-slate-400 block">
                        A collect request of ₹800 will be simulated to this VPA.
                      </span>
                    </div>

                    <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5 text-xs text-emerald-950">
                      <span className="font-bold flex items-center gap-1.5 text-emerald-900">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        Instant Test Payment Simulator
                      </span>
                      <p className="text-[11px] text-emerald-900/80 leading-relaxed">
                        Click the button below to simulate successful payment authorization of ₹800. The system will verify the transaction, assign your permanent Registration Number, and redirect to your dashboard.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleExecutePayment('UPI')}
                      className="w-full btn-primary text-xs py-3 font-bold justify-center shadow-md bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Simulate Successful UPI Payment (₹800.00)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: DEBIT / CREDIT CARDS */}
            {activeTab === 'card' && (
              <div className="space-y-5 max-w-md mx-auto">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Card Number
                    </label>
                    <input
                      type="text"
                      readOnly
                      value="4532 •••• •••• 8000 (Test HDFC Visa)"
                      className="input-field text-xs bg-slate-50 font-mono text-slate-700"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Valid Thru
                      </label>
                      <input
                        type="text"
                        readOnly
                        value="12 / 28"
                        className="input-field text-xs bg-slate-50 font-mono text-slate-700 text-center"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        CVV / CVC
                      </label>
                      <input
                        type="password"
                        readOnly
                        value="800"
                        className="input-field text-xs bg-slate-50 font-mono text-slate-700 text-center"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={order.candidateName}
                      className="input-field text-xs bg-slate-50 font-medium text-slate-700"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleExecutePayment('Debit/Credit Card')}
                  className="w-full btn-primary text-xs py-3 font-bold justify-center shadow-md"
                >
                  Pay ₹800.00 via Card
                </button>
              </div>
            )}

            {/* TAB 3: NET BANKING */}
            {activeTab === 'netbanking' && (
              <div className="space-y-5 max-w-lg mx-auto">
                <span className="text-xs font-bold text-slate-700 block text-center">
                  Select Participating Bank
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    'HDFC Bank',
                    'State Bank of India',
                    'ICICI Bank',
                    'Axis Bank',
                    'Punjab National Bank',
                    'Kotak Mahindra',
                  ].map((bank) => (
                    <button
                      key={bank}
                      type="button"
                      onClick={() => setSelectedBank(bank)}
                      className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                        selectedBank === bank
                          ? 'border-portal-navy bg-portal-navy/5 text-portal-navy shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      {bank}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleExecutePayment(`NetBanking (${selectedBank})`)}
                  className="w-full btn-primary text-xs py-3 font-bold justify-center shadow-md"
                >
                  Pay ₹800.00 via {selectedBank}
                </button>
              </div>
            )}
          </div>

          {/* Bottom Security Footer & Cancel Action */}
          <div className="border-t border-slate-200 bg-slate-50/70 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-500">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>PCI-DSS Compliant • 256-Bit SSL Encrypted Banking</span>
            </div>

            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="text-xs font-bold text-rose-700 hover:text-rose-900 underline flex items-center gap-1"
            >
              Cancel Payment &amp; Return to Form
            </button>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-elevated border border-slate-200 max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Cancel Payment?</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Your application details are safely preserved in draft. You will not be registered until payment of the ₹800 fee is received.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="btn-secondary text-xs flex-1 justify-center py-2"
              >
                Keep Paying
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={handleCancelPayment}
                className="btn-primary text-xs flex-1 justify-center py-2 bg-rose-600 hover:bg-rose-700 text-white"
              >
                {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PaymentGatewayPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="w-10 h-10 border-4 border-portal-navy border-t-amber-500 rounded-full animate-spin" />
        </div>
      }
    >
      <PaymentGatewayInner />
    </Suspense>
  );
}
