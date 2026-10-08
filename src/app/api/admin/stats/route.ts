import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { computeApplicationMetrics } from '@/lib/applicationMetrics';

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

    const applications = await db.getApplications().catch((err) => {
      console.error('Failed to get applications in /api/admin/stats:', err);
      return [];
    });
    const settings = await db.getSettings().catch((err) => {
      console.error('Failed to get settings in /api/admin/stats:', err);
      return null;
    });

    // Authoritative Single Source of Truth Metrics
    const metrics = computeApplicationMetrics(applications);

    // Active candidates in portal (excluding rejected dossiers)
    const activeApplications = (applications || []).filter((a) => a.status !== 'rejected');

    // Class-wise breakdown (across active candidates)
    const classCounts: Record<string, number> = {};
    activeApplications.forEach((a) => {
      const cls = a.classApplying || 'Class 6';
      classCounts[cls] = (classCounts[cls] || 0) + 1;
    });

    // State-wise breakdown (across active candidates)
    const stateCounts: Record<string, number> = {};
    activeApplications.forEach((a) => {
      const state = a.addressInfo?.state || 'Haryana';
      stateCounts[state] = (stateCounts[state] || 0) + 1;
    });

    // Gender breakdown (Boys vs Girls)
    let boysCount = 0;
    let girlsCount = 0;
    activeApplications.forEach((a) => {
      const gender = (a.personalInfo?.gender || '').toLowerCase();
      const appNo = (a.applicationNumber || '').toUpperCase();
      if (gender === 'female' || gender === 'girl' || appNo.startsWith('NILG')) {
        girlsCount++;
      } else {
        boysCount++;
      }
    });

    // Recent applications
    const recentAwaitingVerification = activeApplications
      .filter((a) => a.status === 'submitted' || a.status === 'under_review' || a.status === 'correction_needed')
      .slice(0, 8);

    return NextResponse.json({
      stats: {
        ...metrics,
        totalApplications: activeApplications.length,
        totalApplicants: activeApplications.length,
        boysCount,
        girlsCount,
        totalDossiers: metrics.total,
        totalCentres: 1,
        classCounts,
        stateCounts,
      },
      recentAwaitingVerification,
      recentApplications: activeApplications.slice(0, 8),
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
