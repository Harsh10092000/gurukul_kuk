'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  CheckCircle, 
  Clock, 
  RotateCcw, 
  Globe, 
  Award, 
  Eye, 
  EyeOff, 
  X, 
  CalendarCheck, 
  ShieldCheck, 
  AlertTriangle,
  Loader2,
  Building2,
  MapPin
} from 'lucide-react';
import { FormScheduleConfig, FormStatusResult } from '@/lib/formSchedule';
import { SystemSettings } from '@/lib/types';

interface ToastState {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function AdminSettingsPage() {
  const [scheduleConfig, setScheduleConfig] = useState<FormScheduleConfig>({
    startDate: '2026-09-01T00:00',
    endDate: '2026-10-31T23:59',
    statusOverride: 'auto',
    timezone: 'Asia/Kolkata (IST)',
    announcementNotice: 'Online Application for Entrance Examination Session 2027-28 is active for Classes 5th, 6th, 7th, 8th, 9th, 11th & NDA Wing.',
    reopenedCount: 0,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'system',
  });

  const [formStatus, setFormStatus] = useState<FormStatusResult | null>(null);
  const [scheduleSaving, setScheduleSaving] = useState(false);

  const [academicSettings, setAcademicSettings] = useState<SystemSettings>({
    portalOpen: true,
    resultsDeclared: false,
    academicSession: '2027-2028',
    applicationFee: 800,
    registrationStartDate: '2026-09-01',
    registrationEndDate: '2027-01-31',
    admitCardReleaseDate: '2027-03-01',
    entranceExamDate: '2027-02-14',
    entranceExamTime: '9:30 AM (Boys) / 8:30 AM (Girls)',
    examVenueName: 'Aryakulam Nilokheri (Boys) / The Gurukul Nilokheri (Girls)',
    examVenueAddress: 'Nilokheri, Karnal, Haryana - 132117',
    resultDeclarationDate: '2027-03-01',
    counselingStartDate: '2027-03-10',
    helplinePhone: '+91 7027849858 / 59',
    helplineEmail: 'admissions@thegurukulnilokheri.com',
    activeStudyLocations: ['Gurukul Nilokheri', 'Gurukul Jyotisar', 'Aryakulam Nilokheri'],
  });

  const [locationsSaving, setLocationsSaving] = useState(false);

  const [academicSaving, setAcademicSaving] = useState(false);
  const [resultsDeclared, setResultsDeclared] = useState<boolean | null>(null);
  const [resultToggling, setResultToggling] = useState(false);
  const [admitCardsReleased, setAdmitCardsReleased] = useState<boolean | null>(null);
  const [admitCardToggling, setAdmitCardToggling] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 4500);
  };

  const formatToISTDateTimeLocal = (dateStr?: string, fallback: string = ''): string => {
    if (!dateStr) return fallback;
    try {
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dateStr)) {
        return dateStr;
      }
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return fallback;
      const parts = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(d);
      const map: Record<string, string> = {};
      for (const p of parts) {
        if (p.type !== 'literal') map[p.type] = p.value;
      }
      let hour = map.hour === '24' ? '00' : map.hour;
      return `${map.year}-${map.month}-${map.day}T${hour}:${map.minute}`;
    } catch {
      return dateStr.slice(0, 16) || fallback;
    }
  };

  const loadSchedule = () => {
    fetch('/api/schedule')
      .then((res) => res.json())
      .then((data) => {
        if (data.config) {
          setScheduleConfig({
            ...data.config,
            startDate: formatToISTDateTimeLocal(data.config.startDate, '2026-09-01T00:00'),
            endDate: formatToISTDateTimeLocal(data.config.endDate, '2026-09-30T23:59'),
          });
        }
        if (data.status) setFormStatus(data.status);
      })
      .catch(() => {});
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
          setResultsDeclared(typeof data.settings.resultsDeclared === 'boolean' ? data.settings.resultsDeclared : false);
          setAdmitCardsReleased(typeof data.settings.admitCardsReleased === 'boolean' ? data.settings.admitCardsReleased : false);
        } else {
          setResultsDeclared((prev) => prev ?? false);
          setAdmitCardsReleased((prev) => prev ?? false);
        }
      })
      .catch(() => {
        setResultsDeclared((prev) => prev ?? false);
        setAdmitCardsReleased((prev) => prev ?? false);
      });
  };

  useEffect(() => {
    loadSchedule();
    loadAcademicSettings();
  }, []);

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleSaving(true);

    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleConfig),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Failed to update form schedule.', 'error');
        return;
      }

      setScheduleConfig({
        ...data.config,
        startDate: formatToISTDateTimeLocal(data.config.startDate, scheduleConfig.startDate),
        endDate: formatToISTDateTimeLocal(data.config.endDate, scheduleConfig.endDate),
      });
      setFormStatus(data.status);
      showToast('Form schedule & portal controls updated successfully.', 'success');
      loadAcademicSettings();
    } catch {
      showToast('Network error while saving schedule.', 'error');
    } finally {
      setScheduleSaving(false);
    }
  };

  const handleQuickReopen = (daysToAdd: number) => {
    const now = new Date();
    const currentEnd = scheduleConfig.endDate ? new Date(scheduleConfig.endDate) : null;
    const effectiveBase = currentEnd && currentEnd > now ? new Date(currentEnd) : new Date(now);
    effectiveBase.setDate(effectiveBase.getDate() + daysToAdd);

    const pad = (n: number) => n.toString().padStart(2, '0');
    const newDateOnlyStr = `${effectiveBase.getFullYear()}-${pad(effectiveBase.getMonth() + 1)}-${pad(effectiveBase.getDate())}`;
    const newDateTimeStr = `${newDateOnlyStr}T${pad(effectiveBase.getHours())}:${pad(effectiveBase.getMinutes())}`;
    const dateFormatted = effectiveBase.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    setScheduleConfig((prev) => ({
      ...prev,
      endDate: newDateTimeStr,
      statusOverride: 'extended',
      announcementNotice: `Online Application has been extended until ${dateFormatted}.`,
    }));

    setAcademicSettings((prev) => ({
      ...prev,
      registrationEndDate: newDateOnlyStr,
    }));

    showToast(`End date extended by ${daysToAdd} days to ${dateFormatted}. Click Save below to commit.`, 'info');
  };

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
        showToast(data.error || 'Failed to update academic dates.', 'error');
        return;
      }

      setAcademicSettings(data.settings);
      showToast('Academic milestone dates updated successfully.', 'success');
      loadSchedule();
      loadAcademicSettings();
    } catch {
      showToast('Network error while saving dates.', 'error');
    } finally {
      setAcademicSaving(false);
    }
  };

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
        showToast(data.error || 'Failed to update result declaration.', 'error');
      } else {
        setResultsDeclared(declare);
        setAcademicSettings((prev) => ({ ...prev, resultsDeclared: declare }));
        showToast(
          declare
            ? 'Results are now declared and publicly visible to candidates.'
            : 'Results have been hidden from candidates.',
          'success'
        );
      }
    } catch {
      showToast('Network error while toggling result visibility.', 'error');
    } finally {
      setResultToggling(false);
    }
  };

  const handleToggleAdmitCards = async (release: boolean) => {
    setAdmitCardToggling(true);
    try {
      const res = await fetch('/api/admit-card/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admitCardsReleased: release }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to update admit card status.', 'error');
      } else {
        setAdmitCardsReleased(release);
        showToast(
          release
            ? 'Admit cards are now officially released and visible to candidates.'
            : 'Admit cards are now hidden from candidates.',
          'success'
        );
      }
    } catch {
      showToast('Network error while toggling admit card visibility.', 'error');
    } finally {
      setAdmitCardToggling(false);
    }
  };

  const handleToggleLocation = (loc: string) => {
    const current = academicSettings.activeStudyLocations || ['Gurukul Nilokheri', 'Gurukul Jyotisar', 'Aryakulam Nilokheri'];
    let updated: string[];
    if (current.includes(loc)) {
      if (current.length === 1) {
        showToast('At least one campus/study location must remain enabled.', 'error');
        return;
      }
      updated = current.filter((l) => l !== loc);
    } else {
      updated = [...current, loc];
    }
    setAcademicSettings((prev) => ({ ...prev, activeStudyLocations: updated }));
  };

  const handleSaveLocations = async () => {
    setLocationsSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeStudyLocations: academicSettings.activeStudyLocations }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to update study location settings.', 'error');
        return;
      }
      setAcademicSettings((prev) => ({
        ...prev,
        ...data.settings,
        activeStudyLocations: data.settings?.activeStudyLocations || academicSettings.activeStudyLocations,
      }));
      showToast('Active preferred study locations updated successfully.', 'success');
    } catch {
      showToast('Network error while saving campus availability.', 'error');
    } finally {
      setLocationsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Toast Notification (Top-Right Eye-Level Notification) */}
      {toast && (
        <div className="fixed top-24 right-4 sm:right-8 z-50 transition-all duration-300 transform translate-y-0">
          <div className={`flex items-start gap-3 p-4 rounded-xl shadow-2xl border max-w-sm sm:max-w-md bg-white text-xs ${
            toast.type === 'success'
              ? 'border-emerald-200 border-l-4 border-l-emerald-600'
              : toast.type === 'error'
              ? 'border-rose-200 border-l-4 border-l-rose-600'
              : 'border-slate-200 border-l-4 border-l-portal-navy'
          }`}>
            <div className="flex-shrink-0 mt-0.5">
              {toast.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              ) : toast.type === 'error' ? (
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              ) : (
                <Clock className="w-5 h-5 text-portal-navy" />
              )}
            </div>
            <div className="flex-1 min-w-0 pr-2">
              <span className={`font-bold text-sm block ${
                toast.type === 'success' ? 'text-emerald-900' : toast.type === 'error' ? 'text-rose-900' : 'text-slate-900'
              }`}>
                {toast.type === 'success' ? 'Updated Successfully' : toast.type === 'error' ? 'Action Failed' : 'Notice'}
              </span>
              <p className="text-slate-600 mt-1 leading-relaxed text-xs">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition flex-shrink-0"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          Portal Lifecycle, Dates &amp; System Configuration
        </h1>
        <p className="text-xs text-slate-500">
          Manage application deadlines, academic milestones, result declarations, and helpline channels.
        </p>
      </div>

      {/* Live Status Bar */}
      {formStatus && (
        <div className={`p-4 rounded-lg border flex flex-col sm:flex-row justify-between sm:items-center gap-3 text-xs ${
          formStatus.isOpen
            ? formStatus.status === 'EXTENDED'
              ? 'bg-amber-50 border-amber-200 text-amber-950'
              : 'bg-emerald-50 border-emerald-200 text-emerald-950'
            : 'bg-rose-50 border-rose-200 text-rose-950'
        }`}>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold">STATUS: {formStatus.status}</span>
              <span className="text-slate-500">• Timezone: {formStatus.timezone}</span>
            </div>
            <p className="text-slate-700 mt-0.5">{formStatus.message}</p>
          </div>
          <span className="text-[11px] text-slate-500">
            Extensions: {scheduleConfig.reopenedCount}
          </span>
        </div>
      )}

      {/* SECTION 1: Key Academic Milestones */}
      <div className="portal-card p-6 space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="font-bold text-sm text-slate-900">
            Key Academic Milestones &amp; Examination Dates
          </h2>
          <p className="text-xs text-slate-500">
            Dates configured here synchronize across the candidate portal, dashboard, and official notices.
          </p>
        </div>

        <form onSubmit={handleSaveAcademicDates} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="form-label">
                Academic Session <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={academicSettings.academicSession}
                onChange={(e) => setAcademicSettings({ ...academicSettings, academicSession: e.target.value })}
                className="form-input-field"
              />
            </div>

            <div>
              <label className="form-label">
                Application Fee (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min={0}
                value={academicSettings.applicationFee}
                onChange={(e) => setAcademicSettings({ ...academicSettings, applicationFee: Number(e.target.value) })}
                className="form-input-field font-mono"
              />
            </div>

            <div>
              <label className="form-label">
                Registration Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={academicSettings.registrationStartDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setAcademicSettings({ ...academicSettings, registrationStartDate: val });
                  if (val) {
                    const timePart = scheduleConfig.startDate?.includes('T') ? scheduleConfig.startDate.split('T')[1] : '00:00';
                    setScheduleConfig((prev) => ({ ...prev, startDate: `${val}T${timePart}` }));
                  }
                }}
                className="form-input-field font-mono"
              />
            </div>

            <div>
              <label className="form-label">
                Registration End Date (Deadline) <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={academicSettings.registrationEndDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setAcademicSettings({ ...academicSettings, registrationEndDate: val });
                  if (val) {
                    const timePart = scheduleConfig.endDate?.includes('T') ? scheduleConfig.endDate.split('T')[1] : '23:59';
                    setScheduleConfig((prev) => ({ ...prev, endDate: `${val}T${timePart}` }));
                  }
                }}
                className="form-input-field font-mono"
              />
            </div>

            <div>
              <label className="form-label">
                Admit Card Release Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={academicSettings.admitCardReleaseDate}
                onChange={(e) => setAcademicSettings({ ...academicSettings, admitCardReleaseDate: e.target.value })}
                className="form-input-field font-mono"
              />
            </div>

            <div>
              <label className="form-label">
                Entrance Exam Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={academicSettings.entranceExamDate}
                onChange={(e) => setAcademicSettings({ ...academicSettings, entranceExamDate: e.target.value })}
                className="form-input-field font-mono"
              />
            </div>

            <div>
              <label className="form-label">
                Reporting Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 9:30 AM"
                value={academicSettings.entranceExamTime || '9:30 AM'}
                onChange={(e) => setAcademicSettings({ ...academicSettings, entranceExamTime: e.target.value })}
                className="form-input-field font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="form-label">
                Exam Venue Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={academicSettings.examVenueName || ''}
                onChange={(e) => setAcademicSettings({ ...academicSettings, examVenueName: e.target.value })}
                className="form-input-field font-mono"
              />
            </div>

            <div>
              <label className="form-label">
                Venue Location / PIN <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={academicSettings.examVenueAddress || ''}
                onChange={(e) => setAcademicSettings({ ...academicSettings, examVenueAddress: e.target.value })}
                className="form-input-field font-mono"
              />
            </div>

            <div>
              <label className="form-label">
                Result Declaration Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={academicSettings.resultDeclarationDate}
                onChange={(e) => setAcademicSettings({ ...academicSettings, resultDeclarationDate: e.target.value })}
                className="form-input-field font-mono"
              />
            </div>

            <div>
              <label className="form-label">
                Counseling Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={academicSettings.counselingStartDate}
                onChange={(e) => setAcademicSettings({ ...academicSettings, counselingStartDate: e.target.value })}
                className="form-input-field font-mono"
              />
            </div>

            <div>
              <label className="form-label">
                Helpline Phone
              </label>
              <input
                type="text"
                value={academicSettings.helplinePhone}
                onChange={(e) => setAcademicSettings({ ...academicSettings, helplinePhone: e.target.value })}
                className="form-input-field font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="form-label">
                Helpline Email
              </label>
              <input
                type="email"
                value={academicSettings.helplineEmail}
                onChange={(e) => setAcademicSettings({ ...academicSettings, helplineEmail: e.target.value })}
                className="form-input-field font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={academicSaving}
              className="btn-primary text-xs px-5 py-2 font-semibold"
            >
              {academicSaving ? 'Updating...' : 'Save Academic Dates'}
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: Form Opening / Closing Schedule */}
      <form onSubmit={handleSaveSchedule} className="portal-card p-6 space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="font-bold text-sm text-slate-900">
            Application Schedule &amp; Overrides
          </h2>
          <p className="text-xs text-slate-500">
            Automated registration start/end timestamps and admin overrides.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="form-label">
              Opening Timestamp (IST) <span className="text-rose-500">*</span>
            </label>
            <input
              type="datetime-local"
              required
              value={scheduleConfig.startDate}
              onChange={(e) => {
                const val = e.target.value;
                setScheduleConfig((prev) => ({ ...prev, startDate: val }));
                if (val && val.length >= 10) {
                  setAcademicSettings((prev) => ({ ...prev, registrationStartDate: val.slice(0, 10) }));
                }
              }}
              className="form-input-field font-mono"
            />
          </div>

          <div>
            <label className="form-label">
              Closing Timestamp (IST) <span className="text-rose-500">*</span>
            </label>
            <input
              type="datetime-local"
              required
              value={scheduleConfig.endDate}
              onChange={(e) => {
                const val = e.target.value;
                setScheduleConfig((prev) => ({ ...prev, endDate: val }));
                if (val && val.length >= 10) {
                  setAcademicSettings((prev) => ({ ...prev, registrationEndDate: val.slice(0, 10) }));
                }
              }}
              className="form-input-field font-mono"
            />
          </div>

          <div>
            <label className="form-label">
              Status Override
            </label>
            <select
              value={scheduleConfig.statusOverride}
              onChange={(e) => setScheduleConfig({ ...scheduleConfig, statusOverride: e.target.value as any })}
              className="form-input-field font-medium"
            >
              <option value="auto">Auto (Follow Timestamps)</option>
              <option value="open">Force Open</option>
              <option value="closed">Force Closed</option>
              <option value="extended">Extended Period</option>
            </select>
          </div>

          <div>
            <label className="form-label">
              Timezone
            </label>
            <input
              type="text"
              disabled
              value={scheduleConfig.timezone}
              className="form-input-field bg-slate-50 text-slate-500 cursor-not-allowed font-mono"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="form-label">
              Announcement Notice
            </label>
            <input
              type="text"
              value={scheduleConfig.announcementNotice}
              onChange={(e) => setScheduleConfig({ ...scheduleConfig, announcementNotice: e.target.value })}
              className="form-input-field"
            />
          </div>
        </div>

        {/* Fast Extension Buttons */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
          <span className="text-xs font-semibold text-slate-900 block">
            Quick Deadline Extension
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleQuickReopen(7)}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              + 7 Days
            </button>
            <button
              type="button"
              onClick={() => handleQuickReopen(15)}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              + 15 Days
            </button>
            <button
              type="button"
              onClick={() => handleQuickReopen(30)}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              + 30 Days
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            type="submit"
            disabled={scheduleSaving}
            className="btn-primary text-xs px-5 py-2 font-semibold"
          >
            {scheduleSaving ? 'Saving...' : 'Save Schedule'}
          </button>
        </div>
      </form>

      {/* SECTION 3: Result & Admit Card Visibility Toggles */}
      <div className="portal-card p-6 space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="font-bold text-sm text-slate-900">
            Candidate Visibility Toggles
          </h2>
          <p className="text-xs text-slate-500">
            Control candidate-facing visibility for results and admit cards.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Result Toggle */}
          <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-white">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-xs text-slate-900">Entrance Results</span>
              {resultsDeclared === null ? (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-500 animate-pulse">
                  <Loader2 className="w-2.5 h-2.5 animate-spin text-slate-400" /> Checking...
                </span>
              ) : (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                  resultsDeclared ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                }`}>
                  {resultsDeclared ? 'Visible & Declared' : 'Hidden'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 min-h-[32px] flex items-center">
              {resultsDeclared === null ? (
                <span className="inline-flex items-center gap-2 text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-portal-navy/50" />
                  <span>Loading results visibility status...</span>
                </span>
              ) : resultsDeclared ? (
                'Candidates can search and view published scorecards.'
              ) : (
                'Results are hidden from candidates.'
              )}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={resultsDeclared === null || resultToggling || resultsDeclared === true}
                onClick={() => handleToggleResults(true)}
                className="btn-primary text-xs px-3 py-1.5 flex-1 font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {resultToggling && resultsDeclared !== true && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                )}
                <span>Declare Results</span>
              </button>
              <button
                type="button"
                disabled={resultsDeclared === null || resultToggling || resultsDeclared === false}
                onClick={() => handleToggleResults(false)}
                className="btn-secondary text-xs px-3 py-1.5 flex-1 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {resultToggling && resultsDeclared === true && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-portal-navy" />
                )}
                <span>Hide Results</span>
              </button>
            </div>
          </div>

          {/* Admit Card Toggle */}
          <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-white">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-xs text-slate-900">Admit Cards</span>
              {admitCardsReleased === null ? (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-500 animate-pulse">
                  <Loader2 className="w-2.5 h-2.5 animate-spin text-slate-400" /> Checking...
                </span>
              ) : (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                  admitCardsReleased ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                }`}>
                  {admitCardsReleased ? 'Visible & Released' : 'Hidden'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 min-h-[32px] flex items-center">
              {admitCardsReleased === null ? (
                <span className="inline-flex items-center gap-2 text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-portal-navy/50" />
                  <span>Loading admit card release status...</span>
                </span>
              ) : admitCardsReleased ? (
                'Candidates can download Hall Tickets from the portal.'
              ) : (
                'Admit Cards are hidden from candidates.'
              )}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={admitCardsReleased === null || admitCardToggling || admitCardsReleased === true}
                onClick={() => handleToggleAdmitCards(true)}
                className="btn-primary text-xs px-3 py-1.5 flex-1 font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {admitCardToggling && admitCardsReleased !== true && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                )}
                <span>Release Cards</span>
              </button>
              <button
                type="button"
                disabled={admitCardsReleased === null || admitCardToggling || admitCardsReleased === false}
                onClick={() => handleToggleAdmitCards(false)}
                className="btn-secondary text-xs px-3 py-1.5 flex-1 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {admitCardToggling && admitCardsReleased === true && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-portal-navy" />
                )}
                <span>Hide Cards</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: Preferred Study Locations & Campus Availability */}
      <div className="portal-card p-6 space-y-5">
        <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-portal-navy" />
              <span>Preferred Study Locations &amp; Campus Availability</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Control which campuses are displayed to candidates during application registration. Note: The Gurukul Nilokheri is exclusively designated for Girls; Boys can choose from The Gurukul Jyotisar and Aryakulam Nilokheri.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-portal-navy bg-portal-gold/10 px-2.5 py-1 rounded-full self-start sm:self-auto">
            {(academicSettings.activeStudyLocations || []).length} Active Campus{(academicSettings.activeStudyLocations || []).length === 1 ? '' : 'es'}
          </span>
        </div>

        <div className="space-y-3">
          {[
            {
              id: 'Gurukul Nilokheri',
              title: 'The Gurukul Nilokheri',
              tag: 'Girls Wing Only',
              tagColor: 'bg-rose-50 text-rose-700 border-rose-200',
              streams: 'Commerce, Humanities, Non Medical, Medical',
              note: 'Sole campus offering Humanities stream. Dedicated campus exclusively for female candidates.',
            },
            {
              id: 'Gurukul Jyotisar',
              title: 'The Gurukul Jyotisar',
              tag: 'Boys Only',
              tagColor: 'bg-blue-50 text-blue-700 border-blue-200',
              streams: 'Commerce, Non Medical, Medical',
              note: 'Located on Pehowa Road, Kurukshetra. Available for male candidates.',
            },
            {
              id: 'Aryakulam Nilokheri',
              title: 'Aryakulam Nilokheri',
              tag: 'Boys Only',
              tagColor: 'bg-amber-50 text-amber-700 border-amber-200',
              streams: 'Commerce, Non Medical, Medical',
              note: 'CBSE Affiliated, Nilokheri (Karnal). Available for male candidates.',
            },
          ].map((campus) => {
            const isChecked = (academicSettings.activeStudyLocations || ['Gurukul Nilokheri', 'Gurukul Jyotisar', 'Aryakulam Nilokheri']).includes(campus.id);
            return (
              <div
                key={campus.id}
                onClick={() => handleToggleLocation(campus.id)}
                className={`p-4 rounded-xl border transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isChecked
                    ? 'border-portal-navy/30 bg-portal-navy/[0.02] hover:bg-portal-navy/[0.04]'
                    : 'border-slate-200 bg-slate-50/60 opacity-65 hover:opacity-85'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-portal-navy focus:ring-portal-navy cursor-pointer"
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900">{campus.title}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${campus.tagColor}`}>
                        {campus.tag}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        isChecked ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {isChecked ? 'Visible to Applicants' : 'Hidden'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{campus.note}</p>
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                      <span className="font-medium text-slate-700">Class 11 Streams:</span>
                      <span className="font-mono text-slate-600">{campus.streams}</span>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 self-end sm:self-center">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-md border ${
                    isChecked
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                      : 'border-slate-300 bg-white text-slate-500'
                  }`}>
                    {isChecked ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-slate-100">
          <p className="text-[11px] text-slate-500">
            Click checkboxes to toggle availability, then click &ldquo;Save Campus Settings&rdquo; to apply immediately.
          </p>
          <button
            type="button"
            onClick={handleSaveLocations}
            disabled={locationsSaving}
            className="btn-primary text-xs px-5 py-2 font-semibold flex items-center gap-2"
          >
            {locationsSaving && <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />}
            <span>{locationsSaving ? 'Saving...' : 'Save Campus Settings'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
