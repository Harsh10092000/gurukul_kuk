import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const id = params.id;
    const existing = await db.getApplicationById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Ensure candidate can only resubmit their own application, or admin
    if (user.role !== 'admin' && existing.userId !== user.userId) {
      return NextResponse.json({ error: 'Unauthorized to modify this application' }, { status: 403 });
    }

    const body = await req.json();
    const { documents, personalInfo, academicInfo, clarification } = body;

    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const clarificationNote = clarification
      ? `\n[Candidate Resubmitted on ${timestamp}]: ${clarification.trim()}`
      : `\n[Candidate Resubmitted on ${timestamp}]: Updated documents and information uploaded for re-verification.`;

    const updatedRemarks = (existing.remarks || '') + clarificationNote;

    const updated = await db.updateApplicationDetails(id, {
      status: 'under_review',
      remarks: updatedRemarks,
      documents: documents ? { ...(existing.documents || {}), ...documents } : existing.documents,
      personalInfo: personalInfo ? { ...(existing.personalInfo || {}), ...personalInfo } : existing.personalInfo,
      academicInfo: academicInfo ? { ...(existing.academicInfo || {}), ...academicInfo } : existing.academicInfo,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
    }

    // Create persistent Admin Notification
    try {
      await db.createAdminNotification({
        type: 'APPLICATION_STATUS_CHANGED',
        title: `Clarification / Resubmission: ${updated.personalInfo?.fullName || 'Candidate'}`,
        message: `Candidate ${updated.personalInfo?.fullName || 'Candidate'} (${updated.applicationNumber}) submitted revised particulars/documents for re-scrutiny.`,
        entityId: updated.id,
        entityType: 'application',
        link: `/admin/applications/${updated.id}`,
        metadata: {
          applicationId: updated.id,
          candidateName: updated.personalInfo?.fullName,
          applicationNumber: updated.applicationNumber,
          classApplying: updated.classApplying,
          clarification: clarification?.trim(),
        },
      });
    } catch (notifErr) {
      console.warn('Failed to dispatch admin notification on resubmission:', notifErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Your revised details & documents have been successfully submitted for re-evaluation.',
      application: updated,
    });
  } catch (error: any) {
    console.error('Error during candidate application resubmission:', error);
    return NextResponse.json({ error: error.message || 'Server error during resubmission' }, { status: 500 });
  }
}
