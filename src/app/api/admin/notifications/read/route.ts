import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin authorization required' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { id, all } = body;

    if (all) {
      await db.markAllAdminNotificationsAsRead();
    } else if (id) {
      await db.markAdminNotificationAsRead(id);
    } else {
      return NextResponse.json({ error: 'Either notification id or all: true is required' }, { status: 400 });
    }

    const unreadCount = await db.getUnreadAdminNotificationCount();
    return NextResponse.json({
      success: true,
      unreadCount,
    });
  } catch (error: any) {
    console.error('Error marking notification(s) as read:', error);
    return NextResponse.json({ error: error.message || 'Failed to update notification status' }, { status: 500 });
  }
}
