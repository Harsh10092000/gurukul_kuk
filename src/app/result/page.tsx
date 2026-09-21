'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, Award, AlertCircle, FileText, Calendar, Hash, ArrowLeft, Loader2 } from 'lucide-react';
import ScorecardView from '@/components/ScorecardView';
import { ExamResult } from '@/lib/types';

function ResultContent() {
  const searchParams = useSearchParams();
  const [rollNumber, setRollNumber] = useState('');
  const [dob, setDob] = useState('');
  const [result, setResult] = useState<ExamResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [resultsDeclared, setResultsDeclared] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const initialRoll = searchParams.get('rollNo') || searchParams.get('query') || '';
    const initialDob = searchParams.get('dob') || '';
    if (initialRoll) setRollNumber(initialRoll);
    if (initialDob) setDob(initialDob);

    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setCurrentUser(data.user);
      })
      .catch(() => { });

    fetch('/api/results/status')
      .then((res) => res.json())
      .then((statusData) => {
        setResultsDeclared(Boolean(statusData.resultsDeclared));
        if (statusData.resultsDeclared) {
          // If params exist in URL, auto-query
          if (initialRoll) {
            executeSearch(initialRoll, initialDob);
          } else {
            // Check if logged in applicant has a result already
            fetch('/api/results')
              .then((res) => res.json())
              .then((data) => {
                if (data.result) {
                  setResult(data.result);
                  setSearched(true);
                }
                setLoading(false);
              })
              .catch(() => setLoading(false));
          }
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [searchParams]);

  const executeSearch = async (roll: string, birthDate: string) => {
    if (!roll.trim()) {
      setError('Please enter your Roll Number.');
      return;
    }
    if (!birthDate.trim()) {
      setError('Please enter your Date of Birth (DOB) as printed on your Admit Card.');
      return;
    }

    setSearching(true);
    setError('');
    setSearched(true);
    setResult(null);

    try {
      const url = `/api/results?rollNo=${encodeURIComponent(roll.trim())}&dob=${encodeURIComponent(birthDate.trim())}`;
      const res = await fetch(url);
      const data = await res.json();

      if (res.ok && data.result) {
        setResult(data.result);
      } else if (res.status === 403) {
        setResult(null);
        setError(data.error || 'Results have not been officially declared yet.');
      } else {
        // Fallback check with registration / application id
        const res2 = await fetch(`/api/results?appId=${encodeURIComponent(roll.trim())}&dob=${encodeURIComponent(birthDate.trim())}`);
        const data2 = await res2.json();
        if (res2.ok && data2.result) {
          setResult(data2.result);
        } else {
          setResult(null);
          setError(data.error || 'No published result found matching the entered Roll Number and Date of Birth.');
        }
      }
    } catch {
      setError('An error occurred while fetching the entrance exam result.');
    } finally {
      setSearching(false);
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(rollNumber, dob);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center font-sans">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-portal-navy border-t-transparent rounded-full animate-spin mx-auto text-portal-navy" />
          <p className="text-xs font-semibold text-slate-600">Connecting to Gurukul Examination Result Server...</p>
        </div>
      </div>
    );
  }

  if (!resultsDeclared && currentUser?.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto my-16 p-8 portal-card text-center space-y-4">
        <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mx-auto">
          <Award className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded">
            Evaluation In Progress
          </span>
          <h2 className="text-lg font-bold text-slate-900 pt-1">
            Entrance Results Not Yet Declared
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
            Official entrance examination results for Session 2027-28 have not been declared by the Examination Controller yet.
          </p>
          <p className="text-[11px] text-slate-400 pt-1">
            Notifications will be issued to registered candidates once published.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="btn-secondary text-xs px-4 py-2 inline-block"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2 no-print">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-portal-navy bg-white border border-slate-200 px-3 py-1 rounded">
          Official Portal
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Entrance Examination Result 2027-28
        </h1>
        <p className="text-xs text-slate-500 max-w-lg mx-auto">
          Check qualification status and selection remarks declared by The Gurukul Nilokheri Examination Cell.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="max-w-xl mx-auto portal-card p-6 no-print space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-900 text-sm">
            Search Candidate Result
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Enter your Roll Number and Date of Birth as registered in your Admit Card.
          </p>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-portal-navy" />
                Roll Number *
              </label>
              <input
                type="text"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                placeholder="e.g. 270101 or NILB-27-0101"
                required
                className="form-input-field font-mono font-bold uppercase text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-portal-navy" />
                Date of Birth (DOB) *
              </label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                required
                className="form-input-field font-mono text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
            <p className="text-[11px] text-slate-400">
              * Verification uses Roll Number &amp; Date of Birth. Only Qualified / Not Qualified status is published.
            </p>
            <button
              type="submit"
              disabled={searching || !rollNumber.trim() || !dob.trim()}
              className="btn-primary text-xs px-5 py-2.5 flex items-center gap-2 flex-shrink-0 shadow-sm disabled:opacity-60"
            >
              {searching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Verifying Result...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 text-amber-400" />
                  <span>Check Result</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Error notice */}
      {error && (
        <div className="max-w-xl mx-auto p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 no-print shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* In-Page Searching Loader */}
      {searching && (
        <div className="max-w-xl mx-auto portal-card p-8 text-center space-y-3 no-print animate-fadeIn">
          <div className="w-10 h-10 border-3 border-portal-navy border-t-transparent rounded-full animate-spin mx-auto text-portal-navy" />
          <h4 className="font-bold text-slate-800 text-sm">Searching Examination Result...</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Validating credentials for Roll Number <strong className="font-mono text-portal-navy">{rollNumber}</strong> against official entrance examination records.
          </p>
        </div>
      )}

      {/* Result Display */}
      {result && !searching ? (
        <div className="space-y-4">
          <div className="no-print max-w-4xl mx-auto flex justify-between items-center px-1">
            <button
              onClick={() => { setResult(null); setSearched(false); }}
              className="text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Check Another Result</span>
            </button>
          </div>
          <ScorecardView result={result} />
        </div>
      ) : searched && !searching ? (
        <div className="text-center py-10 text-slate-500 text-xs no-print space-y-2">
          <FileText className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="font-semibold text-slate-700">No Published Result Found</p>
          <p className="text-slate-400 max-w-xs mx-auto">
            Please ensure the Roll Number and Date of Birth match the official credentials on your Coloured Admit Card.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-portal-navy border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Loading Result Portal...</p>
        </div>
      </div>
    }>
      <ResultContent />
    </Suspense>
  );
}
