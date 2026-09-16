import { NextResponse } from 'next/server';
import { getCurrentUser, getAuthCookieOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (user && user.userId && user.userId.startsWith('temp_')) {
      await db.deleteTempApplication(user.userId);
    }

    const response = NextResponse.json({
      success: true,
      message: 'Temporary application session has been discarded.',
    });

    const cookieOptions = getAuthCookieOptions();
    response.cookies.delete(cookieOptions.name);

    return response;
  } catch (error) {
    console.error('Cancel application error:', error);
    return NextResponse.json({ error: 'Failed to cancel application' }, { status: 500 });
  }
}
