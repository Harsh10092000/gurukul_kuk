import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const centres = await db.getCentres();
    return NextResponse.json({ success: true, centres });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch examination centres' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const body = await req.json();
    const { code, name, city, state, capacity, address, contactPerson, contactPhone } = body;

    if (!name || !address) {
      return NextResponse.json({ error: 'Venue name and address are required.' }, { status: 400 });
    }

    const centre = await db.addCentre({
      code: code || `GK-${String(Math.floor(Math.random() * 90) + 10)}`,
      name,
      city: city || 'Kurukshetra',
      state: state || 'Haryana',
      capacity: Number(capacity) || 1000,
      address,
      contactPerson: contactPerson || 'Exam Superintendent',
      contactPhone: contactPhone || '+91-1744-259114',
    });

    return NextResponse.json({ success: true, centre }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create examination centre' }, { status: 500 });
  }
}
