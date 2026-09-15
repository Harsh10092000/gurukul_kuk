import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin authorization required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;

    const enquiries = await db.getContactEnquiries(status);

    return NextResponse.json({
      success: true,
      enquiries,
    });
  } catch (error: any) {
    console.error('Error fetching contact enquiries:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch contact enquiries' }, { status: 500 });
  }
}
