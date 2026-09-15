import { NextResponse } from 'next/server';
import { checkFormStatus, getFormSchedule, updateFormSchedule } from '@/lib/formSchedule';
import { getCurrentUser } from '@/lib/auth';

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

    const status = checkFormStatus();
    return NextResponse.json({
      success: true,
      message: 'Application form schedule updated and recorded in audit log successfully.',
      config: updated,
      status,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update schedule' }, { status: 500 });
  }
}
