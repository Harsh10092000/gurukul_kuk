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
    const isReleased = settings.admitCardsReleased === true;

    // If query by Application ID / Registration Number / Roll Number
    if (appId || rollNo) {
      const targetQuery = (appId || rollNo || '').trim().toLowerCase();
      let card = await db.getAdmitCard(appId || rollNo || '');

      const allApps = await db.getApplications();
      const matchingApp = allApps.find((a) => {
        const id = (a.id || '').trim().toLowerCase();
        const reg = (a.registrationNumber || a.applicationNumber || '').trim().toLowerCase();
        const roll = (a.rollNumber || '').trim().toLowerCase();
        return id === targetQuery || reg === targetQuery || roll === targetQuery;
      });

      if (!card && matchingApp) {
        card = await db.getAdmitCard(matchingApp.id);
      }

      if (!card && !matchingApp) {
        return NextResponse.json({
          admitCard: null,
          released: isReleased,
          message: 'No candidate record found for the provided Registration ID or Roll Number.',
        });
      }

      // If dob parameter is provided, verify DOB (public unauthenticated searches)
      if (dob && matchingApp) {
        const appDob = (matchingApp.personalInfo?.dob || '').trim();
        const cleanDobInput = dob.replace(/\D/g, '');
        const cleanAppDob = appDob.replace(/\D/g, '');
        const dobMatches = appDob.toLowerCase() === dob.toLowerCase() || (cleanDobInput && cleanDobInput === cleanAppDob);
        if (!dobMatches) {
          return NextResponse.json({
            admitCard: null,
            released: isReleased,
            error: 'Date of Birth does not match our records for this Registration Number.',
            message: 'Date of Birth does not match our records for this Registration Number.',
          }, { status: 400 });
        }
      }

      // If public unauthenticated search (e.g. /admit-card public portal) and admin has not released yet
      if (!user && !isReleased) {
        return NextResponse.json({
          admitCard: null,
          released: false,
          message: 'Admit cards for Entrance Examination 2027-28 have not been declared/published by the administration yet.',
        });
      }

      // Return admit card with synchronized isReleased flag from settings
      if (card) {
        card.isReleased = isReleased;
      }

      return NextResponse.json({ admitCard: card, released: isReleased });
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
      return NextResponse.json({ admitCard: null, released: isReleased });
    }

    let card = await db.getAdmitCard(userApp.id);
    if (card) {
      card.isReleased = isReleased;
    }
    return NextResponse.json({ admitCard: card, released: isReleased });
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

    const settings = await db.getSettings();

    // Generate class-based roll number: e.g. 27 + class code + 4-digit serial
    const classNum = application.classApplying.replace(/\D/g, '') || '06';
    const rollNumber = `27${classNum.padStart(2, '0')}${Math.floor(1000 + Math.random() * 9000)}`;

    const defaultVenue = settings.examVenueName || 'The Gurukul Jyotisar Pehowa Road, Kurukshetra';
    const defaultAddress = settings.examVenueAddress || '136119, Haryana';
    const defaultDate = settings.entranceExamDate || '21 March 2027';
    const defaultTime = settings.entranceExamTime || '9:30 AM';

    const admitCard = await db.generateOrReleaseAdmitCard({
      id: 'admit-' + Date.now(),
      applicationId: application.id,
      applicationNumber: application.applicationNumber,
      rollNumber,
      candidateName: application.personalInfo.fullName,
      fatherName: application.parentInfo.fatherName,
      motherName: application.parentInfo.motherName,
      previousSchoolName: application.academicInfo?.previousSchoolName || application.personalInfo?.previousSchoolName,
      aadhaarNumber: application.personalInfo?.aadhaarNumber,
      classApplying: application.classApplying,
      stream: application.stream,
      examCentreName: examCentreName || defaultVenue,
      examCentreAddress: defaultAddress,
      examDate: examDate || defaultDate,
      reportingTime: reportingTime || defaultTime,
      examDuration: '9:30 AM to 12:00 PM (2.5 Hours)',
      roomNumber: roomNumber || 'Hall-A, Desk ' + Math.floor(1 + Math.random() * 50),
      candidatePhotoUrl: application.documents?.photo || '/logo-gurukul.png',
      isReleased: true,
      instructions: [
        'Kindly reach exam venue well in time as mentioned on admit card.',
        'Paste Your Recent Coloured Photograph On Admit Card.',
        'Please bring Black or Blue Ball point pen and one Cardboard with you.',
        'A coloured print out of admit card.',
        'Please bring Valid ID proof or ADHAAR Card on the day of examination.',
      ],
      createdAt: new Date().toISOString(),
    });

    // Note: Per policy, no emails are dispatched to candidates when admit cards are declared/issued.
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
