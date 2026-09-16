import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

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
        name: 'Gurukul Kurukshetra Main Campus',
        address: 'Near 3rd Gate, Kurukshetra University, Kurukshetra, Haryana - 136119',
        capacity: 3000,
      };

      paidApps.sort((a, b) => (a.registrationNumber || '').localeCompare(b.registrationNumber || ''));
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
