import { NextResponse } from 'next/server';
import { db, toMySqlDatetime } from '@/lib/db';
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

    // Allot or generate class and gender/centre-based sequential roll number
    // Boys: 27{class}0001 - 5000 (capacity 5000)
    // Girls: 27{class}5001 - 10000 (capacity 5000)
    const classCode = db.getClassCode(application.classApplying);
    const isFemale =
      (application.personalInfo?.gender || '').toLowerCase() === 'female' ||
      (application.personalInfo?.gender || '').toLowerCase() === 'girl' ||
      (application.registrationNumber || '').startsWith('NILG');
    const rollPrefix = `27${classCode}`;
    const candidateStream = application.stream || application.academicInfo?.stream;
    let finalRollNumber: string;
    if (application.rollNumber && new RegExp(`^${rollPrefix}(\\d{4,})$`).test(application.rollNumber)) {
      const seq = parseInt(application.rollNumber.slice(rollPrefix.length), 10);
      let valid = false;
      if (classCode === '11') {
        const normStream = (candidateStream || '').trim().toLowerCase().replace(/[^a-z]/g, '');
        if (normStream.includes('nonmed')) {
          valid = isFemale ? (seq >= 1001 && seq <= 2000) : (seq >= 1 && seq <= 1000);
        } else if (normStream.includes('med')) {
          valid = isFemale ? (seq >= 3001 && seq <= 4000) : (seq >= 2001 && seq <= 3000);
        } else if (normStream.includes('com')) {
          valid = isFemale ? (seq >= 5001 && seq <= 6000) : (seq >= 4001 && seq <= 5000);
        } else if (normStream.includes('human') || normStream.includes('art')) {
          valid = isFemale ? (seq >= 7001 && seq <= 8000) : (seq >= 6001 && seq <= 7000);
        } else {
          valid = isFemale ? (seq >= 1001 && seq <= 2000) : (seq >= 1 && seq <= 1000);
        }
      } else {
        valid = isFemale ? seq >= 5001 : (seq >= 1 && seq <= 5000);
      }

      if (valid) {
        finalRollNumber = application.rollNumber;
      } else {
        finalRollNumber = await db.getNextRollNumber(application.classApplying, application.personalInfo?.gender, candidateStream);
        try {
          await db.updateApplication(application.id, { rollNumber: finalRollNumber });
        } catch { }
      }
    } else {
      finalRollNumber = await db.getNextRollNumber(application.classApplying, application.personalInfo?.gender, candidateStream);
      try {
        await db.updateApplication(application.id, { rollNumber: finalRollNumber });
      } catch { }
    }

    const defaultVenue = settings.examVenueName || 'The Gurukul Jyotisar Pehowa Road, Kurukshetra';
    const defaultAddress = settings.examVenueAddress || '136119, Haryana';
    const defaultDate = settings.entranceExamDate || '21 March 2027';
    const defaultTime = settings.entranceExamTime || '9:30 AM';

    const admitCard = await db.generateOrReleaseAdmitCard({
      id: 'admit-' + Date.now(),
      applicationId: application.id,
      applicationNumber: application.applicationNumber,
      rollNumber: finalRollNumber,
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
      createdAt: toMySqlDatetime(new Date()),
    });

    // Note: Per policy, no emails are dispatched to candidates when admit cards are declared/issued.
    // Create persistent Admin Notification
    try {
      await db.createAdminNotification({
        type: 'ADMIN_UPDATE',
        title: `Admit Card Issued: ${application.personalInfo.fullName}`,
        message: `Roll Number ${finalRollNumber} allotted to ${application.personalInfo.fullName} (${application.applicationNumber}, ${application.classApplying}).`,
        entityId: application.id,
        entityType: 'application',
        link: `/admin/applications/${application.id}`,
        metadata: {
          applicationId: application.id,
          rollNumber: finalRollNumber,
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
