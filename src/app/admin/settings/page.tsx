'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  CheckCircle, 
  Clock, 
  Calendar, 
  CreditCard, 
  Mail, 
  Phone, 
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Globe
} from 'lucide-react';
import { FormScheduleConfig, FormStatusResult } from '@/lib/formSchedule';

export default function AdminSettingsPage() {
  const [scheduleConfig, setScheduleConfig] = useState<FormScheduleConfig>({
    startDate: '2026-09-01T00:00',
    endDate: '2026-10-31T23:59',
    statusOverride: 'auto',
    timezone: 'Asia/Kolkata (IST)',
    announcementNotice: 'Online Application for Entrance Examination Session 2026-27 is active for Classes 5th, 6th, 7th, 8th, 9th, 11th & NDA Wing.',
    reopenedCount: 0,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'system',
  });

  const [formStatus, setFormStatus] = useState<FormStatusResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Fetch current schedule from API
  const loadSchedule = () => {
    fetch('/api/schedule')
      .then((res) => res.json())
      .then((data) => {
        if (data.config) {
          // Format ISO strings for datetime-local inputs
          setScheduleConfig({
            ...data.config,
            startDate: data.config.startDate ? data.config.startDate.slice(0, 16) : '2026-09-01T00:00',
            endDate: data.config.endDate ? data.config.endDate.slice(0, 16) : '2026-10-31T23:59',
          });
        }
        if (data.status) setFormStatus(data.status);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadSchedule();
  }, []);

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaved(false);

    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: new Date(scheduleConfig.startDate).toISOString(),
          endDate: new Date(scheduleConfig.endDate).toISOString(),
          statusOverride: scheduleConfig.statusOverride,
          timezone: scheduleConfig.timezone,
          announcementNotice: scheduleConfig.announcementNotice,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to update schedule settings.');
        return;
      }

      setSaved(true);
      if (data.status) setFormStatus(data.status);
      setTimeout(() => setSaved(false), 4000);
    } catch {
      setError('An unexpected error occurred while saving.');
    }
  };

  const handleQuickReopen = async (daysToAdd: number) => {
    const currentEnd = new Date();
    currentEnd.setDate(currentEnd.getDate() + daysToAdd);
    const newEndStr = currentEnd.toISOString().slice(0, 16);

    setScheduleConfig((prev) => ({
      ...prev,
      endDate: newEndStr,
      statusOverride: 'extended',
      announcementNotice: `Online Application has been reopened and extended until ${currentEnd.toLocaleDateString('en-IN')}.`,
    }));
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 font-sans">
      {/* Page Header */}
      <div>
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gurukul-600 bg-amber-100 px-3 py-1 rounded-full">
          Portal Lifecycle Controls
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-gurukul-navy mt-1">
          Application Form Opening, Closing & Reopening Controls
        </h1>
        <p className="text-xs text-slate-500">
          Configure start and end deadlines, enforce automatic timezone-based closures, or reopen for extended periods.
        </p>
      </div>

      {/* Live Portal Status Banner */}
      {formStatus && (
        <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row justify-between sm:items-center gap-4 ${
          formStatus.isOpen
            ? formStatus.status === 'EXTENDED'
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-emerald-50 border-emerald-300 text-emerald-950'
            : 'bg-red-50 border-red-300 text-red-950'
        }`}>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                formStatus.isOpen
                  ? formStatus.status === 'EXTENDED'
                    ? 'bg-amber-500 text-gurukul-navy'
                    : 'bg-emerald-600 text-white'
                  : 'bg-red-600 text-white'
              }`}>
                PORTAL STATUS: {formStatus.status}
              </span>
              <span className="text-xs font-mono font-bold flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" /> Timezone: {formStatus.timezone}
              </span>
            </div>
            <p className="text-xs font-semibold">{formStatus.message}</p>
          </div>

          <div className="text-xs font-mono text-right">
            <div>Reopened: <strong>{scheduleConfig.reopenedCount} times</strong></div>
            <div className="text-[10px] text-slate-500">Last change logged to audit trail</div>
          </div>
        </div>
      )}

      {saved && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Schedule settings successfully saved and recorded in audit log! Changes are live immediately.</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-300 rounded-xl text-red-900 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSaveSchedule} className="space-y-6">
        {/* Section 1: Opening & Closing Date/Time */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b pb-3">
            <Clock className="w-4 h-4 text-gurukul-600" /> 1. Application Schedule (Timezone: Asia/Kolkata IST)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Application Opening Date & Time *
              </label>
              <input
                type="datetime-local"
                required
                value={scheduleConfig.startDate}
                onChange={(e) => setScheduleConfig({ ...scheduleConfig, startDate: e.target.value })}
                className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">Form automatically opens on this date/time.</p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Application Closing Date & Time *
              </label>
              <input
                type="datetime-local"
                required
                value={scheduleConfig.endDate}
                onChange={(e) => setScheduleConfig({ ...scheduleConfig, endDate: e.target.value })}
                className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">New registrations auto-blocked after this time.</p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Administrative Status Override
              </label>
              <select
                value={scheduleConfig.statusOverride}
                onChange={(e) => setScheduleConfig({ ...scheduleConfig, statusOverride: e.target.value as any })}
                className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-semibold text-slate-800"
              >
                <option value="auto">Auto (Enforce Start & End Timestamps)</option>
                <option value="open">Force Open (Accept Registrations Regardless)</option>
                <option value="closed">Force Closed (Block New Applications Immediately)</option>
                <option value="extended">Extended / Reopened Period</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Enforced Application Timezone
              </label>
              <input
                type="text"
                disabled
                value={scheduleConfig.timezone}
                className="w-full p-2.5 border rounded-xl bg-slate-50 text-slate-500 font-mono font-bold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Public Announcement Marquee / Notice
              </label>
              <input
                type="text"
                value={scheduleConfig.announcementNotice}
                onChange={(e) => setScheduleConfig({ ...scheduleConfig, announcementNotice: e.target.value })}
                className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Reopening & Extension Fast Actions */}
        <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-6 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-amber-600" /> 2. Fast Reopening & Extension Controls
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Gurukul Kurukshetra can reopen the form for a specified additional period whenever required. Reopening sets a new closing date, marks the status as <strong>Extended</strong>, and records the admin action in the audit trail without resetting existing candidate records.
          </p>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={() => handleQuickReopen(7)}
              className="bg-white hover:bg-amber-100 text-amber-950 font-bold text-xs px-3.5 py-2 rounded-xl border border-amber-300 shadow-sm transition"
            >
              + Reopen & Extend by 7 Days
            </button>
            <button
              type="button"
              onClick={() => handleQuickReopen(15)}
              className="bg-white hover:bg-amber-100 text-amber-950 font-bold text-xs px-3.5 py-2 rounded-xl border border-amber-300 shadow-sm transition"
            >
              + Reopen & Extend by 15 Days
            </button>
            <button
              type="button"
              onClick={() => handleQuickReopen(30)}
              className="bg-white hover:bg-amber-100 text-amber-950 font-bold text-xs px-3.5 py-2 rounded-xl border border-amber-300 shadow-sm transition"
            >
              + Reopen & Extend by 30 Days
            </button>
          </div>
        </div>

        {/* Section 3: Non-Destructive Integrity Confirmation */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-slate-900">Database & Application Safety Guarantee:</p>
            <p className="mt-0.5">
              Modifying the schedule or reopening the form strictly preserves all previously submitted, verified, or draft applications. Existing candidate records and fee transactions are never deleted or affected.
            </p>
          </div>
        </div>

        <button
          type="submit"
          className="w-full sm:w-auto px-8 py-3 bg-gurukul-navy hover:bg-gurukul-navyLight text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4 text-amber-400" />
          <span>Save Schedule & Update Portal Controls</span>
        </button>
      </form>
    </div>
  );
}
