import { db } from './db';
import { recordAuditLog } from './audit';
import { FormScheduleConfig, FormStatusResult } from './types';

export type { FormScheduleConfig, FormStatusResult };

const DEFAULT_SCHEDULE: FormScheduleConfig = {
  startDate: '2026-09-01T00:00:00.000Z',
  endDate: '2027-02-12T18:29:59.000Z',
  statusOverride: 'auto',
  timezone: 'Asia/Kolkata (IST)',
  announcementNotice: '',
  reopenedCount: 0,
  lastUpdated: new Date().toISOString(),
  updatedBy: 'system',
};

/**
 * Reads form schedule exclusively from the DATABASE (MySQL system_settings / form_schedules).
 */
export async function getFormSchedule(): Promise<FormScheduleConfig> {
  try {
    return await db.getFormSchedule();
  } catch (err) {
    console.error('Error reading form schedule from database:', err);
    return DEFAULT_SCHEDULE;
  }
}

/**
 * Synchronous fallback returns default schedule without touching disk files
 */
export function getFormScheduleSync(): FormScheduleConfig {
  return DEFAULT_SCHEDULE;
}

/**
 * Persists form schedule directly into database
 */
export function saveFormSchedule(config: FormScheduleConfig) {
  try {
    db.updateFormSchedule(config).catch((err) => {
      console.error('Error writing form schedule to database:', err);
    });
  } catch (err) {
    console.error('Error in saveFormSchedule:', err);
  }
}

/**
 * Evaluates portal availability given a schedule config.
 * Follows configured timezone (IST).
 */
export function evaluateFormStatus(schedule: FormScheduleConfig): FormStatusResult {
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
      announcementNotice: schedule.announcementNotice || 'Online Application for Entrance Examination Session 2027-28 is currently closed.',
    };
  }

  // If the deadline has passed in IST, the portal is CLOSED unless statusOverride is 'extended' or 'open'
  if (now > end && schedule.statusOverride !== 'extended' && schedule.statusOverride !== 'open') {
    return {
      isOpen: false,
      status: 'CLOSED',
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      timezone: schedule.timezone,
      message: `Online applications closed on ${formattedEnd} (${schedule.timezone}).`,
      announcementNotice: schedule.announcementNotice || `Online Application for Entrance Examination Session 2027-28 closed on ${formattedEnd}. Verification of submitted dossiers and roll number allotment in progress.`,
    };
  }

  if (schedule.statusOverride === 'open') {
    return {
      isOpen: true,
      status: 'OPEN',
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      timezone: schedule.timezone,
      message: `Online applications are open until ${formattedEnd} (${schedule.timezone}).`,
      announcementNotice: schedule.announcementNotice || `Notice: Online Application for Entrance Examination Session 2027-28 is active. Last date: ${formattedEnd}.`,
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
      announcementNotice: schedule.announcementNotice || `Notice: Online Application for Entrance Examination Session 2027-28 has been extended up to ${formattedEnd}.`,
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
      announcementNotice: schedule.announcementNotice || `Online applications will commence on ${formattedStart}.`,
    };
  }

  return {
    isOpen: true,
    status: 'OPEN',
    startDate: schedule.startDate,
    endDate: schedule.endDate,
    timezone: schedule.timezone,
    message: `Online applications are currently active until ${formattedEnd} (${schedule.timezone}).`,
    announcementNotice: schedule.announcementNotice || `Online Application for Entrance Examination Session 2027-28 is active. Last date: ${formattedEnd}.`,
  };
}

/**
 * Calculates current portal availability based on administrative schedule and time stored in DATABASE.
 */
export async function checkFormStatus(customConfig?: Partial<FormScheduleConfig>): Promise<FormStatusResult> {
  const schedule = await getFormSchedule();
  const effective = { ...schedule, ...(customConfig || {}) };
  return evaluateFormStatus(effective);
}

/**
 * Synchronous check form status (for sync call sites if any)
 */
export function checkFormStatusSync(config?: FormScheduleConfig): FormStatusResult {
  const schedule = config || getFormScheduleSync();
  return evaluateFormStatus(schedule);
}

/**
 * Administrative action to update schedule or reopen portal directly in the DATABASE.
 */
export async function updateFormSchedule(
  newConfig: Partial<FormScheduleConfig>,
  adminUser: { id: string; name: string; role: string }
): Promise<FormScheduleConfig> {
  const current = await getFormSchedule();
  const updated = await db.updateFormSchedule(newConfig, adminUser);

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
