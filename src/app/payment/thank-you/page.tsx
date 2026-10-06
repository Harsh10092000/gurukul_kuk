'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  LogOut,
  LayoutDashboard,
  Receipt,
  FileCheck,
  RefreshCw,
  Home,
  HelpCircle,
} from 'lucide-react';

interface VerifiedPayload {
  verified: boolean;
  order?: {
    orderId: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: string;
    txnId: string;
  };
  application?: {
    id: string;
    registrationNumber: string;
    applicationNumber: string;
    classApplying: string;
    studyLocation: any;
    candidateName: string;
    candidateEmail: string;
    candidatePhone: string;
    paymentStatus: string;
    amountPaid: number;
    transactionId: string;
    createdAt: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    registrationNumber: string;
  };
  error?: string;
}

function ThankYouContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = (searchParams.get('orderId') || searchParams.get('order_id') || '').trim();
  const regNo = (searchParams.get('regNo') || searchParams.get('reg_no') || '').trim();

  const [verifiedData, setVerifiedData] = useState<VerifiedPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);

  const verifyPaymentRecord = () => {
    setLoading(true);
    setErrorMessage('');

    if (!orderId) {
      setLoading(false);
      setErrorMessage('No payment reference (Order ID) was provided in the URL.');
      return;
    }

    // Strictly fetch live database state with cache: 'no-store'
    fetch(`/api/payment/verify-order?orderId=${encodeURIComponent(orderId)}&regNo=${encodeURIComponent(regNo)}`, {
      cache: 'no-store',
      headers: {
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache',
      },
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.verified) {
          setErrorMessage(data.error || 'Payment and registration details could not be verified in the institutional database.');
          setVerifiedData(null);
        } else {
          setVerifiedData(data);
          // Safely clear stale application drafts now that payment & application are officially confirmed in DB
          try {
            localStorage.removeItem('gurukul_application_draft');
            sessionStorage.removeItem('gurukul_reg_info');
          } catch { }
        }
      })
      .catch((err) => {
        setErrorMessage('Failed to connect to database verification service: ' + (err?.message || 'Network error'));
        setVerifiedData(null);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    // Lock history so back button does not navigate back to payment gateway
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('popstate', handlePopState);

    verifyPaymentRecord();

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [orderId, regNo]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      localStorage.removeItem('gurukul_application_draft');
      sessionStorage.removeItem('gurukul_reg_info');
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch { }
    window.location.replace('/');
  };

  // State 1: Verification in Progress
  if (loading) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center font-sans px-4">
        <div className="max-w-md w-full bg-white border border-slate-200 shadow-lg rounded-2xl p-8 text-center space-y-4">
          <div className="w-12 h-12 border-4 border-portal-navy border-t-amber-500 rounded-full animate-spin mx-auto" />
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-800">Verifying Bank &amp; Database Records</h2>
            <p className="text-xs text-slate-500">
              Querying institutional MySQL repository to confirm actual payment settlement and candidate creation...
            </p>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px] font-mono text-slate-600 truncate">
            Order Reference: {orderId || 'Scanning...'}
          </div>
        </div>
      </div>
    );
  }

  // State 2: Verification Failed (No Cache / No Fake Approval)
  if (errorMessage || !verifiedData?.verified || !verifiedData.application) {
    return (
      <div className="min-h-[85vh] bg-slate-50 py-12 px-4 sm:px-6 font-sans">
        <div className="max-w-xl mx-auto space-y-6">
          <div className="bg-white border border-rose-200 rounded-2xl shadow-elevated overflow-hidden">
            {/* Header Alert Strip */}
            <div className="bg-gradient-to-r from-rose-600 to-red-700 p-6 text-white text-center">
              <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-md">
                <XCircle className="w-8 h-8 text-rose-600" />
              </div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-white/20 px-3 py-0.5 rounded-full inline-block mb-1.5">
                Verification Required
              </span>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">
                Payment Verification Incomplete
              </h1>
              <p className="text-xs text-rose-100 max-w-sm mx-auto mt-1">
                Candidate registrations are only approved after actual payment settlement and creation in the database.
              </p>
            </div>

            {/* Error Body */}
            <div className="p-6 sm:p-8 space-y-5">
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>Institutional Database Status:</span>
                </div>
                <p className="text-[12px] leading-relaxed">
                  {errorMessage || 'No confirmed transaction matching this Order ID was found in the database.'}
                </p>
              </div>

              {orderId && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Query Reference Order ID
                  </span>
                  <span className="font-mono font-semibold text-slate-800 text-[11.5px] mt-0.5 block break-all">
                    {orderId}
                  </span>
                </div>
              )}

              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <HelpCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>What should you do?</span>
                </div>
                <ul className="list-disc pl-4 space-y-1 text-[11.5px] text-amber-900/90 pt-1">
                  <li>If your account was debited, please check your candidate dashboard or wait 2-3 minutes for the bank webhook to settle.</li>
                  <li>If payment was not completed, please return to the application form and complete the fee payment.</li>
                  <li>Need assistance? Contact our Admission Helpdesk at <strong>+91 7027849858 / 59</strong>.</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={verifyPaymentRecord}
                  className="btn-secondary flex-1 text-xs h-11 justify-center gap-2 font-bold"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Re-check Verification Status</span>
                </button>

                <Link
                  href="/dashboard"
                  className="btn-primary flex-1 text-xs h-11 justify-center gap-2 font-bold"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Go to Dashboard</span>
                </Link>
              </div>
            </div>
          </div>

          <div className="text-center text-xs text-slate-500">
            <p>The Gurukul Nilokheri • CBSE Affiliated Institution</p>
          </div>
        </div>
      </div>
    );
  }

  // State 3: Confirmed & Verified Live from MySQL Database
  const { application, order, user } = verifiedData;
  const displayRegNo = application.registrationNumber || application.applicationNumber;
  const studyLoc =
    application.studyLocation?.firstPreference ||
    application.studyLocation?.studyLocation ||
    'The Gurukul Nilokheri';

  return (
    <div className="min-h-[85vh] bg-slate-50 py-10 px-4 sm:px-6 font-sans">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Main Success Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-elevated overflow-hidden">
          {/* Top Banner Strip */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white text-center relative overflow-hidden">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-md">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-widest bg-white/20 px-3 py-0.5 rounded-full inline-block mb-1.5">
              Entrance Session 2027-28
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Payment Confirmed &amp; Application Approved!
            </h1>
            <p className="text-xs text-emerald-100 max-w-md mx-auto mt-1">
              Your official examination fee has been verified in the institutional database and your entrance application is permanently registered.
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Registration Number Highlight Card */}
            <div className="bg-portal-navy/5 border-2 border-dashed border-portal-navy/30 rounded-xl p-5 text-center space-y-1">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500 block">
                Permanent Registration ID
              </span>
              <div className="text-2xl sm:text-3xl font-mono font-black text-portal-navy tracking-tight">
                {displayRegNo}
              </div>
              <p className="text-[11px] text-slate-500">
                Please quote this permanent registration number for all future academic correspondence.
              </p>
            </div>

            {/* Particulars Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Candidate Name</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">{application.candidateName}</span>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Fee Amount Paid</span>
                <span className="font-bold text-emerald-700 text-sm mt-0.5 block">
                  ₹{application.amountPaid ? Number(application.amountPaid).toFixed(2) : '800.00'} (Confirmed)
                </span>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Class Applying</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">{application.classApplying}</span>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Preferred Campus</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">{studyLoc}</span>
              </div>
              {order?.orderId && (
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Merchant Order ID</span>
                  <span className="font-mono text-slate-700 text-[11px] mt-0.5 block break-all">{order.orderId}</span>
                </div>
              )}
              {order?.txnId && (
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Bank Transaction ID</span>
                  <span className="font-mono text-slate-700 text-[11px] mt-0.5 block break-all">{order.txnId}</span>
                </div>
              )}
            </div>

            {/* Email Notice Card */}
            <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-300 text-xs text-amber-950 space-y-1">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <Receipt className="w-4 h-4 text-amber-700 flex-shrink-0" />
                <span>Formal Receipt &amp; Examination Advisory Sent</span>
              </div>
              <p className="text-[11.5px] text-amber-900/90 leading-relaxed">
                A formal payment receipt and candidate onboarding details have been dispatched to your registered email address <strong>{application.candidateEmail}</strong>. Coloured Admit Cards will be available for download on your dashboard upon official release.
              </p>
            </div>

            {/* Action Buttons: Go to Dashboard & Logout */}
            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
              <Link
                href="/dashboard"
                className="btn-primary flex-1 text-xs h-11 justify-center gap-2 shadow-sm font-bold"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Go to Candidate Dashboard</span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="btn-secondary text-xs h-11 px-6 justify-center gap-2 text-rose-700 border-rose-200 hover:bg-rose-50 hover:border-rose-300 font-semibold"
              >
                <LogOut className="w-4 h-4 text-rose-600" />
                <span>{loggingOut ? 'Signing Out...' : 'Sign Out'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Institutional Footer Help */}
        <div className="text-center text-xs text-slate-500 space-y-1">
          <p>The Gurukul Nilokheri • CBSE Affiliated Institution</p>
          <p>Admission Cell Helpline: +91 7027849858 / 59 • thegurukulnilokheri@gmail.com</p>
        </div>
      </div>
    </div>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center font-sans">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-portal-navy border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-600">Verifying Application...</p>
          </div>
        </div>
      }
    >
      <ThankYouContent />
    </Suspense>
  );
}
