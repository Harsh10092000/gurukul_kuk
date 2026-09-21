'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
      <div className="py-16 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-portal-navy border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-500">Loading admissions metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Admissions &amp; Examination Analytics
          </h1>
          <p className="text-xs text-slate-500">
            Live candidate metrics for The Gurukul Nilokheri Session 2027-28
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/admin/export"
            download
            className="btn-secondary text-xs px-3 py-1.5"
          >
            Export CSV
          </a>
          <Link
            href="/admin/applications"
            className="btn-primary text-xs px-3.5 py-1.5"
          >
            Manage Applications
          </Link>
        </div>
      </div>

      {/* 3 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Applications */}
        <div className="portal-card p-5 space-y-1.5 border-l-4 border-l-portal-navy">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Applications</span>
            <span className="portal-badge-navy text-[10px]">Session 2027</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono">
            {stats?.totalApplications || 0}
          </div>
          <p className="text-[11px] text-slate-500">
            Confirmed candidate dossiers
          </p>
        </div>

        {/* Approved Dossiers */}
        <div className="portal-card p-5 space-y-1.5 border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Verified &amp; Approved</span>
            <span className="portal-badge-emerald text-[10px]">Eligible</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-800 font-mono">
            {stats?.approved || 0}
          </div>
          <p className="text-[11px] text-emerald-700 font-medium">Eligible for Admit Card release</p>
        </div>

        {/* Under Review / Correction */}
        <div className="portal-card p-5 space-y-1.5 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Awaiting Scrutiny</span>
            <span className="portal-badge-gold text-[10px]">Action Req</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-amber-800 font-mono">
            {(stats?.underReview || 0) + (stats?.correctionNeeded || 0)}
          </div>
          <p className="text-[11px] text-amber-700 font-medium">
            {stats?.correctionNeeded || 0} marked for re-upload
          </p>
        </div>
      </div>

      {/* Class Breakdown & State Demographic Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class Distribution */}
        <div className="portal-card p-6 space-y-4">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
            Class-wise Application Distribution
          </h3>
          <div className="space-y-3">
            {stats?.classCounts && Object.keys(stats.classCounts).length > 0 ? (
              Object.entries(stats.classCounts).map(([className, count]: any) => (
                <div key={className} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-700">{className}</span>
                    <span className="text-slate-900 font-semibold">{count} candidates</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-portal-navy h-full rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(12, (count / (stats.totalApplications || 1)) * 100))}%`,
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
        <div className="portal-card p-6 space-y-4">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
            State-wise Candidate Demographics
          </h3>
          <div className="space-y-3">
            {stats?.stateCounts && Object.keys(stats.stateCounts).length > 0 ? (
              Object.entries(stats.stateCounts).map(([stateName, count]: any) => (
                <div key={stateName} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-700">{stateName}</span>
                    <span className="text-slate-900 font-semibold">{count} applicants</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-slate-700 h-full rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(12, (count / (stats.totalApplications || 1)) * 100))}%`,
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

      {/* Recent Applications Table */}
      <div className="portal-card p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-900 text-sm">
            Recent Applications Awaiting Verification
          </h3>
          <Link
            href="/admin/applications"
            className="text-xs font-semibold text-portal-navy hover:underline"
          >
            View All
          </Link>
        </div>

        {recentApps.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 bg-slate-50 rounded-lg">
            <p className="font-semibold text-slate-700">All Submissions Processed</p>
            <p className="text-[11px] text-slate-400 mt-0.5">No candidate applications currently awaiting review.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] border-b border-slate-200">
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
                {recentApps.map((app) => {
                  const initials = (app.personalInfo?.fullName || 'Candidate')
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <tr key={app.id} className="hover:bg-slate-50/80 transition group">
                      <td className="py-3 px-3.5 font-mono text-xs font-semibold text-slate-800">
                        {app.applicationNumber}
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-portal-navy text-portal-gold flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 text-xs">
                              {app.personalInfo?.fullName}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {app.personalInfo?.gender || 'Candidate'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                          {app.classApplying}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-slate-600 font-mono text-xs">{app.parentInfo?.fatherPhone}</td>
                      <td className="py-3 px-3.5 text-slate-600 max-w-[160px] truncate text-xs">
                        {app.examCentrePref?.preferredCenter1}
                      </td>
                      <td className="py-3 px-3.5">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${
                            app.status === 'approved'
                              ? 'portal-badge-emerald'
                              : app.status === 'correction_needed'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'portal-badge-gold'
                          }`}
                        >
                          {app.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        <Link
                          href={`/admin/applications/${app.id}`}
                          className="btn-secondary text-[11px] px-2.5 py-1"
                        >
                          Inspect
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
