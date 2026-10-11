import { NextResponse } from 'next/server';
import { getCurrentUser, getAuthCookieOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const tokenUser = await getCurrentUser();
    if (!tokenUser) {
      return NextResponse.json(
        { user: null },
        {
          status: 200,
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' },
        }
      );
    }

    // Anyone with a temporary token (pre-payment) is strictly unauthenticated
    if (tokenUser.userId && tokenUser.userId.startsWith('temp_')) {
      try {
        await db.deleteTempApplication(tokenUser.userId);
      } catch (e) {
        console.error('Error deleting temp application in /api/auth/me:', e);
      }
      const cookieOptions = getAuthCookieOptions();
      const response = NextResponse.json(
        { user: null },
        {
          status: 200,
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' },
        }
      );
      response.cookies.set(cookieOptions.name, '', { ...cookieOptions, maxAge: 0 });
      return response;
    }

    let fullUser: any = null;
    try {
      fullUser =
        (await db.findUserByIdentifier(tokenUser.email)) ||
        (await db.findUserByIdentifier(tokenUser.userId));
    } catch (err) {
      console.error('Error fetching user details in /api/auth/me:', err);
    }

    return NextResponse.json(
      {
        user: {
          id: tokenUser.userId,
          name: fullUser?.name || tokenUser.name,
          email: fullUser?.email || tokenUser.email,
          phone: fullUser?.phone || '',
          role: tokenUser.role,
          registrationNumber: fullUser?.registrationNumber,
          isTemporary: false,
        },
      },
      {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' },
      }
    );
  } catch (err) {
    console.error('Unhandled error in /api/auth/me:', err);
    return NextResponse.json(
      { user: null, error: 'Internal server error' },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' },
      }
    );
  }
}
