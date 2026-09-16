'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Download, AlertCircle, FileText, ArrowLeft, Clock } from 'lucide-react';
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
          // Try to load admit card for logged-in user automatically
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
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2 no-print">
        <span className="text-xs font-bold uppercase tracking-wider text-gurukul-600 bg-amber-100 px-3 py-1 rounded-full">
          Hall Ticket Download
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-gurukul-navy">
          Download Entrance Examination Admit Card 2026-27
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Enter your Registration ID (e.g. NILB-00001 or NILG-00001) or Roll Number to retrieve and print your Hall Ticket.
        </p>
      </div>

      {/* Status Notice if Not Released */}
      {!isReleased && !checkingRelease ? (
        <div className="max-w-xl mx-auto bg-amber-50 border-2 border-amber-300 rounded-3xl p-8 text-center space-y-4 shadow-sm no-print">
          <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Clock className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 bg-amber-200/70 px-3 py-1 rounded-full">
              Status: In Progress
            </span>
            <h2 className="text-xl font-black text-amber-950 pt-2">
              Admit Cards Have Not Been Released Yet
            </h2>
            <p className="text-xs text-amber-900 leading-relaxed max-w-md mx-auto">
              Admit Cards for Entrance Examination (Session 2026-27) are under preparation and will be generated &amp; released collectively by the Admissions Board for all candidates.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-block bg-gurukul-navy hover:bg-slate-800 text-amber-300 font-extrabold text-xs px-5 py-2.5 rounded-xl shadow transition"
            >
              ← Return to Candidate Dashboard
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Search Input Box */}
          <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl p-5 shadow-md no-print">
            <form onSubmit={handleSearch} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Registration No. / Roll No. <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      value={regNo}
                      onChange={(e) => setRegNo(e.target.value)}
                      placeholder="e.g. NILB-00001"
                      className="w-full pl-9 pr-3 py-2 text-xs border rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-mono font-bold uppercase"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-3 py-2 text-xs border rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                    required
                  />
                </div>
              </div>

              <div className="pt-1 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-gurukul-navy hover:bg-slate-900 text-amber-300 font-extrabold text-xs rounded-xl transition shadow flex items-center gap-1.5 border border-amber-400/40"
                >
                  {loading ? 'Verifying Details...' : 'Download Hall Ticket'}
                </button>
              </div>
            </form>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="max-w-xl mx-auto p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 no-print">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </>
      )}

      {/* Render Admit Card */}
      {admitCard ? (
        <AdmitCardView admitCard={admitCard} />
      ) : searched && !loading ? (
        <div className="text-center py-12 text-slate-500 text-sm no-print">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="font-semibold text-slate-700">No Admit Card Available</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            If you have recently submitted your application, please ensure your fee is paid and documents are verified by the administration.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block text-xs font-bold text-gurukul-600 hover:underline"
          >
            View Application Status in Dashboard
          </Link>
        </div>
      ) : null}
    </div>
  );
}
