import { NextResponse } from 'next/server';
import { db, toMySqlDatetime } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { sendNotification } from '@/lib/notifications';
import { getExamDetailsForGender } from '@/lib/validations';

export const dynamic = 'force-dynamic';

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

    const releaseTime = toMySqlDatetime(new Date());

    // 1. Fetch all existing admit cards to preserve already assigned roll numbers
    const existingCards = await db.getAdmitCards();
    const existingCardByApp = new Map<string, any>();
    const usedRollNumbers = new Set<string>();

    for (const card of existingCards) {
      if (card.applicationId) existingCardByApp.set(card.applicationId, card);
      if (card.applicationNumber) existingCardByApp.set(card.applicationNumber, card);
      if (card.rollNumber) usedRollNumbers.add(card.rollNumber);
    }

    for (const app of paidApps) {
      if (app.rollNumber) usedRollNumbers.add(app.rollNumber);
    }

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
    const groupCounters: { [groupKey: string]: number } = {};
    for (const roll of Array.from(usedRollNumbers)) {
      const m = roll.match(/^27(\d{2})(\d{4,})$/);
      if (m) {
        const classCode = m[1];
        const seq = parseInt(m[2], 10);
        const isFemale = seq >= 5001;
        const groupKey = `${classCode}_${isFemale ? 'female' : 'male'}`;
        if (!groupCounters[groupKey] || seq > groupCounters[groupKey]) {
          groupCounters[groupKey] = seq;
        }
      }
    }

    for (const app of paidApps) {
      const classCode = db.getClassCode(app.classApplying);
      const isFemale =
        (app.personalInfo?.gender || '').toLowerCase() === 'female' ||
        (app.personalInfo?.gender || '').toLowerCase() === 'girl' ||
        (app.registrationNumber || '').startsWith('NILG');
      const groupKey = `${classCode}_${isFemale ? 'female' : 'male'}`;
      const rollPrefix = `27${classCode}`;
      const minBase = isFemale ? 5000 : 0;
      if (!groupCounters[groupKey] || groupCounters[groupKey] < minBase) {
        groupCounters[groupKey] = minBase;
      }

      const existingCard = existingCardByApp.get(app.id) || existingCardByApp.get(app.registrationNumber || app.applicationNumber || '');

      let rollNumber: string;
      if (existingCard?.rollNumber) {
        rollNumber = existingCard.rollNumber;
      } else if (app.rollNumber && !usedRollNumbers.has(app.rollNumber)) {
        rollNumber = app.rollNumber;
        usedRollNumbers.add(rollNumber);
      } else {
        let nextSeq = groupCounters[groupKey] + 1;
        while (usedRollNumbers.has(`${rollPrefix}${String(nextSeq).padStart(4, '0')}`)) {
          nextSeq++;
        }
        groupCounters[groupKey] = nextSeq;
        rollNumber = `${rollPrefix}${String(nextSeq).padStart(4, '0')}`;
        usedRollNumbers.add(rollNumber);
      }

      const rawSeq = parseInt(rollNumber.slice(rollPrefix.length), 10) || 1;
      const candidateIndex = isFemale ? (rawSeq - 5000) : rawSeq;
      const indexForSeating = candidateIndex > 0 ? candidateIndex : 1;
      const hallNumber = Math.ceil(indexForSeating / 30);
      const deskNumber = ((indexForSeating - 1) % 30) + 1;

      const examDetails = getExamDetailsForGender(
        app.personalInfo?.gender,
        app.registrationNumber || app.applicationNumber
      );

      await db.generateOrReleaseAdmitCard({
        id: existingCard?.id || ('admit-' + app.id),
        applicationId: app.id,
        applicationNumber: app.registrationNumber || app.applicationNumber,
        rollNumber,
        candidateName: app.personalInfo?.fullName || 'Applicant',
        fatherName: app.parentInfo?.fatherName || '',
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
  } catch (error: any) {
    console.error('Bulk admit card generation error:', error);
    return NextResponse.json(
      { error: error?.message || 'An error occurred while generating bulk admit cards.' },
      { status: 500 }
    );
  }
}
