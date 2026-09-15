'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AdmissionFormView from '@/components/AdmissionFormView';
import { Application, AdmitCard } from '@/lib/types';
import { FileText, ArrowLeft, Loader2, ShieldAlert } from 'lucide-react';

export default function CandidateAdmissionFormPage() {
  const [application, setApplication] = useState<Application | null>(null);
  const [admitCard, setAdmitCard] = useState<AdmitCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setCurrentUser(data.user);
      })
      .catch(() => {});

    fetch('/api/applications')
      .then((res) => res.json())
      .then((data) => {
        if (data.application) {
          setApplication(data.application);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch('/api/admit-card')
      .then((res) => res.json())
      .then((data) => {
        if (data.admitCard) setAdmitCard(data.admitCard);
      })
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-slate-100 font-sans">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-amber-500 mx-auto" />
          <p className="text-xs font-bold text-slate-600">Checking Verification Status & Dossier...</p>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white rounded-3xl shadow-xl border border-slate-200 text-center space-y-4 font-sans">
        <FileText className="w-12 h-12 text-slate-400 mx-auto" />
        <h2 className="text-xl font-black text-gurukul-navy">No Application Found</h2>
        <p className="text-xs text-slate-500">
          You must submit an entrance application before generating the official admission form.
        </p>
        <Link
          href="/apply"
          className="inline-block py-2.5 px-6 bg-gurukul-600 text-white font-bold text-xs rounded-xl shadow"
        >
          Apply Online 2026-27
        </Link>
      </div>
    );
  }

  // Enforce Document Verification Gate: Admission Form is ONLY available after approval
  const isApproved =
    application.status === 'approved' ||
    application.status === 'admitted' ||
    Boolean(admitCard?.isReleased);

  if (!isApproved && currentUser?.role !== 'admin') {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 sm:p-10 bg-white rounded-3xl shadow-2xl border border-amber-200 text-center space-y-5 font-sans">
        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-800 bg-amber-100 px-3.5 py-1 rounded-full border border-amber-300">
            Document Scrutiny In Progress
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-gurukul-navy">
            Admission Form Unavailable
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
            The official Admission & Enrolment Form is released <strong>strictly after document verification is approved</strong> by the Admissions Committee.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-left space-y-2 font-mono">
          <div className="flex justify-between">
            <span className="text-slate-500 font-sans">Registration Number:</span>
            <span className="font-bold text-slate-900">{application.registrationNumber || application.applicationNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-sans">Verification Status:</span>
            <span className="font-bold uppercase text-amber-700">{application.status.replace('_', ' ')}</span>
          </div>
        </div>

        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 py-2.5 px-6 bg-gurukul-navy hover:bg-slate-800 text-amber-300 font-bold text-xs rounded-xl shadow transition border border-amber-400/30"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Candidate Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AdmissionFormView
      application={application}
      admitCard={admitCard}
      registrationNumber={currentUser?.registrationNumber}
    />
  );
}
