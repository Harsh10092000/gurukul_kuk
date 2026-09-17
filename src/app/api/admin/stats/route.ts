import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { computeApplicationMetrics } from '@/lib/applicationMetrics';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const applications = await db.getApplications();
    const settings = await db.getSettings();

    // Authoritative Single Source of Truth Metrics
    const metrics = computeApplicationMetrics(applications);

    // Active candidates in portal (excluding rejected dossiers)
    const activeApplications = applications.filter((a) => a.status !== 'rejected');

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

    // Status-aware query for Recent Applications Awaiting Verification
    // (excludes drafts and rejected candidates; only includes submitted, under_review, correction_needed)
    const recentAwaitingVerification = activeApplications
      .filter((a) => a.status === 'submitted' || a.status === 'under_review' || a.status === 'correction_needed')
      .slice(0, 8);

    return NextResponse.json({
      stats: {
        ...metrics,
        totalApplications: metrics.active, // Active candidates count (reconciled with Applications desk)
        totalDossiers: metrics.total,      // Total historical dossiers including rejected
        totalCentres: 1,
        classCounts,
        stateCounts,
      },
      recentAwaitingVerification,
      recentApplications: activeApplications.slice(0, 8),
      settings,
    });
  } catch (error) {
    console.error('Error in stats route:', error);
    return NextResponse.json({ error: 'Failed to compute statistics' }, { status: 500 });
  }
}
