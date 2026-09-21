'use client';

import React, { useState, useEffect } from 'react';
import { Download, Loader2, RefreshCw } from 'lucide-react';

export default function AdminReportsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

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
          className="btn-primary text-xs sm:text-sm py-2.5 px-5 flex items-center justify-center gap-2 shrink-0 disabled:opacity-75"
        >
          {downloading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating Master Register...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Download Master Register (CSV / Excel)</span>
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
