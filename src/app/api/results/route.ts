import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { sendNotification } from '@/lib/notifications';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const appId = searchParams.get('appId');
    const rollNo = searchParams.get('rollNo');

    if (appId) {
      const res = await db.getResult(appId);
      return NextResponse.json({ result: res });
    }

    if (rollNo) {
      const res = await db.getResult(rollNo);
      return NextResponse.json({ result: res });
    }

    // Try current logged in user
    const user = await getCurrentUser();
    if (user) {
      const app = await db.getApplicationByUserId(user.userId);
      if (app) {
        const res = await db.getResult(app.id);
        return NextResponse.json({ result: res });
      }
    }

    return NextResponse.json({ result: null });
  } catch (error) {
    console.error('Error in results route:', error);
    return NextResponse.json({ error: 'Failed to retrieve result' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { applicationId, subjects, qualifyingStatus, remarks } = body;

    const application = await db.getApplicationById(applicationId);
    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const admitCard = await db.getAdmitCard(application.id);
    const rollNumber = admitCard?.rollNumber || '26' + Math.floor(100000 + Math.random() * 900000);

    const totalMarks = subjects.reduce((sum: number, s: any) => sum + Number(s.marksObtained), 0);
    const maxTotalMarks = subjects.reduce((sum: number, s: any) => sum + Number(s.maxMarks), 0);
    const percentage = parseFloat(((totalMarks / maxTotalMarks) * 100).toFixed(1));

    const newResult = await db.publishResult({
      id: 'res-' + Date.now(),
      applicationId: application.id,
      applicationNumber: application.applicationNumber,
      rollNumber,
      candidateName: application.personalInfo.fullName,
      classApplying: application.classApplying,
      subjects,
      totalMarks,
      maxTotalMarks,
      percentage,
      rank: Math.floor(1 + Math.random() * 40),
      qualifyingStatus: qualifyingStatus || 'Qualified for Admission',
      counselingDate: '10 January 2027 at 10:00 AM',
      counselingVenue: 'Main Administrative Block, Gurukul Kurukshetra Campus',
      isPublished: true,
      remarks: remarks || 'Verified and declared by Exam Controller.',
      createdAt: new Date().toISOString(),
    });

    await sendNotification({
      to: application.personalInfo.fullName,
      name: application.personalInfo.fullName,
      type: 'RESULT_DECLARED',
      data: {
        rollNumber,
        status: newResult.qualifyingStatus,
      },
    });

    return NextResponse.json({ success: true, result: newResult });
  } catch (error) {
    console.error('Error publishing result:', error);
    return NextResponse.json({ error: 'Failed to publish result' }, { status: 500 });
  }
}
