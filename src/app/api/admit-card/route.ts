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
      const card = await db.getAdmitCard(appId);
      return NextResponse.json({ admitCard: card });
    }

    if (rollNo) {
      const card = await db.getAdmitCard(rollNo);
      return NextResponse.json({ admitCard: card });
    }

    // Try current logged in user
    const user = await getCurrentUser();
    if (user) {
      const app = await db.getApplicationByUserId(user.userId);
      if (app) {
        const card = await db.getAdmitCard(app.id);
        return NextResponse.json({ admitCard: card });
      }
    }

    return NextResponse.json({ admitCard: null });
  } catch (error) {
    console.error('Error in admit-card route:', error);
    return NextResponse.json({ error: 'Failed to retrieve admit card' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { applicationId, examCentreName, examDate, reportingTime, roomNumber } = body;

    const application = await db.getApplicationById(applicationId);
    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Generate class-based roll number: e.g. 26 + class code + 4-digit serial
    const classNum = application.classApplying.replace(/\D/g, '') || '06';
    const rollNumber = `26${classNum.padStart(2, '0')}${Math.floor(1000 + Math.random() * 9000)}`;

    const admitCard = await db.generateOrReleaseAdmitCard({
      id: 'admit-' + Date.now(),
      applicationId: application.id,
      applicationNumber: application.applicationNumber,
      rollNumber,
      candidateName: application.personalInfo.fullName,
      fatherName: application.parentInfo.fatherName,
      classApplying: application.classApplying,
      examCentreName: examCentreName || application.examCentrePref.preferredCenter1,
      examCentreAddress: 'Near 3rd Gate, Kurukshetra University, Kurukshetra, Haryana - 136119',
      examDate: examDate || '06 December 2026',
      reportingTime: reportingTime || '08:30 AM',
      examDuration: '10:00 AM to 12:30 PM (2.5 Hours)',
      roomNumber: roomNumber || 'Hall-A, Desk ' + Math.floor(1 + Math.random() * 50),
      candidatePhotoUrl: application.documents?.photo || '/logo-gurukul.png',
      isReleased: true,
      instructions: [
        'Bring printed copy of this Admit Card along with original Aadhaar Card.',
        'Candidates must arrive at least 45 minutes prior to the examination time.',
        'Electronic gadgets, smart watches, and calculators are strictly prohibited.',
        'Blue/Black ballpoint pens only to be used for OMR / answer sheets.',
      ],
      createdAt: new Date().toISOString(),
    });

    // Notify candidate
    await sendNotification({
      to: application.personalInfo.fullName,
      name: application.personalInfo.fullName,
      type: 'ADMIT_CARD_RELEASED',
      data: {
        applicationNumber: application.applicationNumber,
        rollNumber,
      },
    });

    return NextResponse.json({ success: true, admitCard });
  } catch (error) {
    console.error('Error creating admit card:', error);
    return NextResponse.json({ error: 'Failed to issue admit card' }, { status: 500 });
  }
}
