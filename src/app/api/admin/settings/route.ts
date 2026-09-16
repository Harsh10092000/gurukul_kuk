import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';
import { updateFormSchedule } from '@/lib/formSchedule';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin authorization required' }, { status: 403 });
    }

    const settings = await db.getSettings();
    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error: any) {
    console.error('Error fetching admin settings:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin authorization required' }, { status: 403 });
    }

    const body = await req.json();
    const currentSettings = await db.getSettings();
    const updatedSettings = await db.updateSettings(body);

    if (body.registrationStartDate || body.registrationEndDate) {
      try {
        const endDateParsed = body.registrationEndDate
          ? (body.registrationEndDate.length === 10
              ? new Date(`${body.registrationEndDate}T23:59:59+05:30`).toISOString()
              : new Date(body.registrationEndDate).toISOString())
          : undefined;

        const startDateParsed = body.registrationStartDate
          ? (body.registrationStartDate.length === 10
              ? new Date(`${body.registrationStartDate}T00:00:00+05:30`).toISOString()
              : new Date(body.registrationStartDate).toISOString())
          : undefined;

        await updateFormSchedule(
          {
            ...(startDateParsed ? { startDate: startDateParsed } : {}),
            ...(endDateParsed ? { endDate: endDateParsed } : {}),
          },
          { id: user.userId, name: user.name, role: user.role }
        );
      } catch (scheduleSyncErr) {
        console.warn('Failed to sync form schedule timestamps:', scheduleSyncErr);
      }
    }

    // Record audit trail
    await recordAuditLog({
      userId: user.userId,
      userName: user.name,
      userRole: user.role,
      action: 'SYSTEM_SETTINGS_UPDATE',
      entity: 'SystemSettings',
      details: {
        previous: currentSettings,
        updated: body,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Portal academic settings and milestone dates updated successfully!',
      settings: updatedSettings,
    });
  } catch (error: any) {
    console.error('Error updating admin settings:', error);
    return NextResponse.json({ error: error.message || 'Failed to update settings' }, { status: 500 });
  }
}
