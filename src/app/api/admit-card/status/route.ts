import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getExamDetailsForGender } from '@/lib/validations';

export async function GET() {
  try {
    const settings = await db.getSettings();
    return NextResponse.json({
      admitCardsReleased: settings.admitCardsReleased === true,
      admitCardsReleasedAt: settings.admitCardsReleasedAt || null,
    });
  } catch {
    return NextResponse.json({ admitCardsReleased: false });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Administrative access required.' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    if (typeof body.admitCardsReleased !== 'boolean') {
      return NextResponse.json({ error: 'admitCardsReleased (boolean) is required' }, { status: 400 });
    }

    const release = body.admitCardsReleased;
    const now = new Date().toISOString();

    if (release) {
      // If releasing, ensure roll numbers and admit cards are generated for all paid applicants
      const allApplications = await db.getApplications();
      const paidApps = allApplications.filter((a) => a.paymentStatus === 'completed');
      const settings = await db.getSettings();
      const examDate = settings.entranceExamDate || '06 December 2026';
      const centres = await db.getCentres();
      const primaryCentre = centres[0] || {
        name: 'The Gurukul Nilokheri Main Campus',
        address: 'Nilokheri, Karnal, Haryana - 132117',
        capacity: 3000,
      };

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

      const classCounters: { [classCode: string]: number } = {};
      const usedRollNumbers = new Set<string>();

      // Pass 1: Collect existing valid unique class-based roll numbers
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
          createdAt: now,
        });

        try {
          await db.updateApplication(app.id, { rollNumber });
        } catch { }
      }

      await db.updateSettings({
        admitCardsReleased: true,
        admitCardsReleasedAt: now,
      });

      return NextResponse.json({
        success: true,
        admitCardsReleased: true,
        admitCardsReleasedAt: now,
        message: 'Admit cards are now officially RELEASED and visible to candidates.',
      });
    } else {
      // Admin clicked "Stop Showing / Hide Admit Cards"
      await db.updateSettings({
        admitCardsReleased: false,
      });

      return NextResponse.json({
        success: true,
        admitCardsReleased: false,
        message: 'Admit cards are now HIDDEN from candidates (held in progress).',
      });
    }
  } catch (error: any) {
    console.error('Error updating admit card release status:', error);
    return NextResponse.json({ error: error.message || 'Failed to update status' }, { status: 500 });
  }
}
