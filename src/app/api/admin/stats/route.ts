import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const [dashboardData, settings] = await Promise.all([
      db.getAdminDashboardStats().catch((err) => {
        console.error('Failed to get dashboard stats in /api/admin/stats:', err);
        return {
          stats: { totalApplications: 0, totalApplicants: 0, boysCount: 0, girlsCount: 0, classCounts: {}, stateCounts: {} },
          recentAwaitingVerification: [],
          recentApplications: [],
        };
      }),
      db.getSettings().catch((err) => {
        console.error('Failed to get settings in /api/admin/stats:', err);
        return null;
      }),
    ]);

    return NextResponse.json({
      stats: dashboardData.stats,
      recentAwaitingVerification: dashboardData.recentAwaitingVerification || [],
      recentApplications: dashboardData.recentApplications || [],
      settings,
    });
  } catch (error: any) {
    console.error('Error in stats route:', error);
    return NextResponse.json({ 
      error: 'Failed to compute statistics',
      details: error?.message || String(error)
    }, { status: 500 });
  }
}
