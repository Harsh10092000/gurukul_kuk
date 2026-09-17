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
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
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
          Apply Online 2027-28
        </Link>
      </div>
    );
  }

  // Admission Form is directly available upon successful registration & payment
  return (
    <AdmissionFormView
      application={application}
      admitCard={admitCard}
      registrationNumber={currentUser?.registrationNumber || application.registrationNumber || application.applicationNumber}
    />
  );
}

