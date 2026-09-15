import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { sendNotification } from '@/lib/notifications';
import { isValidApplicationStatus, isValidStatusTransition } from '@/lib/applicationMetrics';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const id = params.id;
    const application = await db.getApplicationById(id);

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Authorization: Prevent IDOR (applicant can only view their own dossier; admin can view all)
    if (user.role !== 'admin' && application.userId !== user.userId) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to access another candidate dossier.' },
        { status: 403 }
      );
    }

    return NextResponse.json({ application });
  } catch (error) {
    console.error('Error fetching application by ID:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin authorization required' }, { status: 403 });
    }

    const id = params.id;
    const existingApp = await db.getApplicationById(id);
    if (!existingApp) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const body = await request.json();
    const { status, remarks } = body;

    // Strict status enum whitelist validation
    if (!status || !isValidApplicationStatus(status)) {
      return NextResponse.json(
        { error: `Invalid application status: '${status}'. Allowed statuses: draft, submitted, under_review, correction_needed, approved, rejected, admit_card_ready, admitted.` },
        { status: 400 }
      );
    }

    // Business-rule transition validation
    const transitionCheck = isValidStatusTransition(existingApp.status, status, user.role);
    if (!transitionCheck.valid) {
      return NextResponse.json({ error: transitionCheck.reason }, { status: 400 });
    }

    // Mandatory rejection reason requirement
    if (status === 'rejected' && (!remarks || remarks.trim().length < 3)) {
      return NextResponse.json(
        { error: 'A documented ground or reason for rejection is strictly required.' },
        { status: 400 }
      );
    }

    const success = await db.updateApplicationStatus(id, status, remarks);
    if (!success) {
      return NextResponse.json({ error: 'Failed to update application' }, { status: 404 });
    }

    const updatedApp = await db.getApplicationById(id);
    if (updatedApp) {
      // Resolve candidate email from application or linked user account
      let candidateEmail = updatedApp.personalInfo?.candidateEmail;
      if (!candidateEmail) {
        const appUser = await db.getUserById(updatedApp.userId);
        candidateEmail = appUser?.email;
      }

      let notifType: 'APPLICATION_APPROVED' | 'APPLICATION_REJECTED' | 'CORRECTION_REQUIRED' | null = null;
      if (status === 'approved') notifType = 'APPLICATION_APPROVED';
      else if (status === 'rejected') notifType = 'APPLICATION_REJECTED';
      else if (status === 'correction_needed') notifType = 'CORRECTION_REQUIRED';

      if (notifType && candidateEmail) {
        try {
          await sendNotification({
            to: candidateEmail,
            name: updatedApp.personalInfo?.fullName || 'Candidate',
            type: notifType,
            data: {
              applicationNumber: updatedApp.applicationNumber,
              remarks: remarks || '',
            },
          });
        } catch (notifErr) {
          console.warn('Notification dispatch error:', notifErr);
        }
      }

      // Create persistent Admin Notification
      try {
        const candidateName = updatedApp.personalInfo?.fullName || 'Candidate';
        let adminTitle = `Application Status Updated: ${candidateName}`;
        let adminMsg = `Application ${updatedApp.applicationNumber} status changed to ${status.toUpperCase()}.`;
        let adminType: any = 'APPLICATION_STATUS_CHANGED';

        if (status === 'approved') {
          adminType = 'APPLICATION_APPROVED';
          adminTitle = `Application Approved: ${candidateName}`;
          adminMsg = `Dossier for ${candidateName} (${updatedApp.applicationNumber}, ${updatedApp.classApplying}) approved and verified.`;
        } else if (status === 'rejected') {
          adminType = 'APPLICATION_REJECTED';
          adminTitle = `Application Rejected: ${candidateName}`;
          adminMsg = `Dossier ${updatedApp.applicationNumber} for ${candidateName} rejected. Reason: "${remarks || 'Eligibility criteria mismatch'}".`;
        } else if (status === 'correction_needed') {
          adminType = 'CORRECTION_REQUIRED';
          adminTitle = `Correction Demanded: ${candidateName}`;
          adminMsg = `Dossier ${updatedApp.applicationNumber} flagged for correction: "${remarks}".`;
        }

        await db.createAdminNotification({
          type: adminType,
          title: adminTitle,
          message: adminMsg,
          entityId: updatedApp.id,
          entityType: 'application',
          link: `/admin/applications/${updatedApp.id}`,
          metadata: {
            applicationId: updatedApp.id,
            candidateName,
            applicationNumber: updatedApp.applicationNumber,
            classApplying: updatedApp.classApplying,
            email: candidateEmail,
            phone: updatedApp.parentInfo?.fatherPhone || updatedApp.personalInfo?.candidateMobile,
            status,
            rejectionReason: status === 'rejected' ? (remarks || 'Eligibility criteria mismatch') : undefined,
            remarks,
            updatedAt: new Date().toISOString(),
          },
        });
      } catch (adminNotifErr) {
        console.warn('Failed to create admin notification for status update:', adminNotifErr);
      }
    }

    return NextResponse.json({ success: true, application: updatedApp });
  } catch (error) {
    console.error('Error updating application:', error);
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin authorization required' }, { status: 403 });
    }

    const id = params.id;
    const existingApp = await db.getApplicationById(id);
    const userIdToDelete = existingApp?.userId;

    const success = await db.deleteApplication(id);
    if (!success) {
      return NextResponse.json({ error: 'Application not found or could not be deleted' }, { status: 404 });
    }

    // Also completely delete user/login credentials when admin deletes applicant record
    if (userIdToDelete) {
      await db.deleteUser(userIdToDelete);
    }

    return NextResponse.json({ success: true, message: 'Application and associated user credentials deleted successfully' });
  } catch (error) {
    console.error('Error deleting application:', error);
    return NextResponse.json({ error: 'Failed to delete application' }, { status: 500 });
  }
}

