import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const applications = await db.getApplications();
    const settings = await db.getSettings();
    const centres = await db.getCentres();

    const totalApplications = applications.length;
    const approved = applications.filter((a) => a.status === 'approved').length;
    const underReview = applications.filter((a) => a.status === 'under_review' || a.status === 'submitted').length;
    const correctionNeeded = applications.filter((a) => a.status === 'correction_needed').length;
    const rejected = applications.filter((a) => a.status === 'rejected').length;

    const totalFeesCollected = applications
      .filter((a) => a.paymentStatus === 'completed')
      .reduce((sum, a) => sum + (a.amountPaid || 1200), 0);

    // Class-wise breakdown
    const classCounts: Record<string, number> = {};
    applications.forEach((a) => {
      classCounts[a.classApplying] = (classCounts[a.classApplying] || 0) + 1;
    });

    // State-wise breakdown
    const stateCounts: Record<string, number> = {};
    applications.forEach((a) => {
      const state = a.addressInfo?.state || 'Haryana';
      stateCounts[state] = (stateCounts[state] || 0) + 1;
    });

    return NextResponse.json({
      stats: {
        totalApplications,
        approved,
        underReview,
        correctionNeeded,
        rejected,
        totalFeesCollected,
        totalCentres: centres.length,
        classCounts,
        stateCounts,
      },
      recentApplications: applications.slice(0, 8),
      settings,
    });
  } catch (error) {
    console.error('Error in stats route:', error);
    return NextResponse.json({ error: 'Failed to compute statistics' }, { status: 500 });
  }
}
