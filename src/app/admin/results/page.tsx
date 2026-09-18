'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Award,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Download,
  Trash2,
  Search,
  Eye,
  EyeOff,
  Loader2,
  Check,
  X,
  RotateCcw
} from 'lucide-react';
import { ExamResult } from '@/lib/types';

export default function AdminResultsPage() {
  const [resultsList, setResultsList] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultsDeclared, setResultsDeclared] = useState<boolean | null>(null);
  const [togglingDeclared, setTogglingDeclared] = useState(false);

  // File Upload & Preview State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [parsing, setParsing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [publishDirectly, setPublishDirectly] = useState(true);

  // Messages & Filters
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'qualified' | 'not_qualified'>('all');
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Fetch initial results and declaration status
  const loadData = async () => {
    try {
      const [resStatus, resData] = await Promise.all([
        fetch('/api/results/status').then((r) => r.json()),
        fetch('/api/results?all=true').then((r) => r.json()),
      ]);

      if (typeof resStatus.resultsDeclared === 'boolean') {
        setResultsDeclared(resStatus.resultsDeclared);
      }
      if (Array.isArray(resData.results)) {
        setResultsList(resData.results);
      }
    } catch {
      setErrorMessage('Failed to load results from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Toggle Results Declaration (Live to Candidates)
  const handleToggleDeclared = async (declare: boolean) => {
    setTogglingDeclared(true);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      const res = await fetch('/api/results/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultsDeclared: declare }),
      });
      const data = await res.json();
      if (res.ok) {
        setResultsDeclared(declare);
        setSuccessMessage(declare ? 'Results are now officially visible to candidates.' : 'Results are now hidden from candidates.');
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        setErrorMessage(data.error || 'Failed to update result declaration status.');
      }
    } catch {
      setErrorMessage('Network error while updating result status.');
    } finally {
      setTogglingDeclared(false);
    }
  };

  // Download Sample Excel Template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Candidate Name': 'Aarav Sharma',
        'Roll Number': '2606001',
        'DOB': '12/05/2014',
        'Remark': 'Qualified for Admission. Selected in First Merit List.',
      },
      {
        'Candidate Name': 'Kavya Verma',
        'Roll Number': '2606002',
        'DOB': '20/08/2014',
        'Remark': 'Qualified - Selected for Class 6th Boarding Wing.',
      },
      {
        'Candidate Name': 'Rohan Gupta',
        'Roll Number': '2606003',
        'DOB': '15/01/2014',
        'Remark': 'Not Qualified for current admission session.',
      },
      {
        'Candidate Name': 'Aditi Singh',
        'Roll Number': '2606004',
        'DOB': '03/11/2014',
        'Remark': 'Qualified for Admission.',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    // Set column widths
    worksheet['!cols'] = [
      { wch: 24 }, // Candidate Name
      { wch: 18 }, // Roll Number
      { wch: 16 }, // DOB
      { wch: 45 }, // Remark
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
    XLSX.writeFile(workbook, 'Gurukul_Results_Upload_Template.xlsx');
  };

  const formatDob = (dobStr?: string) => {
    if (!dobStr) return '—';
    const s = dobStr.trim();
    const matchYmd = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (matchYmd) {
      const day = matchYmd[3].padStart(2, '0');
      const month = matchYmd[2].padStart(2, '0');
      const year = matchYmd[1];
      return `${day}/${month}/${year}`;
    }
    const matchDmy = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (matchDmy) {
      const day = matchDmy[1].padStart(2, '0');
      const month = matchDmy[2].padStart(2, '0');
      const year = matchDmy[3];
      return `${day}/${month}/${year}`;
    }
    return s;
  };

  // Handle File Selection and Parsing
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setParsing(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (jsonData.length === 0) {
        setErrorMessage('The uploaded Excel sheet contains no data rows.');
        setParsing(false);
        return;
      }

      // Send to preview endpoint
      const res = await fetch('/api/admin/results/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'preview',
          rows: jsonData,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setPreviewData(data);
      } else {
        setErrorMessage(data.error || 'Failed to parse Excel file.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error reading Excel file.');
    } finally {
      setParsing(false);
    }
  };

  // Commit and Save Results
  const handleCommitResults = async () => {
    if (!previewData || !previewData.previewRows) return;

    setCommitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/admin/results/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'commit',
          rows: previewData.previewRows,
          publishDirectly,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(data.message || 'Results uploaded and saved successfully!');
        if (publishDirectly) {
          setResultsDeclared(true);
        }
        setPreviewData(null);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        await loadData();
        setTimeout(() => setSuccessMessage(''), 8000);
      } else {
        setErrorMessage(data.error || 'Failed to save results.');
      }
    } catch {
      setErrorMessage('Network error while committing results.');
    } finally {
      setCommitting(false);
    }
  };

  // Clear / Reset All Results
  const handleClearAllResults = async () => {
    setClearing(true);
    try {
      const res = await fetch('/api/admin/results/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear' }),
      });
      if (res.ok) {
        setResultsList([]);
        setShowClearModal(false);
        setSuccessMessage('All previous results have been cleared successfully.');
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        setErrorMessage('Failed to clear results.');
      }
    } catch {
      setErrorMessage('Network error while clearing results.');
    } finally {
      setClearing(false);
    }
  };

  // Filter and search live results
  const filteredResults = resultsList.filter((r) => {
    if (statusFilter === 'qualified' && r.qualifyingStatus !== 'Qualified' && r.qualifyingStatus !== 'Qualified for Admission') {
      return false;
    }
    if (statusFilter === 'not_qualified' && r.qualifyingStatus !== 'Not Qualified') {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (r.candidateName || '').toLowerCase().includes(q) ||
      (r.rollNumber || '').toLowerCase().includes(q) ||
      (r.dob || '').toLowerCase().includes(q) ||
      (r.remarks || '').toLowerCase().includes(q)
    );
  });

  const qualifiedTotal = resultsList.filter(
    (r) => r.qualifyingStatus === 'Qualified' || r.qualifyingStatus === 'Qualified for Admission'
  ).length;
  const notQualifiedTotal = resultsList.filter((r) => r.qualifyingStatus === 'Not Qualified').length;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center font-sans">
        <div className="text-center space-y-3">
          <div className="w-9 h-9 border-2 border-portal-navy border-t-transparent rounded-full animate-spin mx-auto text-portal-navy" />
          <p className="text-xs font-semibold text-slate-600">Loading Entrance Results &amp; Merit List Records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* Top Header Banner */}
      <div className="portal-card p-6 flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-portal-navy bg-slate-100 px-2.5 py-0.5 rounded">
            Examination Board • Session 2027-28
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Entrance Examination Results Management
          </h1>
          <p className="text-xs text-slate-500">
            Upload candidate evaluation Excel file, preview selection comments, and publish official results.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="btn-secondary text-xs h-10 px-3.5 font-bold flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Download Excel Template</span>
          </button>

          {resultsDeclared ? (
            <button
              type="button"
              disabled={togglingDeclared}
              onClick={() => handleToggleDeclared(false)}
              className="btn-danger text-xs h-10 px-4 font-bold flex items-center gap-2 shadow-sm disabled:opacity-75"
            >
              {togglingDeclared ? <Loader2 className="w-4 h-4 animate-spin" /> : <EyeOff className="w-4 h-4" />}
              <span>{togglingDeclared ? 'Hiding Results...' : 'Hide Results'}</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={togglingDeclared}
              onClick={() => handleToggleDeclared(true)}
              className="btn-accent text-xs h-10 px-4 font-bold flex items-center gap-2 shadow-sm disabled:opacity-75"
            >
              {togglingDeclared ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              <span>{togglingDeclared ? 'Declaring Live...' : 'Declare Results Live'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Alert Banners */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 text-xs font-semibold flex items-center gap-2.5 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-rose-950 text-xs font-semibold flex items-center gap-2.5 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* SECTION 1: Excel File Upload Dropzone */}
      <div className="portal-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-portal-navy" />
              <span>Upload Results Excel Sheet (.xlsx / .xls / .csv)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              File must contain columns: <strong>Candidate Name</strong>, <strong>Roll Number</strong>, <strong>DOB</strong>, and <strong>Remark</strong>.
            </p>
          </div>
        </div>

        {/* Dropzone */}
        {!previewData && (
          <div className="border-2 border-dashed border-slate-300 hover:border-portal-navy/50 rounded-2xl p-8 text-center bg-slate-50/60 transition space-y-3">
            <div className="w-12 h-12 rounded-full bg-portal-navy/10 text-portal-navy flex items-center justify-center mx-auto">
              {parsing ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <UploadCloud className="w-6 h-6" />
              )}
            </div>

            <div>
              <p className="text-xs font-bold text-slate-800">
                {parsing ? 'Parsing Excel Sheet...' : 'Select or drag & drop your Result Excel file here'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv) formats
              </p>
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                disabled={parsing}
                className="hidden"
                id="excel-result-input"
              />
              <label
                htmlFor="excel-result-input"
                className="btn-primary text-xs px-5 py-2.5 inline-flex items-center gap-2 cursor-pointer font-bold"
              >
                <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                <span>Browse Excel File</span>
              </label>
            </div>
          </div>
        )}

        {/* SECTION 2: Interactive Preview Screen */}
        {previewData && (
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="bg-portal-navy/5 border border-portal-navy/20 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-portal-navy text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                    Preview Mode
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    File: {selectedFile?.name}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
                  <span className="font-semibold text-slate-700">
                    Total Parsed: <strong>{previewData.totalRows}</strong>
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="font-semibold text-emerald-700">
                    Qualified: <strong>{previewData.qualifiedCount}</strong>
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="font-semibold text-rose-700">
                    Not Qualified: <strong>{previewData.notQualifiedCount}</strong>
                  </span>
                </div>
              </div>

              {/* Commit Actions */}
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={publishDirectly}
                    onChange={(e) => setPublishDirectly(e.target.checked)}
                    className="rounded text-portal-navy focus:ring-portal-navy"
                  />
                  <span>Declare results live immediately</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setPreviewData(null);
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  disabled={committing}
                  className="btn-secondary text-xs h-9 px-3 font-semibold"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>

                <button
                  type="button"
                  onClick={handleCommitResults}
                  disabled={committing}
                  className="btn-primary text-xs h-9 px-4 font-bold flex items-center gap-2"
                >
                  {committing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 text-amber-400" />
                  )}
                  <span>{committing ? 'Uploading Results...' : 'Upload & Save Results'}</span>
                </button>
              </div>
            </div>

            {/* Preview Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0 uppercase text-[10px]">
                    <tr>
                      <th className="p-3 w-12 text-center">#</th>
                      <th className="p-3 w-40">Candidate Name</th>
                      <th className="p-3 w-32">Roll Number</th>
                      <th className="p-3 w-28">DOB</th>
                      <th className="p-3 w-36 text-center">Selection Status</th>
                      <th className="p-3">Selection Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewData.previewRows.map((row: any, idx: number) => {
                      const isQual = row.qualifyingStatus === 'Qualified';
                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 font-mono text-center text-slate-500 font-bold">{idx + 1}</td>
                          <td className="p-3 font-bold text-slate-900 uppercase">{row.candidateName}</td>
                          <td className="p-3 font-mono font-bold text-portal-navy">{row.rollNumber}</td>
                          <td className="p-3 font-mono text-slate-600">{formatDob(row.dob)}</td>
                          <td className="p-3 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isQual ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                              {isQual ? 'Qualified' : 'Not Qualified'}
                            </span>
                          </td>
                          <td className="p-3 text-slate-700 font-medium text-[11px]">{row.remarks}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: Current Uploaded Results Desk */}
      <div className="portal-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-portal-navy" />
              <span>Published &amp; Uploaded Candidate Results</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Total <strong>{resultsList.length}</strong> candidates in system ({qualifiedTotal} Qualified, {notQualifiedTotal} Not Qualified).
            </p>
          </div>

          <div className="flex items-center gap-2">
            {resultsList.length > 0 && (
              <button
                type="button"
                onClick={() => setShowClearModal(true)}
                className="btn-danger text-xs px-3 py-1.5 font-bold flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Results</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition ${statusFilter === 'all'
                ? 'bg-portal-navy text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
            >
              All Results ({resultsList.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('qualified')}
              className={`px-3 py-1.5 rounded-lg transition ${statusFilter === 'qualified'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50'
                }`}
            >
              Qualified ({qualifiedTotal})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('not_qualified')}
              className={`px-3 py-1.5 rounded-lg transition ${statusFilter === 'not_qualified'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'bg-white text-rose-800 border border-rose-200 hover:bg-rose-50'
                }`}
            >
              Not Qualified ({notQualifiedTotal})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate name, roll no, remark..."
              className="form-input-field text-xs"
            />
          </div>
        </div>

        {/* Results List Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3 w-12 text-center">#</th>
                  <th className="p-3 w-44">Candidate Name</th>
                  <th className="p-3 w-32">Roll Number</th>
                  <th className="p-3 w-28">Date of Birth</th>
                  <th className="p-3 w-36 text-center">Selection Status</th>
                  <th className="p-3">Selection Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-16 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-portal-navy" />
                        <p className="font-bold text-xs text-slate-800 uppercase">
                          Loading Results Data...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : filteredResults.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400 space-y-1">
                      <Award className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-semibold text-xs text-slate-600">No results found.</p>
                      <p className="text-[11px] text-slate-400">
                        {resultsList.length === 0
                          ? 'Upload an Excel file above to publish candidate examination results.'
                          : 'No candidates matched your filter/search criteria.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredResults.map((res, idx) => {
                    const isQual =
                      res.qualifyingStatus === 'Qualified' ||
                      res.qualifyingStatus === 'Qualified for Admission';
                    return (
                      <tr key={res.id || idx} className="hover:bg-slate-50">
                        <td className="p-3 font-mono text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-900 uppercase">{res.candidateName}</td>
                        <td className="p-3 font-mono font-bold text-portal-navy">{res.rollNumber}</td>
                        <td className="p-3 font-mono text-slate-600">{formatDob(res.dob)}</td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isQual
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                              : 'bg-rose-50 text-rose-800 border border-rose-300'
                              }`}
                          >
                            {isQual ? 'Qualified' : 'Not Qualified'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-700 font-medium text-[11px] leading-relaxed">
                          {res.remarks || '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Clear All Results Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Clear All Results?</h3>
              <p className="text-xs text-slate-600">
                This will delete all {resultsList.length} currently uploaded results. You will need to upload a fresh Excel sheet.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="btn-secondary text-xs h-9 flex-1 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={clearing}
                onClick={handleClearAllResults}
                className="btn-danger text-xs h-9 flex-1 font-bold flex items-center justify-center gap-1.5"
              >
                {clearing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Clear</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
