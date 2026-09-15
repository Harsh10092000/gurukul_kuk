'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, CheckCircle2, Clock, AlertCircle, FileText, ArrowRight } from 'lucide-react';
import { Application } from '@/lib/types';

export default function StatusPage() {
  const [appNumber, setAppNumber] = useState('');
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appNumber.trim()) return;

    setLoading(true);
    setError('');
    setSearched(true);

    try {
      const res = await fetch(`/api/applications/${encodeURIComponent(appNumber.trim())}`);
      const data = await res.json();

      if (data.application) {
        setApplication(data.application);
      } else {
        setApplication(null);
        setError('No application found matching this Application Number.');
      }
    } catch {
      setError('An error occurred while tracking status.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <div className="text-center space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-gurukul-600 bg-amber-100 px-3 py-1 rounded-full">
          Live Tracking
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-gurukul-navy">
          Track Registration & Application Status
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Enter your Registration Number (e.g. GK26-10001) to view status, fee verification, and updates.
        </p>
      </div>

      {/* Input box */}
      <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl p-4 shadow-md">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            <input
              type="text"
              value={appNumber}
              onChange={(e) => setAppNumber(e.target.value)}
              placeholder="e.g. GK26-10001"
              className="w-full pl-10 pr-3 py-2.5 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-mono font-bold"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-gurukul-600 hover:bg-gurukul-700 text-white font-bold text-xs rounded-xl transition shadow flex items-center gap-1.5"
          >
            {loading ? 'Tracking...' : 'Track Status'}
          </button>
        </form>
      </div>

      {error && (
        <div className="max-w-xl mx-auto p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {application && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-lg space-y-6">
          <div className="flex flex-wrap justify-between items-center border-b border-slate-100 pb-4 gap-2">
            <div>
              <span className="font-mono text-xs font-bold text-slate-500 block">Application No:</span>
              <span className="font-mono text-xl font-black text-gurukul-navy">{application.applicationNumber}</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 block">Class Applying:</span>
              <span className="font-bold text-gurukul-700 bg-amber-100 px-3 py-1 rounded-full text-xs inline-block">
                {application.classApplying}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block">Candidate Name:</span>
              <span className="font-bold text-slate-900">{application.personalInfo?.fullName}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Father&apos;s Name:</span>
              <span className="font-bold text-slate-900">{application.parentInfo?.fatherName}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Current Status:</span>
              <span className={`font-bold uppercase ${
                application.status === 'approved' ? 'text-emerald-600' : 'text-amber-600'
              }`}>
                {application.status.replace('_', ' ')}
              </span>
            </div>
          </div>

          {application.remarks && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
              <strong className="block text-slate-900 mb-0.5">Administrative Notes:</strong>
              {application.remarks}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Link
              href="/login"
              className="bg-gurukul-600 hover:bg-gurukul-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow transition inline-flex items-center gap-1.5"
            >
              <span>Login to Applicant Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
