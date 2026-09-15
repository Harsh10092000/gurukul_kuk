'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Award, AlertCircle, FileText } from 'lucide-react';
import ScorecardView from '@/components/ScorecardView';
import { ExamResult } from '@/lib/types';

export default function ResultPage() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<ExamResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Try to load result for logged-in user automatically
    fetch('/api/results')
      .then((res) => res.json())
      .then((data) => {
        if (data.result) {
          setResult(data.result);
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
      const res = await fetch(`/api/results?appId=${encodeURIComponent(query.trim())}`);
      const data = await res.json();

      if (data.result) {
        setResult(data.result);
      } else {
        const res2 = await fetch(`/api/results?rollNo=${encodeURIComponent(query.trim())}`);
        const data2 = await res2.json();
        if (data2.result) {
          setResult(data2.result);
        } else {
          setResult(null);
          setError('No published result found for the entered Roll Number or Application Number.');
        }
      }
    } catch {
      setError('An error occurred while fetching the entrance exam result.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2 no-print">
        <span className="text-xs font-bold uppercase tracking-wider text-gurukul-600 bg-amber-100 px-3 py-1 rounded-full">
          Merit Assessment
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-gurukul-navy">
          Entrance Examination Result & Scorecard 2026-27
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Enter candidate Roll Number (e.g. 2606001) or Application Number (GK-2026-1001) to view subject marks and rank.
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
              placeholder="Enter Roll Number or Application No."
              className="w-full pl-10 pr-3 py-2.5 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-gurukul-600 hover:bg-gurukul-700 text-white font-bold text-xs rounded-xl transition shadow flex items-center gap-1.5"
          >
            {loading ? 'Searching...' : 'Check Scorecard'}
          </button>
        </form>
      </div>

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
      ) : searched && !loading ? (
        <div className="text-center py-12 text-slate-500 text-sm no-print">
          <Award className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="font-semibold text-slate-700">Result Not Published Yet</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            Entrance test results are announced after the evaluation process is completed by the Examination Board.
          </p>
        </div>
      ) : null}
    </div>
  );
}
