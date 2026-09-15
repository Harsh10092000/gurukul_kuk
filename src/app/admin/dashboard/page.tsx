'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  CreditCard, 
  CheckCircle, 
  AlertTriangle, 
  ArrowRight, 
  Download, 
  FileSpreadsheet, 
  Clock, 
  Building,
  Award
} from 'lucide-react';
import { Application } from '@/lib/types';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [recentApps, setRecentApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((res) => res.json())
      .then((data) => {
        if (data.stats) setStats(data.stats);
        if (data.recentApplications) setRecentApps(data.recentApplications);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-bold text-slate-500">Loading live examination metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gurukul-navy">
            Admissions & Examination Analytics
          </h1>
          <p className="text-xs text-slate-500">
            Real-time candidate metrics for Gurukul Kurukshetra Session 2026-27
          </p>
        </div>

        <div className="flex gap-2.5">
          <a
            href="/api/admin/export"
            download
            className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs shadow-sm flex items-center gap-1.5 transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </a>
          <Link
            href="/admin/applications"
            className="bg-gurukul-600 hover:bg-gurukul-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow flex items-center gap-1.5 transition"
          >
            <Users className="w-4 h-4" />
            <span>Manage All Candidates</span>
          </Link>
        </div>
      </div>

      {/* 3 Primary Candidate KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-4">
        {/* Total Applications */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Applications</span>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">
            {stats?.totalApplications || 0}
          </div>
          <p className="text-[11px] text-slate-400">All submitted candidate profiles</p>
        </div>

        {/* Approved Dossiers */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Approved & Verified</span>
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">
            {stats?.approved || 0}
          </div>
          <p className="text-[11px] text-emerald-600 font-medium">Eligible for Admit Card</p>
        </div>

        {/* Pending Review / Correction */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Under Review / Flags</span>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-700">
            {(stats?.underReview || 0) + (stats?.correctionNeeded || 0)}
          </div>
          <p className="text-[11px] text-amber-600 font-medium">
            {stats?.correctionNeeded || 0} marked for re-upload
          </p>
        </div>
      </div>

      {/* Class-wise Breakdown & State Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class Distribution */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-gurukul-600" /> Class-wise Application Distribution
          </h3>
          <div className="space-y-3">
            {stats?.classCounts && Object.keys(stats.classCounts).length > 0 ? (
              Object.entries(stats.classCounts).map(([className, count]: any) => (
                <div key={className} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700">{className}</span>
                    <span className="text-slate-900 font-bold">{count} candidates</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(15, (count / (stats.totalApplications || 1)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">No applications recorded yet.</p>
            )}
          </div>
        </div>

        {/* State Demographic Spread */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Building className="w-4 h-4 text-gurukul-600" /> State-wise Candidate Demographics
          </h3>
          <div className="space-y-3">
            {stats?.stateCounts && Object.keys(stats.stateCounts).length > 0 ? (
              Object.entries(stats.stateCounts).map(([stateName, count]: any) => (
                <div key={stateName} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700">{stateName}</span>
                    <span className="text-slate-900 font-bold">{count} applicants</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gurukul-navy h-full rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(15, (count / (stats.totalApplications || 1)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">No geographical data yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Applications Desk */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-gurukul-600" /> Recent Applications Awaiting Verification
          </h3>
          <Link
            href="/admin/applications"
            className="text-xs font-bold text-gurukul-600 hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">App Number</th>
                <th className="py-2.5 px-3">Candidate</th>
                <th className="py-2.5 px-3">Class</th>
                <th className="py-2.5 px-3">Phone</th>
                <th className="py-2.5 px-3">Centre Preference</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentApps.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50">
                  <td className="py-3 px-3 font-mono font-bold text-slate-800">{app.applicationNumber}</td>
                  <td className="py-3 px-3 font-semibold text-slate-900">{app.personalInfo?.fullName}</td>
                  <td className="py-3 px-3">
                    <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-bold">
                      {app.classApplying}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-600 font-mono">{app.parentInfo?.fatherPhone}</td>
                  <td className="py-3 px-3 text-slate-600 max-w-[160px] truncate">
                    {app.examCentrePref?.preferredCenter1}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        app.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : app.status === 'correction_needed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {app.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <Link
                      href={`/admin/applications/${app.id}`}
                      className="bg-slate-100 hover:bg-amber-500 hover:text-white text-slate-700 font-bold px-3 py-1.5 rounded-lg text-[11px] transition"
                    >
                      Inspect Dossier
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
