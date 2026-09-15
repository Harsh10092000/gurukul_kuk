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
  Globe,
  Award,
  Eye,
  EyeOff,
  Sparkles,
  X,
  CalendarCheck,
  Layers,
  PhoneCall
} from 'lucide-react';
import { FormScheduleConfig, FormStatusResult } from '@/lib/formSchedule';
import { SystemSettings } from '@/lib/types';

interface ToastState {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function AdminSettingsPage() {
  // ── Form Schedule Config ──────────────────────────────────────
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
  const [scheduleSaving, setScheduleSaving] = useState(false);

  // ── Key Academic Dates & Milestones ───────────────────────────
  const [academicSettings, setAcademicSettings] = useState<SystemSettings>({
    portalOpen: true,
    resultsDeclared: false,
    academicSession: '2026-2027',
    applicationFee: 1200,
    registrationStartDate: '2026-09-01',
    registrationEndDate: '2026-10-31',
    admitCardReleaseDate: '2026-11-15',
    entranceExamDate: '2026-12-06',
    resultDeclarationDate: '2026-12-20',
    counselingStartDate: '2027-01-05',
    helplinePhone: '+91-1744-259114 / +91-9896328329',
    helplineEmail: 'admissions@gurukulkurukshetra.com',
  });

  const [academicSaving, setAcademicSaving] = useState(false);

  // ── Result Declaration State ─────────────────────────────────
  const [resultsDeclared, setResultsDeclared] = useState<boolean | null>(null);
  const [resultToggling, setResultToggling] = useState(false);

  // ── Toast Notification Popup State ───────────────────────────
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 4500);
  };

  // ── Initial Data Load ─────────────────────────────────────────
  const loadSchedule = () => {
    fetch('/api/schedule')
      .then((res) => res.json())
      .then((data) => {
        if (data.config) {
          setScheduleConfig({
            ...data.config,
            startDate: data.config.startDate ? data.config.startDate.slice(0, 16) : '2026-09-01T00:00',
            endDate: data.config.endDate ? data.config.endDate.slice(0, 16) : '2026-10-31T23:59',
          });
        }
        if (data.status) setFormStatus(data.status);
      })
      .catch((err) => console.warn('Failed to load schedule:', err));
  };

  const loadAcademicSettings = () => {
    fetch('/api/admin/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) {
          setAcademicSettings((prev) => ({
            ...prev,
            ...data.settings,
          }));
          if (typeof data.settings.resultsDeclared === 'boolean') {
            setResultsDeclared(data.settings.resultsDeclared);
          }
        }
      })
      .catch((err) => console.warn('Failed to load academic settings:', err));
  };

  useEffect(() => {
    loadSchedule();
    loadAcademicSettings();

    // Fetch current resultsDeclared status directly
    fetch('/api/results/status')
      .then((r) => r.json())
      .then((d) => {
        if (d.resultsDeclared !== undefined) {
          setResultsDeclared(d.resultsDeclared === true);
        }
      })
      .catch(() => setResultsDeclared(false));
  }, []);

  // ── Save Form Schedule ────────────────────────────────────────
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleSaving(true);

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
        showToast(data.error || 'Failed to update schedule settings.', 'error');
        return;
      }

      if (data.status) setFormStatus(data.status);
      showToast('Application schedule settings saved successfully! Changes are live on the portal.', 'success');
    } catch {
      showToast('An unexpected error occurred while saving the schedule.', 'error');
    } finally {
      setScheduleSaving(false);
    }
  };

  // ── Quick Reopen / Extension ───────────────────────────────────
  const handleQuickReopen = (daysToAdd: number) => {
    const currentEnd = new Date();
    currentEnd.setDate(currentEnd.getDate() + daysToAdd);
    const newEndStr = currentEnd.toISOString().slice(0, 16);
    const dateFormatted = currentEnd.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    setScheduleConfig((prev) => ({
      ...prev,
      endDate: newEndStr,
      statusOverride: 'extended',
      announcementNotice: `Online Application has been reopened & extended until ${dateFormatted}.`,
    }));

    showToast(`End date extended by ${daysToAdd} days to ${dateFormatted}. Click "Save Schedule" below to commit.`, 'info');
  };

  // ── Save Key Academic Dates & Milestones ──────────────────────
  const handleSaveAcademicDates = async (e: React.FormEvent) => {
    e.preventDefault();
    setAcademicSaving(true);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(academicSettings),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Failed to update academic milestone dates.', 'error');
        return;
      }

      setAcademicSettings(data.settings);
      showToast('Key academic dates & milestone schedules updated successfully! Visible on public portal.', 'success');
      loadSchedule(); // reload schedule in case start/end dates synchronized
    } catch {
      showToast('Network error while saving academic milestone dates.', 'error');
    } finally {
      setAcademicSaving(false);
    }
  };

  // ── Result Declaration Visibility Toggle ──────────────────────
  const handleToggleResults = async (declare: boolean) => {
    setResultToggling(true);
    try {
      const res = await fetch('/api/results/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultsDeclared: declare }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to update result declaration status.', 'error');
      } else {
        setResultsDeclared(declare);
        setAcademicSettings((prev) => ({ ...prev, resultsDeclared: declare }));
        showToast(
          declare
            ? 'Results are now DECLARED and publicly visible to candidates!'
            : 'Results have been HIDDEN from candidates.',
          'success'
        );
      }
    } catch {
      showToast('Network error while toggling result visibility.', 'error');
    } finally {
      setResultToggling(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16 font-sans relative">
      {/* ── Fixed Bottom-Right Popup Toast ───────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className={`flex items-start gap-3 p-4 rounded-2xl shadow-2xl border max-w-md bg-white ${
            toast.type === 'success'
              ? 'border-emerald-400 ring-2 ring-emerald-100 shadow-emerald-900/10'
              : toast.type === 'error'
              ? 'border-rose-400 ring-2 ring-rose-100 shadow-rose-900/10'
              : 'border-blue-400 ring-2 ring-blue-100 shadow-blue-900/10'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : toast.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            ) : (
              <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 pr-2">
              <p className={`text-xs font-black uppercase tracking-wider ${
                toast.type === 'success'
                  ? 'text-emerald-800'
                  : toast.type === 'error'
                  ? 'text-rose-800'
                  : 'text-blue-800'
              }`}>
                {toast.type === 'success' ? 'Updated Successfully' : toast.type === 'error' ? 'Action Failed' : 'Notice'}
              </p>
              <p className="text-xs text-slate-700 font-semibold mt-0.5 leading-snug">
                {toast.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-slate-600 transition p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Page Header ──────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gurukul-700 bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
            Administrative Control Center
          </span>
          <span className="text-[10px] font-mono font-semibold text-slate-500">
            Real-Time Sync Active
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-gurukul-navy mt-1.5">
          Portal Lifecycle, Dates &amp; System Configuration
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage application deadlines, academic milestones, result declarations, and helpline channels with instantaneous portal updates.
        </p>
      </div>

      {/* ── Live Portal Status Summary ───────────────────────────── */}
      {formStatus && (
        <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row justify-between sm:items-center gap-4 shadow-sm ${
          formStatus.isOpen
            ? formStatus.status === 'EXTENDED'
              ? 'bg-amber-50/80 border-amber-300 text-amber-950'
              : 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
            : 'bg-rose-50/80 border-rose-300 text-rose-950'
        }`}>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wide ${
                formStatus.isOpen
                  ? formStatus.status === 'EXTENDED'
                    ? 'bg-amber-500 text-gurukul-navy'
                    : 'bg-emerald-600 text-white'
                  : 'bg-rose-600 text-white'
              }`}>
                PORTAL STATUS: {formStatus.status}
              </span>
              <span className="text-xs font-mono font-bold flex items-center gap-1 text-slate-700">
                <Globe className="w-3.5 h-3.5 text-slate-500" /> Timezone: {formStatus.timezone}
              </span>
            </div>
            <p className="text-xs font-bold leading-relaxed">{formStatus.message}</p>
          </div>

          <div className="text-xs font-mono sm:text-right flex sm:flex-col justify-between sm:justify-start gap-1 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
            <div>Extensions Granted: <strong className="text-gurukul-navy">{scheduleConfig.reopenedCount} times</strong></div>
            <div className="text-[10px] text-slate-500">Every change timestamped in audit logs</div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* SECTION 1: KEY ACADEMIC DATES & MILESTONES (Real-time Sync) */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2 className="font-extrabold text-slate-900 text-base sm:text-lg flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-gurukul-600" /> Key Academic Milestones &amp; Examination Dates
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Dates configured here update simultaneously across the applicant portal, dashboard timelines, and official notices.
            </p>
          </div>
          <span className="text-[11px] font-bold px-3 py-1 bg-gurukul-50 text-gurukul-700 border border-gurukul-200 rounded-full w-fit">
            Session: {academicSettings.academicSession || '2026-2027'}
          </span>
        </div>

        <form onSubmit={handleSaveAcademicDates} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
            {/* Academic Session */}
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Academic Session *
              </label>
              <input
                type="text"
                required
                value={academicSettings.academicSession}
                onChange={(e) => setAcademicSettings({ ...academicSettings, academicSession: e.target.value })}
                placeholder="2026-2027"
                className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
              />
              <p className="text-[10px] text-slate-400 mt-1">e.g., 2026-2027 or 2026-27</p>
            </div>

            {/* Application Fee */}
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Application Fee (INR ₹) *
              </label>
              <input
                type="number"
                required
                min={0}
                value={academicSettings.applicationFee}
                onChange={(e) => setAcademicSettings({ ...academicSettings, applicationFee: Number(e.target.value) })}
                className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-mono font-bold"
              />
              <p className="text-[10px] text-slate-400 mt-1">Standard candidate application fee</p>
            </div>

            {/* Registration Start Date */}
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Registration Start Date *
              </label>
              <input
                type="date"
                required
                value={academicSettings.registrationStartDate}
                onChange={(e) => setAcademicSettings({ ...academicSettings, registrationStartDate: e.target.value })}
                className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">Portal opens for registration</p>
            </div>

            {/* Registration End Date */}
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Registration End Date (Deadline) *
              </label>
              <input
                type="date"
                required
                value={academicSettings.registrationEndDate}
                onChange={(e) => setAcademicSettings({ ...academicSettings, registrationEndDate: e.target.value })}
                className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">Normal registration closing date</p>
            </div>

            {/* Admit Card Release Date */}
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Admit Card Release Date *
              </label>
              <input
                type="date"
                required
                value={academicSettings.admitCardReleaseDate}
                onChange={(e) => setAcademicSettings({ ...academicSettings, admitCardReleaseDate: e.target.value })}
                className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">Hall tickets generated &amp; downloadable</p>
            </div>

            {/* Written Entrance Exam Date */}
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Written Entrance Exam Date *
              </label>
              <input
                type="date"
                required
                value={academicSettings.entranceExamDate}
                onChange={(e) => setAcademicSettings({ ...academicSettings, entranceExamDate: e.target.value })}
                className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">Official entrance test day</p>
            </div>

            {/* Result Declaration Date */}
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Result Declaration Date *
              </label>
              <input
                type="date"
                required
                value={academicSettings.resultDeclarationDate}
                onChange={(e) => setAcademicSettings({ ...academicSettings, resultDeclarationDate: e.target.value })}
                className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">Merit list &amp; scorecard publication date</p>
            </div>

            {/* Counseling Start Date */}
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Counseling / Admission Start Date *
              </label>
              <input
                type="date"
                required
                value={academicSettings.counselingStartDate}
                onChange={(e) => setAcademicSettings({ ...academicSettings, counselingStartDate: e.target.value })}
                className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">Verification &amp; physical reporting begins</p>
            </div>

            {/* Helpline Phone */}
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Official Helpline Contact Numbers
              </label>
              <input
                type="text"
                value={academicSettings.helplinePhone}
                onChange={(e) => setAcademicSettings({ ...academicSettings, helplinePhone: e.target.value })}
                className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">Displayed in candidate support bars</p>
            </div>

            {/* Helpline Email */}
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Official Helpline Support Email
              </label>
              <input
                type="email"
                value={academicSettings.helplineEmail}
                onChange={(e) => setAcademicSettings({ ...academicSettings, helplineEmail: e.target.value })}
                className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">Enquiries routed to this address</p>
            </div>
          </div>

          <div className="flex items-center justify-end pt-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={academicSaving}
              className="px-7 py-2.5 bg-gurukul-navy hover:bg-gurukul-navyLight disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-2"
            >
              <Save className="w-4 h-4 text-amber-400" />
              <span>{academicSaving ? 'Updating...' : 'Save Academic Dates & Milestones'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* SECTION 2: APPLICATION FORM SCHEDULE & EXTENSION CONTROLS */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <form onSubmit={handleSaveSchedule} className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
          <h2 className="font-extrabold text-slate-900 text-base sm:text-lg flex items-center gap-2 border-b border-slate-100 pb-4">
            <Clock className="w-5 h-5 text-amber-600" /> Application Form Opening, Closing &amp; Status Override
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Application Opening Timestamp (IST) *
              </label>
              <input
                type="datetime-local"
                required
                value={scheduleConfig.startDate}
                onChange={(e) => setScheduleConfig({ ...scheduleConfig, startDate: e.target.value })}
                className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">Form automatically opens on this date and time.</p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Application Closing Timestamp (IST) *
              </label>
              <input
                type="datetime-local"
                required
                value={scheduleConfig.endDate}
                onChange={(e) => setScheduleConfig({ ...scheduleConfig, endDate: e.target.value })}
                className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">New registrations automatically blocked after this timestamp.</p>
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
                <option value="auto">Auto (Enforce Start &amp; End Timestamps)</option>
                <option value="open">Force Open (Accept Registrations Regardless)</option>
                <option value="closed">Force Closed (Block New Applications Immediately)</option>
                <option value="extended">Extended / Reopened Period</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1">Use 'Extended' when reopening after original deadline.</p>
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
              <p className="text-[10px] text-slate-400 mt-1">Server clocks calibrated to Indian Standard Time.</p>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Public Announcement Marquee / Notice
              </label>
              <input
                type="text"
                value={scheduleConfig.announcementNotice}
                onChange={(e) => setScheduleConfig({ ...scheduleConfig, announcementNotice: e.target.value })}
                className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              />
              <p className="text-[10px] text-slate-400 mt-1">Displayed in the header marquee across the entrance examination portal.</p>
            </div>
          </div>

          {/* Quick Extension Buttons */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 space-y-3">
            <h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-600" /> Fast Reopening &amp; Deadline Extension
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Instantly extend candidate submission windows without modifying existing applications or submitted data.
            </p>

            <div className="flex flex-wrap gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleQuickReopen(7)}
                className="bg-white hover:bg-amber-100 text-amber-950 font-bold text-xs px-3.5 py-2 rounded-xl border border-amber-300 shadow-sm transition"
              >
                + Extend by 7 Days
              </button>
              <button
                type="button"
                onClick={() => handleQuickReopen(15)}
                className="bg-white hover:bg-amber-100 text-amber-950 font-bold text-xs px-3.5 py-2 rounded-xl border border-amber-300 shadow-sm transition"
              >
                + Extend by 15 Days
              </button>
              <button
                type="button"
                onClick={() => handleQuickReopen(30)}
                className="bg-white hover:bg-amber-100 text-amber-950 font-bold text-xs px-3.5 py-2 rounded-xl border border-amber-300 shadow-sm transition"
              >
                + Extend by 30 Days
              </button>
            </div>
          </div>

          {/* Safety note */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900">Database &amp; Data Integrity Safety:</p>
              <p className="mt-0.5">
                Extending dates preserves all previously submitted applications, payment records, and generated admit cards.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end pt-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={scheduleSaving}
              className="px-7 py-2.5 bg-gurukul-navy hover:bg-gurukul-navyLight disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-2"
            >
              <Save className="w-4 h-4 text-amber-400" />
              <span>{scheduleSaving ? 'Saving...' : 'Save Schedule & Portal Controls'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* SECTION 3: RESULT DECLARATION & CANDIDATE VISIBILITY       */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
        <h2 className="font-extrabold text-slate-900 text-base sm:text-lg flex items-center gap-2 border-b border-slate-100 pb-4">
          <Award className="w-5 h-5 text-amber-500" /> Result Declaration — Candidate Visibility Gate
        </h2>

        <div className={`p-4 rounded-2xl flex items-start gap-3 ${
          resultsDeclared
            ? 'bg-emerald-50 border border-emerald-300'
            : 'bg-rose-50 border border-rose-300'
        }`}>
          {resultsDeclared ? (
            <Eye className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <EyeOff className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
          )}
          <div className="text-xs">
            <p className={`font-black text-sm ${
              resultsDeclared ? 'text-emerald-900' : 'text-rose-900'
            }`}>
              Results are currently{' '}
              <span className="uppercase">{resultsDeclared ? '✅ VISIBLE TO CANDIDATES' : '🔒 HIDDEN FROM CANDIDATES'}</span>
            </p>
            <p className={`mt-0.5 font-medium ${
              resultsDeclared ? 'text-emerald-700' : 'text-rose-700'
            }`}>
              {resultsDeclared
                ? 'Candidates can view scorecards and qualification status from the portal.'
                : 'Candidate result page access is blocked until the official declaration time.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-1">
          <button
            type="button"
            disabled={resultToggling || resultsDeclared === true}
            onClick={() => handleToggleResults(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow transition"
          >
            <Eye className="w-3.5 h-3.5" />
            Declare Results (Make Visible to All Candidates)
          </button>
          <button
            type="button"
            disabled={resultToggling || resultsDeclared === false}
            onClick={() => handleToggleResults(false)}
            className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow transition"
          >
            <EyeOff className="w-3.5 h-3.5" />
            Hide Results from Candidates
          </button>
        </div>

        <p className="text-[10px] text-slate-400 border-t border-slate-100 pt-3">
          Note: This toggle strictly manages candidate-facing display. Score entries and merit positions entered in the admin database remain intact.
        </p>
      </div>
    </div>
  );
}
