import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { broadcastResultDeclaredNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    const declared = await db.areResultsDeclared();
    return NextResponse.json({
      resultsDeclared: declared,
      role: user?.role || 'guest',
    });
  } catch {
    return NextResponse.json({ resultsDeclared: false, role: 'guest' });
  }
}

// Admin-only: toggle whether results are visible to candidates
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin authorization required' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    if (typeof body.resultsDeclared !== 'boolean') {
      return NextResponse.json({ error: 'resultsDeclared (boolean) is required' }, { status: 400 });
    }

    await db.updateSettings({ resultsDeclared: body.resultsDeclared });

    let notifiedCount = 0;
    let totalRecipients = 0;

    // When results are declared, send notification to all registered candidates
    if (body.resultsDeclared === true) {
      const broadcastRes = await broadcastResultDeclaredNotification();
      notifiedCount = broadcastRes.notifiedCount;
      totalRecipients = broadcastRes.totalRecipients;
    }

    return NextResponse.json({
      success: true,
      resultsDeclared: body.resultsDeclared,
      message: body.resultsDeclared
        ? `Results are now visible to candidates. Announcement email sent to ${notifiedCount} registered candidate(s).`
        : 'Results are now hidden from candidates.',
      notifiedCount,
      totalRecipients,
    });
  } catch (error: any) {
    console.error('Error toggling resultsDeclared:', error);
    return NextResponse.json({ error: error.message || 'Failed to update result declaration status' }, { status: 500 });
  }
}
