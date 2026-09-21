import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { sendNotification } from '@/lib/notifications';
import { getExamDetailsForGender } from '@/lib/validations';

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
    const releaseTime = new Date().toISOString();

    const examCentreName = settings.examVenueName || 'THE GURUKUL JYOTISAR PEHOWA ROAD, KURUKSHETRA';
    const examCentreAddress = settings.examVenueAddress || '136119, Haryana';
    const examDate = settings.entranceExamDate || '21 March 2027';
    const reportingTime = settings.entranceExamTime || '9:30 AM';

    // Sort candidates by class and registration number for clean, class-sequential roll numbers
    paidApps.sort((a, b) => {
      const classA = db.getClassCode(a.classApplying);
      const classB = db.getClassCode(b.classApplying);
      if (classA !== classB) {
        return classA.localeCompare(classB, undefined, { numeric: true });
      }
      return (a.registrationNumber || a.applicationNumber || '').localeCompare(
        b.registrationNumber || b.applicationNumber || ''
      );
    });

    let generatedCount = 0;
    const classCounters: { [classCode: string]: number } = {};
    const usedRollNumbers = new Set<string>();

    // Pass 1: Collect existing valid unique class-based roll numbers to preserve valid allotments
    for (const app of paidApps) {
      const classCode = db.getClassCode(app.classApplying);
      const classPrefix = `27${classCode}`;
      const roll = app.rollNumber;
      if (roll && new RegExp(`^${classPrefix}(\\d+)$`).test(roll)) {
        const seq = parseInt(roll.slice(classPrefix.length), 10);
        if (!isNaN(seq) && !usedRollNumbers.has(roll)) {
          usedRollNumbers.add(roll);
          if (!classCounters[classCode] || seq > classCounters[classCode]) {
            classCounters[classCode] = seq;
          }
        }
      }
    }

    // Pass 2: Assign unique sequential roll numbers per class
    for (const app of paidApps) {
      const classCode = db.getClassCode(app.classApplying);
      const classPrefix = `27${classCode}`;
      let rollNumber: string;
      if (
        app.rollNumber &&
        new RegExp(`^${classPrefix}(\\d+)$`).test(app.rollNumber) &&
        usedRollNumbers.has(app.rollNumber)
      ) {
        rollNumber = app.rollNumber;
      } else {
        let nextSeq = (classCounters[classCode] || 0) + 1;
        while (usedRollNumbers.has(`${classPrefix}${String(nextSeq).padStart(4, '0')}`)) {
          nextSeq++;
        }
        classCounters[classCode] = nextSeq;
        rollNumber = `${classPrefix}${String(nextSeq).padStart(4, '0')}`;
        usedRollNumbers.add(rollNumber);
      }

      const seqNum = parseInt(rollNumber.slice(classPrefix.length), 10) || 1;
      const hallNumber = Math.ceil(seqNum / 30);
      const deskNumber = ((seqNum - 1) % 30) + 1;

      const examDetails = getExamDetailsForGender(
        app.personalInfo?.gender,
        app.registrationNumber || app.applicationNumber
      );

      await db.generateOrReleaseAdmitCard({
        id: 'admit-' + app.id,
        applicationId: app.id,
        applicationNumber: app.registrationNumber || app.applicationNumber,
        rollNumber,
        candidateName: app.personalInfo.fullName,
        fatherName: app.parentInfo.fatherName,
        classApplying: app.classApplying,
        stream: app.stream,
        examCentreName: examDetails.examCentreName,
        examCentreAddress: examDetails.examCentreAddress,
        examDate: examDetails.examDate,
        reportingTime: examDetails.reportingTime,
        examDuration: examDetails.examDuration,
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
