import { NextResponse } from 'next/server';
import { getAuthCookieOptions, getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST() {
  const user = await getCurrentUser();
  if (user?.userId && user.userId.startsWith('temp_')) {
    await db.deleteTempApplication(user.userId);
  }
  const response = NextResponse.json({ success: true, message: 'Logged out successfully.' });
  const cookieOptions = getAuthCookieOptions();
  response.cookies.set(cookieOptions.name, '', { ...cookieOptions, maxAge: 0 });
  return response;
}
