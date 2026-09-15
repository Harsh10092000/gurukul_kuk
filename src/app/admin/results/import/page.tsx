'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  Download, 
  Check,
  ShieldCheck,
  Award
} from 'lucide-react';

const SAMPLE_CSV = `RollNumber,Mathematics,Science,EnglishHindi,SanskritGK,Rank,QualifyingStatus
GK26-ROLL-1001,24,23,22,21,1,Qualified
GK26-ROLL-1002,21,20,19,18,2,Qualified
GK26-ROLL-1003,19,18,17,16,3,Qualified
GK26-ROLL-1004,12,11,10,12,4,Not_Qualified`;

export default function AdminResultsImportPage() {
  const router = useRouter();

  const [csvContent, setCsvContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewData, setPreviewData] = useState<any>(null);
  const [publishDirectly, setPublishDirectly] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const loadSampleData = () => {
    setCsvContent(SAMPLE_CSV);
    setError('');
  };

  const handlePreview = async () => {
    if (!csvContent.trim()) {
      setError('Please paste or upload CSV data first.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/results/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'preview',
          csvContent,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to parse CSV.');
        setLoading(false);
        return;
      }

      setPreviewData(data);
      setLoading(false);
    } catch {
      setError('An error occurred during preview.');
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/results/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'commit',
          csvContent,
          publishDirectly,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Import commit failed.');
        setLoading(false);
        return;
      }

      setSuccessMessage(data.message);
      setLoading(false);
      setTimeout(() => {
        router.push('/admin/results');
      }, 2000);
    } catch {
      setError('Failed to commit results.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-sans max-w-5xl">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/results"
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gurukul-600 bg-amber-100 px-3 py-1 rounded-full">
              Bulk Data Import Module
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-gurukul-navy mt-1">
              Import Entrance Exam Results via CSV
            </h1>
            <p className="text-xs text-slate-500">
              Upload or paste evaluation results with automated validation and pre-publish preview.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadSampleData}
          className="bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5"
        >
          <FileSpreadsheet className="w-4 h-4 text-amber-600" />
          <span>Load Sample CSV</span>
        </button>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="font-bold">{successMessage} Redirecting to Results Desk...</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* CSV Input Panel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
            Paste CSV Data (Format: RollNumber, Math, Science, EnglishHindi, SanskritGK, Rank, QualifyingStatus) *
          </label>
          <textarea
            rows={7}
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            placeholder="Paste your CSV text here with column headers..."
            className="w-full p-3 text-xs font-mono border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="publishToggle"
              checked={publishDirectly}
              onChange={(e) => setPublishDirectly(e.target.checked)}
              className="rounded text-amber-600 focus:ring-amber-500"
            />
            <label htmlFor="publishToggle" className="text-xs text-slate-700 font-semibold cursor-pointer">
              Publish directly to Candidate Portal upon import
            </label>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              type="button"
              disabled={loading || !csvContent}
              onClick={handlePreview}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition"
            >
              Validate & Preview Rows
            </button>
            {previewData && (
              <button
                type="button"
                disabled={loading}
                onClick={handleCommit}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Commit & Import ({previewData.parsedCount} Records)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Preview Table */}
      {previewData && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-sm text-gurukul-navy">Validation Preview</h3>
            </div>
            <div className="flex gap-3 text-xs font-mono">
              <span>Total: <strong>{previewData.totalRows}</strong></span>
              <span className="text-emerald-700">Valid: <strong>{previewData.parsedCount}</strong></span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b">
                  <th className="p-2.5">Roll Number</th>
                  <th className="p-2.5">Candidate / Name</th>
                  <th className="p-2.5 text-center">Math</th>
                  <th className="p-2.5 text-center">Science</th>
                  <th className="p-2.5 text-center">Eng/Hindi</th>
                  <th className="p-2.5 text-center">Sanskrit/GK</th>
                  <th className="p-2.5 text-center">Total</th>
                  <th className="p-2.5 text-center">Rank</th>
                  <th className="p-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {previewData.previewRows.map((r: any, idx: number) => (
                  <tr key={idx} className="border-b hover:bg-slate-50">
                    <td className="p-2.5 font-mono font-bold text-gurukul-navy">{r.rollNumber}</td>
                    <td className="p-2.5">{r.candidateName}</td>
                    <td className="p-2.5 text-center font-mono">{r.subjectMarks.mathematics}</td>
                    <td className="p-2.5 text-center font-mono">{r.subjectMarks.science}</td>
                    <td className="p-2.5 text-center font-mono">{r.subjectMarks.englishHindi}</td>
                    <td className="p-2.5 text-center font-mono">{r.subjectMarks.sanskritGk}</td>
                    <td className="p-2.5 text-center font-mono font-bold text-slate-900">{r.totalMarks}/100</td>
                    <td className="p-2.5 text-center font-mono font-bold">#{r.rank}</td>
                    <td className="p-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.qualifyingStatus === 'qualified'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {r.qualifyingStatus.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
