import fs from 'fs';
import path from 'path';
import { recordAuditLog } from './audit';

export interface FormScheduleConfig {
  startDate: string; // ISO or YYYY-MM-DDTHH:mm
  endDate: string;   // ISO or YYYY-MM-DDTHH:mm
  statusOverride: 'auto' | 'open' | 'closed' | 'extended';
  timezone: string;  // e.g. 'Asia/Kolkata (IST)'
  announcementNotice: string;
  reopenedCount: number;
  lastUpdated: string;
  updatedBy: string;
}

const SCHEDULE_FILE = path.join(process.cwd(), 'data', 'form_schedule.json');

const DEFAULT_SCHEDULE: FormScheduleConfig = {
  startDate: '2026-09-01T00:00:00.000Z',
  endDate: '2026-10-31T23:59:59.000Z',
  statusOverride: 'auto',
  timezone: 'Asia/Kolkata (IST)',
  announcementNotice: 'Online Application for Entrance Examination Session 2027-28 is active for Classes 5th, 6th, 7th, 8th, 9th, 11th & NDA Wing.',
  reopenedCount: 0,
  lastUpdated: new Date().toISOString(),
  updatedBy: 'system',
};

export function getFormSchedule(): FormScheduleConfig {
  try {
    const dir = path.dirname(SCHEDULE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(SCHEDULE_FILE)) {
      const data = fs.readFileSync(SCHEDULE_FILE, 'utf-8');
      return { ...DEFAULT_SCHEDULE, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error('Error reading form schedule:', err);
  }
  return DEFAULT_SCHEDULE;
}

export function saveFormSchedule(config: FormScheduleConfig) {
  try {
    const dir = path.dirname(SCHEDULE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing form schedule:', err);
  }
}

export interface FormStatusResult {
  isOpen: boolean;
  status: 'OPEN' | 'CLOSED' | 'UPCOMING' | 'EXTENDED';
  startDate: string;
  endDate: string;
  timezone: string;
  message: string;
  announcementNotice: string;
}

/**
 * Calculates current portal availability based on administrative schedule and time.
 * Evaluated strictly in configured timezone (IST).
 */
export function checkFormStatus(): FormStatusResult {
  const schedule = getFormSchedule();
  const now = new Date();
  const start = new Date(schedule.startDate);
  let end = new Date(schedule.endDate);
  if (schedule.endDate) {
    if (schedule.endDate.length === 10) {
      end = new Date(schedule.endDate + 'T23:59:59+05:30');
    } else if (schedule.endDate.includes('T00:00:00')) {
      const datePart = schedule.endDate.split('T')[0];
      end = new Date(datePart + 'T23:59:59+05:30');
    }
  }

  const formattedEnd = end.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
  const formattedStart = start.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });

  if (schedule.statusOverride === 'closed') {
    return {
      isOpen: false,
      status: 'CLOSED',
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      timezone: schedule.timezone,
      message: 'Online Entrance Examination applications are currently closed by administration.',
      announcementNotice: 'Online Application for Entrance Examination Session 2027-28 is currently closed.',
    };
  }

  // If the deadline has passed in IST, the portal is CLOSED unless statusOverride is 'extended'
  if (now > end && schedule.statusOverride !== 'extended') {
    return {
      isOpen: false,
      status: 'CLOSED',
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      timezone: schedule.timezone,
      message: `Online applications closed on ${formattedEnd} (${schedule.timezone}).`,
      announcementNotice: `Online Application for Entrance Examination Session 2027-28 closed on ${formattedEnd}. Verification of submitted dossiers and roll number allotment in progress.`,
    };
  }

  if (schedule.statusOverride === 'extended') {
    return {
      isOpen: true,
      status: 'EXTENDED',
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      timezone: schedule.timezone,
      message: `Admission form has been extended until ${formattedEnd} (${schedule.timezone}).`,
      announcementNotice: `Notice: Online Application for Entrance Examination Session 2027-28 has been extended up to ${formattedEnd}.`,
    };
  }

  // Automatic schedule calculation based on timestamps
  if (now < start) {
    return {
      isOpen: false,
      status: 'UPCOMING',
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      timezone: schedule.timezone,
      message: `Online applications will commence on ${formattedStart} (${schedule.timezone}).`,
      announcementNotice: `Online applications will commence on ${formattedStart}.`,
    };
  }

  return {
    isOpen: true,
    status: 'OPEN',
    startDate: schedule.startDate,
    endDate: schedule.endDate,
    timezone: schedule.timezone,
    message: `Online applications are currently active until ${formattedEnd} (${schedule.timezone}).`,
    announcementNotice: `Online Application for Entrance Examination Session 2027-28 is active. Last date: ${formattedEnd}.`,
  };
}

/**
 * Administrative action to update schedule or reopen portal.
 * Guaranteed to NEVER delete, reset, or affect existing applications.
 */
export async function updateFormSchedule(
  newConfig: Partial<FormScheduleConfig>,
  adminUser: { id: string; name: string; role: string }
): Promise<FormScheduleConfig> {
  const current = getFormSchedule();
  const updated: FormScheduleConfig = {
    ...current,
    ...newConfig,
    reopenedCount: newConfig.statusOverride === 'extended' ? current.reopenedCount + 1 : current.reopenedCount,
    lastUpdated: new Date().toISOString(),
    updatedBy: `${adminUser.name} (${adminUser.id})`,
  };

  saveFormSchedule(updated);

  // Record action in immutable audit trail
  await recordAuditLog({
    userId: adminUser.id,
    userName: adminUser.name,
    userRole: adminUser.role,
    action: newConfig.statusOverride === 'extended' ? 'REOPEN_FORM' : 'UPDATE_FORM_SCHEDULE',
    entity: 'FormSchedule',
    details: {
      previous: current,
      new: updated,
    },
  });

  return updated;
}

