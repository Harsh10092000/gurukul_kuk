import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const tokenUser = await getCurrentUser();
  if (!tokenUser) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  // Handle temporary unregistered session
  if (tokenUser.userId && tokenUser.userId.startsWith('temp_')) {
    const tempApp = await db.getTempApplication(tokenUser.userId);
    if (!tempApp) {
      return NextResponse.json({ user: null }, { status: 200 });
    }
    return NextResponse.json({
      user: {
        id: tokenUser.userId,
        name: tempApp.name || tempApp.personalInfo?.fullName || tokenUser.name,
        email: tempApp.email || tempApp.personalInfo?.candidateEmail || tokenUser.email,
        phone: tempApp.phone || tempApp.personalInfo?.candidateMobile || '',
        role: 'applicant',
        isTemporary: true,
        registrationNumber: undefined,
      },
    });
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
