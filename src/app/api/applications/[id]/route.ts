import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { sendNotification } from '@/lib/notifications';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const application = await db.getApplicationById(id);

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    return NextResponse.json({ application });
  } catch (error) {
    console.error('Error fetching application by ID:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin authorization required' }, { status: 403 });
    }

    const id = params.id;
    const body = await request.json();
    const { status, remarks } = body;

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
    const success = await db.deleteApplication(id);
    if (!success) {
      return NextResponse.json({ error: 'Application not found or could not be deleted' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Application deleted successfully' });
  } catch (error) {
    console.error('Error deleting application:', error);
    return NextResponse.json({ error: 'Failed to delete application' }, { status: 500 });
  }
}

