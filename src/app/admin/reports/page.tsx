'use client';

import React, { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, FolderArchive, Loader2, RefreshCw, Ticket, Printer, ExternalLink } from 'lucide-react';

export default function AdminReportsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  // Bulk Admit Cards Download State (with Class & Stream selection)
  const [admitClass, setAdmitClass] = useState('all');
  const [admitStream, setAdmitStream] = useState('all');
  const [downloadingAdmits, setDownloadingAdmits] = useState(false);

  // Class Summary Excel State (with Date Range)
  const [summaryStartDate, setSummaryStartDate] = useState('');
  const [summaryEndDate, setSummaryEndDate] = useState('');
  const [downloadingSummary, setDownloadingSummary] = useState(false);

  // Bulk Documents ZIP Download State (with Class & Stream selection)
  const [docClass, setDocClass] = useState('all');
  const [docStream, setDocStream] = useState('all');
  const [downloadingDocs, setDownloadingDocs] = useState(false);

  const fetchStats = () => {
    setLoading(true);
    fetch('/api/admin/stats')
      .then((res) => res.json())
      .then((data) => {
        if (data.stats) setStats(data.stats);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch('/api/admin/export');
      if (!res.ok) throw new Error('Failed to export');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `the_gurukul_master_register_${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      console.error('Export download error:', error);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadClassSummary = async () => {
    setDownloadingSummary(true);
    try {
      const params = new URLSearchParams();
      if (summaryStartDate) params.set('startDate', summaryStartDate);
      if (summaryEndDate) params.set('endDate', summaryEndDate);
      params.set('format', 'xlsx');

      const res = await fetch(`/api/admin/reports/class-summary?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to generate summary');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `The_Gurukul_Class_Summary_${summaryStartDate || 'All'}_to_${summaryEndDate || 'Latest'}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading class summary:', err);
      alert('Could not download class summary report. Please try again.');
    } finally {
      setDownloadingSummary(false);
    }
  };

  const handleDownloadBulkDocs = async () => {
    setDownloadingDocs(true);
    try {
      const params = new URLSearchParams();
      params.set('class', docClass);
      params.set('stream', docStream);

      const res = await fetch(`/api/admin/documents/bulk-download?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to download documents');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `The_Gurukul_Candidate_Docs_${docClass.replace(/\s+/g, '_')}_${docStream.replace(/\s+/g, '_')}_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading bulk documents:', err);
      alert('Could not download candidate documents. Please try again.');
    } finally {
      setDownloadingDocs(false);
    }
  };

  const handleDownloadBulkAdmitCards = async () => {
    setDownloadingAdmits(true);
    try {
      const params = new URLSearchParams();
      params.set('class', admitClass);
      params.set('stream', admitStream);

      const res = await fetch(`/api/admin/admit-card/bulk-download?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to download bulk admit cards');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanClass = admitClass.replace(/\s+/g, '_');
      const cleanStream = admitStream !== 'all' ? `_${admitStream.replace(/\s+/g, '_')}` : '';
      a.download = `The_Gurukul_Admit_Cards_${cleanClass}${cleanStream}_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Error downloading bulk admit cards:', err);
      alert(err?.message || 'Could not download bulk admit cards archive. Please try again.');
    } finally {
      setDownloadingAdmits(false);
    }
  };

  const handleOpenPrintRoll = () => {
    const params = new URLSearchParams();
    params.set('class', admitClass);
    params.set('stream', admitStream);
    window.open(`/admin/reports/print-admit-cards?${params.toString()}`, '_blank');
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-portal-navy border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-500">Loading reports &amp; demographic analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Reports &amp; Demographic Analytics
          </h1>
          <p className="text-xs text-slate-500">
            Export candidate registers, generate attendance sheets, and review demographic distribution.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchStats}
          className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 self-start sm:self-auto"
          title="Refresh analytics data"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Reports & Bulk Download Centre */}
      <div className="space-y-6">
        {/* Card: Bulk Admit Cards & Hall Tickets Download */}
        <div id="bulk-admit-cards" className="portal-card p-5 sm:p-6 space-y-4 border-t-4 border-t-amber-500 scroll-mt-24 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                  <Ticket className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    Bulk Admit Cards &amp; Hall Tickets (Class-Wise)
                  </h3>
                  <span className="text-[11px] text-amber-700 font-medium">
                    Official Entrance Examination Roll (Session 2027-28)
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-3xl">
                Download official, color-formatted Admit Cards packaged per Class &amp; Stream. Includes candidate photographs, allotted Roll Numbers, exam center allocations (Aryakulam Nilokheri for Boys, The Gurukul Nilokheri for Girls), timings, instructions, and master register Excel spreadsheet.
              </p>
            </div>
            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <span className="bg-amber-100 text-amber-800 text-[10px] px-2.5 py-1 rounded-full font-mono font-bold">
                .ZIP ARCHIVE
              </span>
              <span className="bg-portal-navy/10 text-portal-navy text-[10px] px-2.5 py-1 rounded-full font-mono font-bold">
                MULTI-PAGE PDF
              </span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 sm:p-4 space-y-3">
            <span className="text-[11px] font-bold text-slate-700 block uppercase tracking-wide">
              Select Class &amp; Stream for Bulk Download:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-1">Applying Class</label>
                <select
                  value={admitClass}
                  onChange={(e) => setAdmitClass(e.target.value)}
                  className="form-input-field text-xs py-1.5 bg-white font-medium"
                >
                  <option value="all">All Classes (Full Roll)</option>
                  <option value="Class 5">Class 5</option>
                  <option value="Class 6">Class 6</option>
                  <option value="Class 7">Class 7</option>
                  <option value="Class 8">Class 8</option>
                  <option value="Class 9">Class 9</option>
                  <option value="Class 11">Class 11</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                  Stream / Section {admitClass === 'Class 11' && <span className="text-rose-500 font-bold">*</span>}
                </label>
                <select
                  value={admitStream}
                  onChange={(e) => setAdmitStream(e.target.value)}
                  disabled={admitClass !== 'Class 11' && admitClass !== 'all'}
                  className="form-input-field text-xs py-1.5 bg-white font-medium disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="all">All Streams</option>
                  <option value="Non-Medical">Non-Medical (PCM)</option>
                  <option value="Medical">Medical (PCB)</option>
                  <option value="Commerce">Commerce</option>
                  <option value="Humanities">Humanities (Girls Only)</option>
                </select>
              </div>

              <div className="flex flex-col justify-end">
                <span className="text-[10px] text-slate-400 mb-1">Format Details</span>
                <div className="text-[11px] text-slate-600 bg-white border border-slate-200 rounded px-2.5 py-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                  <span className="truncate">Includes candidate photos + Excel manifest</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleOpenPrintRoll}
              className="btn-secondary text-xs py-2 px-3.5 flex items-center gap-2 font-bold hover:bg-slate-200 transition"
              title="Open full multi-page printable roll in a new tab"
            >
              <Printer className="w-3.5 h-3.5 text-slate-700" />
              <span>Multi-Page PDF Print Roll</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={handleDownloadBulkAdmitCards}
              disabled={downloadingAdmits}
              className="bg-portal-gold hover:bg-amber-500 text-slate-950 text-xs py-2 px-5 rounded-md flex items-center gap-2 font-bold shadow-sm transition disabled:opacity-50"
            >
              {downloadingAdmits ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Packaging Admit Cards ZIP...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Bulk Admit Cards (.zip)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Existing Reports Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Class & Stream Summary Excel with Date Range */}
        <div className="portal-card p-5 sm:p-6 space-y-4 border-t-4 border-t-emerald-600">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Class &amp; Section Summary Report (Excel)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Download candidate breakdown by Class &amp; Stream (Registered, Approved, Withdrawn, and Total) formatted for official administration.
              </p>
            </div>
            <span className="portal-badge-emerald text-[10px] shrink-0 font-mono font-bold">.XLSX</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
            <span className="text-[11px] font-bold text-slate-700 block uppercase tracking-wide">
              Select Registration Date Range:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-1">From Date</label>
                <input
                  type="date"
                  value={summaryStartDate}
                  onChange={(e) => setSummaryStartDate(e.target.value)}
                  className="form-input-field text-xs py-1.5 bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-1">To Date</label>
                <input
                  type="date"
                  value={summaryEndDate}
                  onChange={(e) => setSummaryEndDate(e.target.value)}
                  className="form-input-field text-xs py-1.5 bg-white"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs">
              {(summaryStartDate || summaryEndDate) ? (
                <button
                  type="button"
                  onClick={() => { setSummaryStartDate(''); setSummaryEndDate(''); }}
                  className="text-rose-600 hover:text-rose-700 font-medium text-[11px] underline"
                >
                  Clear Date Filter
                </button>
              ) : (
                <span className="text-slate-400 text-[11px]">Filter: All Time Registrations</span>
              )}
            </div>
            <button
              type="button"
              onClick={handleDownloadClassSummary}
              disabled={downloadingSummary}
              className="btn-primary text-xs py-2 px-4 flex items-center gap-2 font-bold shadow-sm"
            >
              {downloadingSummary ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                  <span>Generating Excel...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Summary Excel (.xlsx)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Card 2: Bulk Candidate Documents Download (.ZIP) */}
        <div className="portal-card p-5 sm:p-6 space-y-4 border-t-4 border-t-portal-navy">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <FolderArchive className="w-5 h-5 text-portal-navy" />
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Bulk Candidate Documents Archive (.ZIP)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Download Candidate Photograph, Signature, Aadhaar Card, and verified Dossier Profile files packaged per Class &amp; Stream.
              </p>
            </div>
            <span className="portal-badge-navy text-[10px] shrink-0 font-mono font-bold">.ZIP</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
            <span className="text-[11px] font-bold text-slate-700 block uppercase tracking-wide">
              Filter by Class &amp; Stream:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-1">Applying Class</label>
                <select
                  value={docClass}
                  onChange={(e) => setDocClass(e.target.value)}
                  className="form-input-field text-xs py-1.5 bg-white"
                >
                  <option value="all">All Classes</option>
                  <option value="Class 5">Class 5</option>
                  <option value="Class 6">Class 6</option>
                  <option value="Class 7">Class 7</option>
                  <option value="Class 8">Class 8</option>
                  <option value="Class 9">Class 9</option>
                  <option value="Class 11">Class 11</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                  Stream / Section {docClass === 'Class 11' && <span className="text-rose-500 font-bold">*</span>}
                </label>
                <select
                  value={docStream}
                  onChange={(e) => setDocStream(e.target.value)}
                  disabled={docClass !== 'Class 11' && docClass !== 'all'}
                  className="form-input-field text-xs py-1.5 bg-white disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="all">All Streams</option>
                  <option value="Non-Medical">Non-Medical (PCM)</option>
                  <option value="Medical">Medical (PCB)</option>
                  <option value="Commerce">Commerce</option>
                  <option value="Humanities">Humanities (Girls Only)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">
              Includes Photo, Signature &amp; Aadhaar Card
            </span>
            <button
              type="button"
              onClick={handleDownloadBulkDocs}
              disabled={downloadingDocs}
              className="btn-accent text-xs py-2 px-4 flex items-center gap-2 font-bold shadow-sm"
            >
              {downloadingDocs ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
                  <span>Compressing Archive...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Bulk Documents (.zip)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>

      {/* Export Action Card */}
      <div className="portal-card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 border-l-portal-navy">
        <div className="space-y-1 max-w-xl">
          <h3 className="font-bold text-slate-900 text-sm sm:text-base">
            Candidate Master Register &amp; Reconciliation Report
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Consolidated dataset of all registered candidate records including roll numbers, class applied, parent contacts, scrutiny status, and fee payment reconciliation details.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="btn-secondary text-xs sm:text-sm py-2.5 px-5 flex items-center justify-center gap-2 shrink-0 disabled:opacity-75"
        >
          {downloading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating Master Register...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Download Full Master Register (CSV)</span>
            </>
          )}
        </button>
      </div>

      {/* Geographic Demographics */}
      <div className="portal-card p-6 space-y-4">
        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
          State-wise Geographic Demographics
        </h3>

        {!stats?.stateCounts || Object.keys(stats.stateCounts).length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No geographic demographic data available.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(stats.stateCounts).map(([stateName, count]: any) => (
              <div key={stateName} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-0.5">
                <span className="text-xs font-semibold text-slate-700 block truncate">{stateName}</span>
                <span className="text-lg font-bold text-portal-navy block">{count}</span>
                <span className="text-[10px] text-slate-400 block">
                  {((count / (stats.totalApplications || 1)) * 100).toFixed(1)}% of total
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
