'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  CheckCircle2,
  Download,
  LogOut,
  LayoutDashboard,
  ShieldCheck,
  Receipt,
  FileCheck,
  ArrowRight,
  Printer
} from 'lucide-react';

function ThankYouContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') || searchParams.get('order_id') || '';
  const regNo = searchParams.get('regNo') || searchParams.get('reg_no') || '';
  const txnId = searchParams.get('txnId') || searchParams.get('txn_id') || '';

  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    // Lock history so back button does not navigate back to payment gateway or apply form
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('popstate', handlePopState);

    // Fetch candidate info
    Promise.all([
      fetch('/api/auth/me').then((r) => r.json()).catch(() => ({})),
      fetch('/api/applications').then((r) => r.json()).catch(() => ({})),
    ])
      .then(([authData, appData]) => {
        if (authData?.user) {
          setCandidate({
            user: authData.user,
            application: appData?.application || null,
          });
        }
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      try {
        localStorage.removeItem('gurukul_application_draft');
      } catch { }
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch { }
    window.location.replace('/');
  };

  const candidateName =
    candidate?.application?.personalInfo?.fullName ||
    candidate?.user?.name ||
    'Registered Candidate';
  const displayRegNo =
    regNo ||
    candidate?.application?.registrationNumber ||
    candidate?.user?.registrationNumber ||
    'NILG-CONFIRMED';
  const candidateClass = candidate?.application?.classApplying || 'Class Seeking';
  const studyLoc =
    candidate?.application?.studyLocation?.firstPreference ||
    candidate?.application?.studyLocationPref?.firstPreference ||
    'The Gurukul Nilokheri';
  const candidateEmail =
    candidate?.application?.personalInfo?.candidateEmail ||
    candidate?.user?.email ||
    '';
  const candidatePhone =
    candidate?.application?.personalInfo?.candidateMobile ||
    candidate?.user?.phone ||
    '';

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
              Payment Successful &amp; Application Confirmed!
            </h1>
            <p className="text-xs text-emerald-100 max-w-md mx-auto mt-1">
              Your official examination fee has been verified and your entrance application is registered in the institutional repository.
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
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">{candidateName}</span>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Fee Amount Paid</span>
                <span className="font-bold text-emerald-700 text-sm mt-0.5 block">₹800.00 (Paid - Verified)</span>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Class Applying</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">{candidateClass}</span>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Preferred Campus</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">{studyLoc}</span>
              </div>
              {orderId && (
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Merchant Order ID</span>
                  <span className="font-mono text-slate-700 text-[11px] mt-0.5 block break-all">{orderId}</span>
                </div>
              )}
              {(txnId || candidate?.application?.transactionId) && (
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">HDFC Transaction ID (Bank Ref)</span>
                  <span className="font-mono text-slate-700 text-[11px] mt-0.5 block break-all">
                    {txnId || candidate?.application?.transactionId}
                  </span>
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
                A formal payment receipt and candidate onboarding details have been dispatched to your registered email address <strong>{candidateEmail}</strong>. Coloured Admit Cards will be available for download on your dashboard upon official release.
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
            <p className="text-xs font-bold text-slate-600">Loading Confirmation...</p>
          </div>
        </div>
      }
    >
      <ThankYouContent />
    </Suspense>
  );
}
