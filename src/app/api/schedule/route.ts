import { NextResponse } from 'next/server';
import { checkFormStatus, getFormSchedule, updateFormSchedule } from '@/lib/formSchedule';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await db.getSettings();
    const config = await getFormSchedule();
    const status = await checkFormStatus();

    return NextResponse.json(
      {
        isOpen: settings.portalOpen !== false && status.isOpen,
        status: status.status,
        message: status.message,
        startDate: config.startDate,
        endDate: config.endDate,
        timezone: status.timezone,
        announcementNotice: status.announcementNotice,
        config,
        details: status,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Failed to fetch form schedule from database:', error);
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

    const status = await checkFormStatus();
    return NextResponse.json({
      success: true,
      message: 'Admission form schedule updated in database and recorded in audit log successfully.',
      config: updated,
      status,
    });
  } catch (error: any) {
    console.error('Failed to update form schedule in database:', error);
    return NextResponse.json({ error: error.message || 'Failed to update schedule' }, { status: 500 });
  }
}
