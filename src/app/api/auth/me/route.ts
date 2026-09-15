import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const tokenUser = await getCurrentUser();
  if (!tokenUser) {
    return NextResponse.json({ user: null }, { status: 200 });
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
    },
  });
}
