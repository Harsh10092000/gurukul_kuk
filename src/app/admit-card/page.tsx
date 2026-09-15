'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Download, AlertCircle, FileText, ArrowLeft } from 'lucide-react';
import AdmitCardView from '@/components/AdmitCardView';
import { AdmitCard } from '@/lib/types';

export default function AdmitCardPage() {
  const [query, setQuery] = useState('');
  const [admitCard, setAdmitCard] = useState<AdmitCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Try to load admit card for logged-in user automatically
    fetch('/api/admit-card')
      .then((res) => res.json())
      .then((data) => {
        if (data.admitCard) {
          setAdmitCard(data.admitCard);
          setSearched(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setSearched(true);

    try {
      const res = await fetch(`/api/admit-card?appId=${encodeURIComponent(query.trim())}`);
      const data = await res.json();

      if (data.admitCard) {
        setAdmitCard(data.admitCard);
      } else {
        // Try searching by roll number
        const res2 = await fetch(`/api/admit-card?rollNo=${encodeURIComponent(query.trim())}`);
        const data2 = await res2.json();
        if (data2.admitCard) {
          setAdmitCard(data2.admitCard);
        } else {
          setAdmitCard(null);
          setError('No Admit Card found for the provided Application No. or Roll No.');
        }
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
          Enter your Registration Number (e.g. GK26-10001) or Roll Number to retrieve and print your Hall Ticket.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl p-4 shadow-md no-print">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter Registration No. (e.g. GK26-10001) or Roll No."
              className="w-full pl-10 pr-3 py-2.5 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-mono font-bold"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-gurukul-600 hover:bg-gurukul-700 text-white font-bold text-xs rounded-xl transition shadow flex items-center gap-1.5"
          >
            {loading ? 'Searching...' : 'Find Hall Ticket'}
          </button>
        </form>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="max-w-xl mx-auto p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 no-print">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
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
