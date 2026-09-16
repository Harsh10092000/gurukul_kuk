import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { formatDateString } from '@/lib/admissionPhases';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('query') || searchParams.get('appNumber') || searchParams.get('regNo') || '').trim();
    const dob = (searchParams.get('dob') || '').trim();
    const phone = (searchParams.get('phone') || '').trim();

    if (!query && (!phone || !dob)) {
      return NextResponse.json(
        { error: 'Please enter your Registration Number / Application Number, or enter your Registered Mobile Number with Date of Birth.' },
        { status: 400 }
      );
    }

    const allApps = await db.getApplications();
    const settings = await db.getSettings();

    let matchingApp: any = null;

    if (query) {
      const qLower = query.toLowerCase();
      matchingApp = allApps.find((a) => {
        const appNo = (a.applicationNumber || '').toLowerCase();
        const regNo = (a.registrationNumber || '').toLowerCase();
        const id = (a.id || '').toLowerCase();
        const roll = (a.rollNumber || '').toLowerCase();
        return appNo === qLower || regNo === qLower || id === qLower || roll === qLower;
      });
    } else if (phone && dob) {
      // Find by mobile + dob
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      const cleanDob = dob.replace(/\D/g, '');

      matchingApp = allApps.find((a) => {
        const appPhone = (a.personalInfo?.candidateMobile || a.parentInfo?.fatherPhone || '').replace(/\D/g, '').slice(-10);
        const appDob = (a.personalInfo?.dob || '').replace(/\D/g, '');
        return appPhone === cleanPhone && appDob === cleanDob;
      });
    }

    if (!matchingApp) {
      return NextResponse.json(
        { error: 'No application record found matching the provided details. Please check your Registration / Application Number.' },
        { status: 404 }
      );
    }

    // If DOB is provided alongside query, verify it matches
    if (dob && query) {
      const cleanDob = dob.replace(/\D/g, '');
      const appDob = (matchingApp.personalInfo?.dob || '').replace(/\D/g, '');
      if (cleanDob && appDob && cleanDob !== appDob) {
        return NextResponse.json(
          { error: 'Date of Birth does not match our records for this application.' },
          { status: 403 }
        );
      }
    }

    // Get admit card and result if any
    const appId = matchingApp.id || matchingApp.applicationNumber;
    let admitCard: any = null;
    let examResult: any = null;

    try {
      admitCard = await db.getAdmitCard(appId);
      if (!admitCard && matchingApp.registrationNumber) {
        admitCard = await db.getAdmitCard(matchingApp.registrationNumber);
      }
    } catch {}

    try {
      examResult = await db.getResult(appId);
      if (!examResult && matchingApp.registrationNumber) {
        examResult = await db.getResult(matchingApp.registrationNumber);
      }
    } catch {}

    const isAdmitCardReleased = settings.admitCardsReleased === true;
    const isResultsDeclared = settings.resultsDeclared === true;

    // Mask phone for public display
    const rawMobile = matchingApp.personalInfo?.candidateMobile || matchingApp.parentInfo?.fatherPhone || '';
    const maskedMobile = rawMobile.length >= 10
      ? rawMobile.slice(0, 2) + '******' + rawMobile.slice(-2)
      : '**********';

    // Mask Aadhaar if present
    const rawAadhaar = matchingApp.personalInfo?.aadhaarNumber || '';
    const maskedAadhaar = rawAadhaar.length >= 4
      ? 'XXXX-XXXX-' + rawAadhaar.replace(/\D/g, '').slice(-4)
      : undefined;

    // Format milestones
    const milestones = [
      {
        id: 'registration_fee',
        title: 'Online Registration & Fee',
        subtitle: matchingApp.paymentStatus === 'paid' ? '₹800 Entrance Fee Received' : 'Payment Pending',
        status: matchingApp.paymentStatus === 'paid' ? 'completed' : 'pending',
        date: formatDateString(matchingApp.createdAt, '01 Sep 2026'),
        details: matchingApp.paymentStatus === 'paid'
          ? `Paid via Online Gateway (Ref: ${matchingApp.transactionId || 'TXN-CONFIRMED'})`
          : 'Entrance examination registration fee of ₹800 is pending.',
      },
      {
        id: 'dossier_submission',
        title: 'Application Form Submission',
        subtitle: 'Candidate dossier & certificates',
        status: 'completed',
        date: formatDateString(matchingApp.createdAt, '01 Sep 2026'),
        details: 'Dossier successfully submitted with candidate photograph, student signature, and Aadhaar card.',
      },
      {
        id: 'scrutiny',
        title: 'Document Scrutiny & Verification',
        subtitle: matchingApp.status === 'approved'
          ? 'Verified & Approved'
          : matchingApp.status === 'correction_needed'
            ? 'Correction Required'
            : matchingApp.status === 'rejected'
              ? 'Application Rejected'
              : 'Under Administrative Scrutiny',
        status: matchingApp.status === 'approved'
          ? 'completed'
          : matchingApp.status === 'correction_needed'
            ? 'action_needed'
            : matchingApp.status === 'rejected'
              ? 'rejected'
              : 'in_progress',
        details: matchingApp.remarks || (
          matchingApp.status === 'approved'
            ? 'Candidate credentials, eligibility, and category verified by Gurukul Admission Cell.'
            : 'Dossier is undergoing scrutiny by Admission Officers.'
        ),
      },
      {
        id: 'admit_card',
        title: 'Roll Number & Hall Ticket',
        subtitle: isAdmitCardReleased && (matchingApp.rollNumber || admitCard?.rollNumber)
          ? `Roll No: ${matchingApp.rollNumber || admitCard?.rollNumber} (Available)`
          : `Scheduled for ${formatDateString(settings.admitCardReleaseDate, '20 Nov 2026')}`,
        status: isAdmitCardReleased && (matchingApp.rollNumber || admitCard?.rollNumber)
          ? 'completed'
          : 'scheduled',
        details: isAdmitCardReleased
          ? 'Hall Ticket / Admit Card is officially released and ready to download.'
          : 'Roll numbers are allotted post scrutiny. Admit cards will be available on the scheduled release date.',
      },
      {
        id: 'examination',
        title: 'Written Entrance Examination',
        subtitle: formatDateString(settings.entranceExamDate, '10 December 2026'),
        status: 'scheduled',
        details: admitCard?.examCentreName
          ? `Venue: ${admitCard.examCentreName} (${admitCard.reportingTime || '08:30 AM'})`
          : `Exam scheduled on ${formatDateString(settings.entranceExamDate, '10 Dec 2026')} across designated Gurukul centers.`,
      },
      {
        id: 'result',
        title: 'Merit List & Scorecard',
        subtitle: isResultsDeclared
          ? (examResult?.qualifyingStatus || 'Result Declared')
          : `Scheduled for ${formatDateString(settings.resultDeclarationDate, '25 Dec 2026')}`,
        status: isResultsDeclared ? 'completed' : 'scheduled',
        details: isResultsDeclared && examResult
          ? `Score: ${examResult.totalMarks}/${examResult.maxTotalMarks} (${examResult.percentage}%) - Rank ${examResult.rank || 'N/A'}`
          : 'Merit list and scorecards will be published post examination evaluation.',
      },
    ];

    const responseData = {
      applicationNumber: matchingApp.applicationNumber || matchingApp.registrationNumber,
      registrationNumber: matchingApp.registrationNumber || matchingApp.applicationNumber,
      rollNumber: matchingApp.rollNumber || admitCard?.rollNumber || null,
      classApplying: matchingApp.classApplying,
      status: matchingApp.status,
      paymentStatus: matchingApp.paymentStatus || 'pending',
      amountPaid: matchingApp.amountPaid || 800,
      transactionId: matchingApp.transactionId || null,
      remarks: matchingApp.remarks || null,
      createdAt: matchingApp.createdAt,
      personalInfo: {
        fullName: matchingApp.personalInfo?.fullName || 'Candidate',
        fatherName: matchingApp.parentInfo?.fatherName || 'Parent / Guardian',
        gender: matchingApp.personalInfo?.gender || '',
        category: matchingApp.personalInfo?.category || 'General',
        dob: matchingApp.personalInfo?.dob || '',
        maskedMobile,
        maskedAadhaar,
      },
      preferences: {
        studyLocation: matchingApp.studyLocationPref?.firstPreference || 'Gurukul Nilokheri',
        examCentre: matchingApp.examCentrePref?.firstPreference || 'Gurukul Kurukshetra Main Campus',
      },
      admitCard: isAdmitCardReleased && (matchingApp.rollNumber || admitCard?.rollNumber) ? {
        available: true,
        rollNumber: matchingApp.rollNumber || admitCard?.rollNumber,
        examCentreName: admitCard?.examCentreName || 'Gurukul Kurukshetra Main Campus',
        examDate: admitCard?.examDate || formatDateString(settings.entranceExamDate, '10 December 2026'),
        reportingTime: admitCard?.reportingTime || '08:30 AM',
        downloadUrl: `/admit-card?appId=${encodeURIComponent(matchingApp.registrationNumber || matchingApp.applicationNumber)}`,
      } : {
        available: false,
        releaseDate: formatDateString(settings.admitCardReleaseDate, '20 November 2026'),
      },
      result: isResultsDeclared && examResult ? {
        declared: true,
        totalMarks: examResult.totalMarks,
        maxTotalMarks: examResult.maxTotalMarks,
        percentage: examResult.percentage,
        rank: examResult.rank,
        qualifyingStatus: examResult.qualifyingStatus,
        scorecardUrl: `/result?query=${encodeURIComponent(matchingApp.registrationNumber || matchingApp.applicationNumber)}`,
      } : {
        declared: false,
        scheduledDate: formatDateString(settings.resultDeclarationDate, '25 December 2026'),
      },
      milestones,
    };

    return NextResponse.json({
      success: true,
      application: responseData,
    });
  } catch (error: any) {
    console.error('Error tracking application status:', error);
    return NextResponse.json(
      { error: 'An unexpected server error occurred while retrieving application status.' },
      { status: 500 }
    );
  }
}
