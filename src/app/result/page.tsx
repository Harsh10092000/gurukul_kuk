'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Award, AlertCircle, FileText, ArrowLeft, ShieldAlert } from 'lucide-react';
import ScorecardView from '@/components/ScorecardView';
import { ExamResult } from '@/lib/types';

export default function ResultPage() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<ExamResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [resultsDeclared, setResultsDeclared] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    // 1. Fetch current user
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setCurrentUser(data.user);
      })
      .catch(() => { });

    // 2. Fetch results declaration status
    fetch('/api/results/status')
      .then((res) => res.json())
      .then((statusData) => {
        setResultsDeclared(Boolean(statusData.resultsDeclared));
        if (statusData.resultsDeclared) {
          // If declared, load result for current logged-in user
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
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setError('');
    setSearched(true);

    try {
      const res = await fetch(`/api/results?appId=${encodeURIComponent(query.trim())}`);
      const data = await res.json();

      if (res.ok && data.result) {
        setResult(data.result);
      } else if (res.status === 403) {
        setResult(null);
        setError(data.error || 'Forbidden: You are only authorized to view your own result.');
      } else {
        const res2 = await fetch(`/api/results?rollNo=${encodeURIComponent(query.trim())}`);
        const data2 = await res2.json();
        if (res2.ok && data2.result) {
          setResult(data2.result);
        } else if (res2.status === 403) {
          setResult(null);
          setError(data2.error || 'Forbidden: You are only authorized to view your own result.');
        } else {
          setResult(null);
          setError('No published result found for the entered Roll Number or Application Number.');
        }
      }
    } catch {
      setError('An error occurred while fetching the entrance exam result.');
    } finally {
      setSearching(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-slate-50 font-sans">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600">Verifying Examination Result Records...</p>
        </div>
      </div>
    );
  }

  // If results are NOT officially declared and user is not an administrator, show locked notice
  if (!resultsDeclared && currentUser?.role !== 'admin') {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 sm:p-10 bg-white rounded-3xl shadow-2xl border border-slate-200 text-center space-y-5 font-sans">
        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <Award className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-800 bg-amber-100 px-3.5 py-1 rounded-full border border-amber-300">
            Evaluation In Progress
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-gurukul-navy">
            Entrance Results Not Yet Declared
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
            The official entrance examination results and merit scorecards for Session 2027-28 have not been declared by the Examination Controller yet.
          </p>
          <p className="text-xs text-slate-400">
            Please check back after official announcement notifications are issued to registered candidates.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 py-2.5 px-6 bg-gurukul-navy hover:bg-slate-800 text-amber-300 font-bold text-xs rounded-xl shadow transition border border-amber-400/30"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Candidate Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  const [selectedWing, setSelectedWing] = useState<'all' | 'boys' | 'girls'>('all');

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2 no-print">
        <span className="text-xs font-bold uppercase tracking-wider text-gurukul-600 bg-amber-100 px-3 py-1 rounded-full">
          Merit Assessment
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-gurukul-navy">
          Entrance Examination Result &amp; Scorecard 2027-28
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Official merit rank and score breakdown declared by Gurukul Kurukshetra Examination Cell.
        </p>
      </div>

      {/* Category Tabs for Boys and Girls Wings */}
      <div className="flex justify-center flex-wrap items-center gap-2 no-print">
        <button
          type="button"
          onClick={() => setSelectedWing('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            selectedWing === 'all'
              ? 'bg-gurukul-navy text-white shadow-sm'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Wings
        </button>
        <button
          type="button"
          onClick={() => setSelectedWing('boys')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            selectedWing === 'boys'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
          }`}
        >
          <span>👦 Boys Wing Merit</span>
          <span className="text-[10px] opacity-80">(Gurukul Nilokheri &amp; Jyotisar)</span>
        </button>
        <button
          type="button"
          onClick={() => setSelectedWing('girls')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            selectedWing === 'girls'
              ? 'bg-pink-600 text-white shadow-sm'
              : 'bg-white text-pink-700 border border-pink-200 hover:bg-pink-50'
          }`}
        >
          <span>👧 Girls Wing Merit</span>
          <span className="text-[10px] opacity-80">(Aryakulam Nilokheri)</span>
        </button>
      </div>

      {/* Search Input Box (Admins or if candidate has not loaded result) */}
      {(currentUser?.role === 'admin' || !result) && (
        <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl p-4 shadow-md no-print space-y-2">
          {selectedWing !== 'all' && (
            <p className="text-[11px] font-bold text-slate-600 text-center">
              Filtering for: <strong className={selectedWing === 'girls' ? 'text-pink-700' : 'text-blue-700'}>{selectedWing === 'girls' ? '👧 Aryakulam Girls Wing (NILG-)' : '👦 Gurukul Boys Wing (NILB-)'}</strong>
            </p>
          )}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  selectedWing === 'girls'
                    ? 'Enter Girls Roll No or NILG- Registration No.'
                    : selectedWing === 'boys'
                    ? 'Enter Boys Roll No or NILB- Registration No.'
                    : 'Enter Roll Number or Registration No.'
                }
                className="w-full pl-10 pr-3 py-2.5 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="px-6 py-2.5 bg-gurukul-600 hover:bg-gurukul-700 text-white font-bold text-xs rounded-xl transition shadow flex items-center gap-1.5"
            >
              {searching ? 'Searching...' : 'Check Scorecard'}
            </button>
          </form>
        </div>
      )}

      {/* Error notice */}
      {error && (
        <div className="max-w-xl mx-auto p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 no-print">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Result Display */}
      {result ? (
        <ScorecardView result={result} />
      ) : searched && !searching ? (
        <div className="text-center py-12 text-slate-500 text-sm no-print">
          <Award className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="font-semibold text-slate-700">No Published Result Found</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            Ensure the entered Roll Number or Registration Number matches your official candidate dossier.
          </p>
        </div>
      ) : null}
    </div>
  );
}

