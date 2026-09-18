'use client';

import React from 'react';
import { Award, CheckCircle2, XCircle, Calendar, Hash, User, BookOpen } from 'lucide-react';
import { ExamResult } from '@/lib/types';

interface ScorecardViewProps {
  result: ExamResult;
}

export default function ScorecardView({ result }: ScorecardViewProps) {
  const isQualified =
    result.qualifyingStatus === 'Qualified' ||
    result.qualifyingStatus === 'Qualified for Admission' ||
    Boolean(result.remarks && (
      result.remarks.toLowerCase().includes('qualified') ||
      result.remarks.toLowerCase().includes('selected') ||
      result.remarks.toLowerCase().includes('shortlist')
    ) && !result.remarks.toLowerCase().includes('not qualified'));

  const formatDob = (dobStr?: string) => {
    if (!dobStr) return '—';
    const s = dobStr.trim();
    // Handles YYYY-MM-DD
    const matchYmd = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (matchYmd) {
      const day = matchYmd[3].padStart(2, '0');
      const month = matchYmd[2].padStart(2, '0');
      const year = matchYmd[1];
      return `${day}/${month}/${year}`;
    }
    // Handles DD-MM-YYYY or DD/MM/YYYY
    const matchDmy = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (matchDmy) {
      const day = matchDmy[1].padStart(2, '0');
      const month = matchDmy[2].padStart(2, '0');
      const year = matchDmy[3];
      return `${day}/${month}/${year}`;
    }
    return s;
  };

  // Clean formatted class
  const rawClass = result.classApplying || 'Class 6';
  const cleanClass = rawClass.toLowerCase().startsWith('class')
    ? rawClass
    : `Class ${rawClass}`;

  return (
    <div className="w-full max-w-2xl mx-auto my-4 space-y-4 font-sans">
      {/* Result Details Card */}
      <div className="portal-card p-6 sm:p-7 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
              Session 2027-28
            </span>
            <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
              <Award className="w-5 h-5 text-portal-navy" />
              <span>Examination Result Details</span>
            </h3>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
              isQualified
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-rose-100 text-rose-800 border border-rose-300'
            }`}
          >
            {isQualified ? 'Qualified' : 'Not Qualified'}
          </span>
        </div>

        {/* Candidate Particulars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
          <div className="data-cell">
            <span className="text-slate-500 block text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
              <User className="w-3 h-3 text-portal-navy" /> Candidate Name
            </span>
            <span className="font-bold text-sm text-slate-900 uppercase mt-1 block">
              {result.candidateName}
            </span>
          </div>

          <div className="data-cell">
            <span className="text-slate-500 block text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
              <Hash className="w-3 h-3 text-portal-navy" /> Roll Number
            </span>
            <span className="font-mono font-black text-sm text-portal-navy mt-1 block">
              {result.rollNumber}
            </span>
          </div>

          <div className="data-cell">
            <span className="text-slate-500 block text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3 h-3 text-portal-navy" /> Date of Birth (DD/MM/YYYY)
            </span>
            <span className="font-mono font-bold text-sm text-slate-800 mt-1 block">
              {formatDob(result.dob)}
            </span>
          </div>

          <div className="data-cell">
            <span className="text-slate-500 block text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-portal-navy" /> Class
            </span>
            <span className="font-bold text-sm text-slate-800 mt-1 block">
              {cleanClass}
            </span>
          </div>
        </div>

        {/* Selection Status & Remarks Callout */}
        <div
          className={`p-4 rounded-xl border ${
            isQualified
              ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
              : 'bg-rose-50/80 border-rose-300 text-rose-950'
          }`}
        >
          <div className="flex items-start gap-3">
            {isQualified ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
            )}
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="font-extrabold text-sm uppercase tracking-wide">
                  Selection Status: {isQualified ? 'QUALIFIED' : 'NOT QUALIFIED'}
                </h4>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Remarks:
                </span>
                <p className="text-xs font-semibold text-slate-900 mt-0.5 bg-white/80 p-3 rounded-lg border border-slate-200/60 leading-relaxed">
                  {result.remarks ||
                    (isQualified
                      ? 'Qualified for admission counseling.'
                      : 'Not Qualified for current admission session.')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
