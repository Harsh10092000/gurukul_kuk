import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { sendNotification } from '@/lib/notifications';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Administrative access required.' }, { status: 403 });
    }

    const allApplications = await db.getApplications();
    const paidApps = allApplications.filter((a) => a.paymentStatus === 'completed');

    if (paidApps.length === 0) {
      return NextResponse.json(
        { error: 'No registered candidates with completed fee payments were found.' },
        { status: 400 }
      );
    }

    const settings = await db.getSettings();
    const examDate = settings.entranceExamDate || '06 December 2026';
    const releaseTime = new Date().toISOString();

    const centres = await db.getCentres();
    const primaryCentre = centres[0] || {
      name: 'Gurukul Kurukshetra Main Campus',
      address: 'Near 3rd Gate, Kurukshetra University, Kurukshetra, Haryana - 136119',
      capacity: 3000,
    };

    // Group or sort candidates by class and registration number for clean, professional roll numbers
    paidApps.sort((a, b) => (a.registrationNumber || '').localeCompare(b.registrationNumber || ''));

    let generatedCount = 0;
    let boysCounter = 0;
    let girlsCounter = 0;

    for (const app of paidApps) {
      const isGirl =
        app.personalInfo?.gender === 'Female' ||
        (app.registrationNumber || '').startsWith('NILG-') ||
        (app.studyLocation?.firstPreference || '').toLowerCase().includes('aryakulam');

      let rollNumber = app.rollNumber;
      if (!rollNumber || !/^26[01]\d{5}$/.test(rollNumber)) {
        if (isGirl) {
          girlsCounter++;
          rollNumber = `261${String(girlsCounter).padStart(5, '0')}`;
        } else {
          boysCounter++;
          rollNumber = `260${String(boysCounter).padStart(5, '0')}`;
        }
      }

      const seqNum = parseInt(rollNumber.slice(3), 10) || 1;
      const hallNumber = Math.ceil(seqNum / 30);
      const deskNumber = ((seqNum - 1) % 30) + 1;

      const examCentreName = primaryCentre.name;
      const examCentreAddress = primaryCentre.address;

      await db.generateOrReleaseAdmitCard({
        id: 'admit-' + app.id,
        applicationId: app.id,
        applicationNumber: app.registrationNumber || app.applicationNumber,
        rollNumber,
        candidateName: app.personalInfo.fullName,
        fatherName: app.parentInfo.fatherName,
        classApplying: app.classApplying,
        stream: app.stream,
        examCentreName,
        examCentreAddress,
        examDate,
        reportingTime: '08:30 AM',
        examDuration: '10:00 AM to 12:30 PM (2.5 Hours)',
        roomNumber: `Hall-${hallNumber}, Desk ${deskNumber}`,
        candidatePhotoUrl: app.documents?.photo || '/logo-gurukul.png',
        candidateSignatureUrl: app.documents?.signature || undefined,
        isReleased: true,
        instructions: [
          'Bring a printed clear copy of this Admit Card along with your original Aadhaar Card.',
          'Candidates must report to their allotted examination centre at least 45 minutes before exam start time.',
          'Calculators, smart devices, watches, and mobile phones are strictly prohibited in the exam hall.',
          'Only Blue or Black ballpoint pens are permitted for marking answers.',
        ],
        createdAt: releaseTime,
      });

      // Update rollNumber in application record
      try {
        await db.updateApplication(app.id, { rollNumber });
      } catch { }

      generatedCount++;
    }

    // Update global system settings
    await db.updateSettings({
      admitCardsReleased: true,
      admitCardsReleasedAt: releaseTime,
    });

    // Create system-wide admin notification
    await db.createAdminNotification({
      type: 'ADMIN_UPDATE',
      title: 'Admit Cards Generated & Released for All Students',
      message: `Successfully generated and officially published Hall Tickets for ${generatedCount} registered candidates. Candidates can now access and print their Admit Cards.`,
      entityId: 'system-admit-card-release',
      entityType: 'system',
      link: '/admin/applications',
    });

    return NextResponse.json({
      success: true,
      count: generatedCount,
      releasedAt: releaseTime,
      message: `Successfully generated and published Admit Cards for ${generatedCount} candidates.`,
    });
  } catch (error) {
    console.error('Bulk admit card generation error:', error);
    return NextResponse.json(
      { error: 'An error occurred while generating bulk admit cards.' },
      { status: 500 }
    );
  }
}
