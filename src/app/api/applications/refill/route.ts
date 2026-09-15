import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const application = await db.getApplicationByUserId(user.userId);
    if (!application) {
      return NextResponse.json({ success: true, message: 'Ready to start fresh application' });
    }

    // Only allow self-service refill if the application was rejected or in draft
    if (application.status !== 'rejected' && application.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only rejected or draft applications can be refilled. Active submissions cannot be purged.' },
        { status: 400 }
      );
    }

    // Purge previous rejected application record so user can fill afresh
    await db.deleteApplication(application.id);

    // Unlink old registration number on user so a fresh one will be generated upon new submission
    try {
      await db.updateUser(user.userId, { registrationNumber: undefined });
    } catch {}

    const userRecord = await db.getUserById(user.userId);
    const candidatePhone = userRecord?.phone || '';

    // Automatically re-add candidate to Admin Candidate desk as a fresh DRAFT application
    await db.saveDraftApplication({
      userId: user.userId,
      classApplying: 'Class 6',
      personalInfo: {
        fullName: userRecord?.name || user.name,
        candidateEmail: user.email,
        candidateMobile: candidatePhone,
        whatsappNumber: candidatePhone,
      } as any,
      currentStep: 1,
    });

    await recordAuditLog({
      userId: user.userId,
      userName: user.name,
      userRole: user.role,
      action: 'REFILL_APPLICATION_INITIATED',
      entity: 'Application',
      details: {
        purgedApplicationId: application.id,
        previousStatus: application.status,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Previous application record purged successfully. You can now begin a fresh application.',
    });
  } catch (error: any) {
    console.error('Error initiating application refill:', error);
    return NextResponse.json({ error: error.message || 'Failed to initiate application refill' }, { status: 500 });
  }
}
