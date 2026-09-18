import { NextResponse } from 'next/server';
import { checkFormStatus, getFormSchedule, updateFormSchedule } from '@/lib/formSchedule';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const status = checkFormStatus();
    const config = getFormSchedule();
    return NextResponse.json({
      isOpen: status.isOpen,
      status: status.status,
      message: status.message,
      startDate: status.startDate,
      endDate: status.endDate,
      timezone: status.timezone,
      announcementNotice: status.announcementNotice,
      config,
      // For backwards compatibility
      details: status,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch form schedule' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const body = await req.json();
    const updated = await updateFormSchedule(body, {
      id: user.userId,
      name: user.name,
      role: user.role,
    });

    const settingsUpdate: any = {};
    const toISTDateString = (isoOrDateStr: string): string => {
      try {
        const d = new Date(isoOrDateStr);
        if (!isNaN(d.getTime())) {
          return new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }).format(d);
        }
      } catch { }
      return isoOrDateStr.slice(0, 10);
    };

    if (body.endDate) {
      settingsUpdate.registrationEndDate = toISTDateString(body.endDate);
    }
    if (body.startDate) {
      settingsUpdate.registrationStartDate = toISTDateString(body.startDate);
    }
    if (Object.keys(settingsUpdate).length > 0) {
      try {
        await db.updateSettings(settingsUpdate);
      } catch (syncErr) {
        console.warn('Failed to sync db settings registration dates:', syncErr);
      }
    }

    const status = checkFormStatus();
    return NextResponse.json({
      success: true,
      message: 'Admission form schedule updated and recorded in audit log successfully.',
      config: updated,
      status,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update schedule' }, { status: 500 });
  }
}
