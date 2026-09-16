import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { sendNotification } from '@/lib/notifications';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    const appId = searchParams.get('appId') || searchParams.get('regNo');
    const rollNo = searchParams.get('rollNo');
    const dob = searchParams.get('dob')?.trim();

    // Admin can query any admit card by appId or rollNo
    if (user && user.role === 'admin') {
      if (appId) {
        const card = await db.getAdmitCard(appId);
        return NextResponse.json({ admitCard: card, released: true });
      }
      if (rollNo) {
        const card = await db.getAdmitCard(rollNo);
        return NextResponse.json({ admitCard: card, released: true });
      }
    }

    // Check if Admit Cards have been officially released by Admin
    const settings = await db.getSettings();
    if (settings.admitCardsReleased !== true) {
      return NextResponse.json({
        admitCard: null,
        released: false,
        message: 'Admit cards for Entrance Examination 2026-27 have not been declared/published by the administration yet.',
      });
    }

    // If query by Registration Number / Application Number / Roll Number and DOB
    if (appId || rollNo) {
      const allApps = await db.getApplications();
      const targetQuery = (appId || rollNo || '').trim().toLowerCase();
      const matchingApp = allApps.find((a) => {
        const reg = (a.registrationNumber || a.applicationNumber || '').trim().toLowerCase();
        const roll = (a.rollNumber || '').trim().toLowerCase();
        return reg === targetQuery || roll === targetQuery;
      });

      if (!matchingApp) {
        return NextResponse.json({
          admitCard: null,
          released: true,
          message: 'No candidate record found for the provided Registration ID or Roll Number.',
        });
      }

      // If dob parameter is provided, verify DOB
      if (dob) {
        const appDob = (matchingApp.personalInfo?.dob || '').trim();
        // Normalize DOB formats (e.g. YYYY-MM-DD vs DD/MM/YYYY)
        const cleanDobInput = dob.replace(/\D/g, '');
        const cleanAppDob = appDob.replace(/\D/g, '');
        // Compare directly or by digits if lengths match
        const dobMatches = appDob.toLowerCase() === dob.toLowerCase() || (cleanDobInput && cleanDobInput === cleanAppDob);
        if (!dobMatches) {
          return NextResponse.json({
            admitCard: null,
            released: true,
            error: 'Date of Birth does not match our records for this Registration Number.',
            message: 'Date of Birth does not match our records for this Registration Number.',
          }, { status: 400 });
        }
      }

      const card = await db.getAdmitCard(matchingApp.id);
      return NextResponse.json({ admitCard: card, released: true });
    }

    // If no query parameters, user must be authenticated candidate
    if (!user) {
      return NextResponse.json({ error: 'Authentication or Registration details required to access admit card' }, { status: 401 });
    }

    // Applicant accessing their own admit card
    let userApp = await db.getApplicationByUserId(user.userId);
    if (!userApp && user.email) {
      const allApps = await db.getApplications();
      userApp = allApps.find(a =>
        (user.email && a.personalInfo?.candidateEmail && a.personalInfo.candidateEmail.toLowerCase() === user.email.toLowerCase()) ||
        (user.registrationNumber && (a.registrationNumber === user.registrationNumber || a.applicationNumber === user.registrationNumber))
      ) || null;
    }

    if (!userApp) {
      return NextResponse.json({ admitCard: null, released: true });
    }

    const card = await db.getAdmitCard(userApp.id);
    return NextResponse.json({ admitCard: card, released: true });
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
      stream: application.stream,
      examCentreName: examCentreName || application.studyLocation?.firstPreference || application.studyLocationPref?.firstPreference || application.examCentrePref?.preferredCenter1 || 'Gurukul Nilokheri',
      examCentreAddress: 'Campus Admissions & Examination Hall, Haryana',
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

    // Create persistent Admin Notification
    try {
      await db.createAdminNotification({
        type: 'ADMIN_UPDATE',
        title: `Admit Card Issued: ${application.personalInfo.fullName}`,
        message: `Roll Number ${rollNumber} allotted to ${application.personalInfo.fullName} (${application.applicationNumber}, ${application.classApplying}).`,
        entityId: application.id,
        entityType: 'application',
        link: `/admin/applications/${application.id}`,
        metadata: {
          applicationId: application.id,
          rollNumber,
          candidateName: application.personalInfo.fullName,
          applicationNumber: application.applicationNumber,
          classApplying: application.classApplying,
        },
      });
    } catch (notifErr) {
      console.warn('Failed to dispatch admin notification for admit card:', notifErr);
    }

    return NextResponse.json({ success: true, admitCard });
  } catch (error) {
    console.error('Error creating admit card:', error);
    return NextResponse.json({ error: 'Failed to issue admit card' }, { status: 500 });
  }
}
