'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import AdmissionFormView from '@/components/AdmissionFormView';
import { Application, AdmitCard } from '@/lib/types';
import { AlertCircle } from 'lucide-react';

export default function AdminApplicationAdmissionFormPage() {
  const params = useParams();
  const id = params.id as string;

  const [application, setApplication] = useState<Application | null>(null);
  const [admitCard, setAdmitCard] = useState<AdmitCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    fetch(`/api/applications/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.application) {
          setApplication(data.application);
          fetch(`/api/admit-card?appId=${data.application.id}`)
            .then((r) => r.json())
            .then((admitData) => {
              if (admitData.admitCard) setAdmitCard(admitData.admitCard);
            })
            .catch(() => {});
        } else {
          setError(data.error || 'Application record not found.');
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch candidate record.');
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center font-sans">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600">Loading Official Admission Form...</p>
        </div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="p-6 portal-card border-rose-200 text-rose-700 text-xs flex items-center gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span>{error || 'Unable to render Admission form.'}</span>
      </div>
    );
  }

  return (
    <AdmissionFormView
      application={application}
      admitCard={admitCard}
      registrationNumber={application.registrationNumber}
      backUrl={`/admin/applications/${id}`}
      backLabel="Back to Candidate Dossier"
    />
  );
}
