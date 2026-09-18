'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, AlertCircle, FileText, Clock } from 'lucide-react';
import AdmitCardView from '@/components/AdmitCardView';
import { AdmitCard } from '@/lib/types';

export default function AdmitCardPage() {
  const [regNo, setRegNo] = useState('');
  const [dob, setDob] = useState('');
  const [admitCard, setAdmitCard] = useState<AdmitCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [isReleased, setIsReleased] = useState<boolean | null>(null);
  const [checkingRelease, setCheckingRelease] = useState(true);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        const released = data?.settings?.admitCardsReleased === true;
        setIsReleased(released);
        setCheckingRelease(false);
        if (released) {
          fetch('/api/admit-card')
            .then((res) => res.json())
            .then((data) => {
              if (data.admitCard) {
                setAdmitCard(data.admitCard);
                setSearched(true);
              }
            })
            .catch(() => { });
        }
      })
      .catch(() => {
        setCheckingRelease(false);
      });
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNo.trim()) {
      setError('Please enter your Registration Number or Roll Number.');
      return;
    }

    setLoading(true);
    setError('');
    setSearched(true);

    try {
      let url = `/api/admit-card?appId=${encodeURIComponent(regNo.trim())}`;
      if (dob.trim()) {
        url += `&dob=${encodeURIComponent(dob.trim())}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (res.ok && data.admitCard) {
        setAdmitCard(data.admitCard);
      } else {
        setAdmitCard(null);
        setError(data.error || data.message || 'No Admit Card found for the provided Registration Number and Date of Birth.');
      }
    } catch {
      setError('An error occurred while fetching Admit Card.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 print:p-0 print:m-0 print:max-w-full print:space-y-0">
      {/* Header */}
      <div className="text-center space-y-2 no-print">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-portal-navy bg-white border border-slate-200 px-3 py-1 rounded">
          Examination Portal
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Download Entrance Examination Admit Card 2027-28
        </h1>
        <p className="text-xs text-slate-500 max-w-lg mx-auto">
          Enter your Registration Number or Roll Number to verify your examination centre and print your Hall Ticket.
        </p>
      </div>

      {/* Loading Release Status */}
      {checkingRelease ? (
        <div className="max-w-md mx-auto portal-card p-8 text-center space-y-3 no-print">
          <div className="w-8 h-8 border-2 border-portal-navy border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-700">Verifying Admit Card Release Schedule...</p>
        </div>
      ) : !isReleased ? (
        <div className="max-w-md mx-auto portal-card p-6 text-center space-y-3 no-print border-amber-300 bg-amber-50/50">
          <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
              Schedule Pending
            </span>
            <h2 className="text-base font-bold text-slate-900 pt-1">
              Admit Cards Not Yet Released
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
              Admit Cards for Entrance Examination Session 2027-28 are currently in preparation and will be issued collectively by the Examination Cell.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/"
              className="btn-secondary text-xs px-4 py-2"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Important Exam Guidelines Alert */}
          <div className="max-w-lg mx-auto p-4 rounded-xl bg-amber-50/90 border border-amber-300 text-amber-950 text-xs space-y-1.5 no-print shadow-xs">
            <div className="flex items-center gap-2 font-bold text-amber-900 text-xs">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Mandatory Examination Day Instructions:</span>
            </div>
            <ul className="list-disc list-inside text-[11.5px] text-amber-900 pl-1 space-y-1">
              <li>Candidate must carry a <strong className="underline">COLOURED printout</strong> of the Admit Card.</li>
              <li>Candidate must bring <strong className="underline">ONE ORIGINAL Photo ID Proof</strong> (Aadhaar Card, Passport, or School ID). Photocopies are not allowed.</li>
            </ul>
          </div>

          {/* Search Box */}
          <div className="max-w-lg mx-auto portal-card p-5 no-print">
            <form onSubmit={handleSearch} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="form-label">
                    Registration No. / Roll No. <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={regNo}
                    onChange={(e) => setRegNo(e.target.value)}
                    placeholder="e.g. NILB-00001"
                    className="form-input-field font-mono font-semibold uppercase"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">
                    Date of Birth <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="form-input-field font-mono"
                    required
                  />
                </div>
              </div>

              <div className="pt-1 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary text-xs px-5 py-2"
                >
                  {loading ? 'Verifying Details...' : 'Search Admit Card'}
                </button>
              </div>
            </form>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="max-w-lg mx-auto p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 no-print">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </>
      )}

      {/* Render Results */}
      {loading ? (
        <div className="max-w-md mx-auto portal-card p-6 text-center space-y-2 no-print">
          <div className="w-6 h-6 border-2 border-portal-navy border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-700">Locating Hall Ticket Record...</p>
        </div>
      ) : admitCard ? (
        <AdmitCardView admitCard={admitCard} />
      ) : searched ? (
        <div className="text-center py-8 text-slate-500 text-xs no-print space-y-2">
          <FileText className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="font-semibold text-slate-700">No Admit Card Available</p>
          <p className="text-slate-400 max-w-xs mx-auto">
            Please verify your registration credentials and ensure payment has been confirmed.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-portal-navy hover:underline"
            >
              Check Status in Dashboard
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
