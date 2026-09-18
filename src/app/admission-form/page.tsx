'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AdmissionFormView from '@/components/AdmissionFormView';
import { Application, AdmitCard } from '@/lib/types';
import { FileText, ArrowLeft, ShieldAlert } from 'lucide-react';

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
      .catch(() => { });

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
      .catch(() => { });
  }, []);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-slate-100 font-sans">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600">Checking Verification Status & Dossier...</p>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 portal-card text-center space-y-4">
        <FileText className="w-12 h-12 text-slate-400 mx-auto" />
        <h2 className="text-xl font-bold tracking-tight text-slate-900">No Application Found</h2>
        <p className="text-xs text-slate-500">
          You must submit an entrance application before generating the official Admission form.
        </p>
        <Link
          href="/apply"
          className="btn-primary inline-flex text-xs px-6 py-2.5"
        >
          Apply Online 2027-28
        </Link>
      </div>
    );
  }

  // Admission Form is strictly for administrative / office use only.
  // Candidates are directed to their Dashboard and Coloured Admit Card.
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  if (!isAdmin) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4 font-sans bg-slate-50">
        <div className="max-w-md w-full portal-card p-6 sm:p-8 text-center space-y-4 shadow-md border-slate-300">
          <div className="w-14 h-14 rounded-full bg-portal-navy/10 text-portal-navy flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7 text-portal-navy" />
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded">
              Office Use Only
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 pt-1">
              Internal Admission Record
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              The official Admission &amp; Enrolment Form is generated exclusively by the Gurukul Administration for internal scrutiny, verification, and office records.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-left text-xs space-y-1 text-amber-950">
            <span className="font-bold block text-amber-900">
              Exam Day Requirement for Candidates:
            </span>
            <ul className="list-disc list-inside text-[11px] space-y-0.5 text-amber-900/90 pl-1">
              <li>Carry a <strong className="underline">COLOURED printout</strong> of your Admit Card.</li>
              <li>Carry <strong className="underline">ONE ORIGINAL Photo ID Proof</strong> (Aadhaar Card, Passport, or School ID).</li>
            </ul>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/dashboard"
              className="btn-primary text-xs h-9 justify-center"
            >
              Return to Candidate Dashboard
            </Link>
            <Link
              href="/admit-card"
              className="btn-secondary text-xs h-9 justify-center"
            >
              Download Coloured Admit Card
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdmissionFormView
      application={application}
      admitCard={admitCard}
      registrationNumber={currentUser?.registrationNumber || application.registrationNumber || application.applicationNumber}
      backUrl="/admin/applications"
      backLabel="Admin Applications"
    />
  );
}

