import { NextResponse } from 'next/server';
import { getAuthCookieOptions } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully.' });
  const cookieOptions = getAuthCookieOptions();
  response.cookies.set(cookieOptions.name, '', { ...cookieOptions, maxAge: 0 });
  return response;
}
