import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const centres = await db.getCentres();
    return NextResponse.json({
      success: true,
      centres: centres.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        city: c.city,
        state: c.state,
        capacity: c.capacity,
        address: c.address,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch examination centres' }, { status: 500 });
  }
}
