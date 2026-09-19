import { NextResponse } from 'next/server';
import { getCurrentUser, getAuthCookieOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const tokenUser = await getCurrentUser();
  if (!tokenUser) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  // Anyone with a temporary token (pre-payment) is strictly unauthenticated
  if (tokenUser.userId && tokenUser.userId.startsWith('temp_')) {
    await db.deleteTempApplication(tokenUser.userId);
    const cookieOptions = getAuthCookieOptions();
    const response = NextResponse.json({ user: null }, { status: 200 });
    response.cookies.set(cookieOptions.name, '', { ...cookieOptions, maxAge: 0 });
    return response;
  }

  const fullUser = (await db.findUserByIdentifier(tokenUser.email)) || (await db.findUserByIdentifier(tokenUser.userId));

  return NextResponse.json({
    user: {
      id: tokenUser.userId,
      name: fullUser?.name || tokenUser.name,
      email: fullUser?.email || tokenUser.email,
      phone: fullUser?.phone || '',
      role: tokenUser.role,
      registrationNumber: fullUser?.registrationNumber,
      isTemporary: false,
    },
  });
}
