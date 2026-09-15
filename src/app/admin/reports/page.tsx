'use client';

import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Download, Filter, MapPin, Users, Calendar, CheckCircle } from 'lucide-react';

export default function AdminReportsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((res) => res.json())
      .then((data) => {
        if (data.stats) setStats(data.stats);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-gurukul-navy">
          Reports & Demographic Analytics
        </h1>
        <p className="text-xs text-slate-500">
          Generate custom reports, export applicant registers, and view geographic distributions.
        </p>
      </div>

      {/* Quick Download Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Master Applicant Register</h3>
              <p className="text-[11px] text-slate-500">All registered candidate data</p>
            </div>
          </div>
          <a
            href="/api/admin/export"
            download
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV (Excel)</span>
          </a>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-800">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Exam Attendance Sheets</h3>
              <p className="text-[11px] text-slate-500">Roll numbers by centre & room</p>
            </div>
          </div>
          <a
            href="/api/admin/export"
            download
            className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Attendance List</span>
          </a>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Fee Reconciliation Report</h3>
              <p className="text-[11px] text-slate-500">Razorpay transactions & status</p>
            </div>
          </div>
          <a
            href="/api/admin/export"
            download
            className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Financial Ledger</span>
          </a>
        </div>
      </div>

      {/* State Demographic Analysis Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b pb-3">
          <MapPin className="w-4 h-4 text-gurukul-600" /> Geographic Demographics (State-wise)
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats?.stateCounts &&
            Object.entries(stats.stateCounts).map(([stateName, count]: any) => (
              <div key={stateName} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-xs font-semibold text-slate-700 block">{stateName}</span>
                <span className="text-xl font-black text-gurukul-navy">{count}</span>
                <span className="text-[10px] text-slate-400 block">
                  {((count / (stats.totalApplications || 1)) * 100).toFixed(1)}% of total
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
