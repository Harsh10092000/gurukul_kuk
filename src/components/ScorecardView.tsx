'use client';

import React from 'react';
import { Award, Calendar, Hash, User, FileText } from 'lucide-react';
import { ExamResult } from '@/lib/types';

interface ScorecardViewProps {
  result: ExamResult;
}

export default function ScorecardView({ result }: ScorecardViewProps) {
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

          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
            Official Result
          </span>
        </div>

        {/* Candidate Particulars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
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
        </div>

        {/* Remarks Callout */}
        <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/70 text-slate-900">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 flex-shrink-0 text-portal-navy mt-0.5" />
            <div className="space-y-1.5 flex-1 min-w-0">
              <span className="text-[11px] uppercase font-bold text-portal-navy tracking-wider block">
                Official Remarks
              </span>
              <div className="text-xs sm:text-[13px] font-semibold text-slate-900 mt-0.5 bg-white p-3.5 rounded-lg border border-slate-200 leading-relaxed shadow-2xs whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
                {result.remarks || 'No remarks provided.'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
