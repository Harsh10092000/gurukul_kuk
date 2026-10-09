import { NextResponse } from 'next/server';
import { db, toMySqlDatetime } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getExamDetailsForGender } from '@/lib/validations';
import { AdmitCard } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Administrative access required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const classFilter = searchParams.get('class') || 'all';
    const streamFilter = searchParams.get('stream') || 'all';

    const applications = await db.getApplications().catch((err) => {
      console.error('Failed to get applications for bulk admit card list:', err);
      return [];
    });

    const existingCards = await db.getAdmitCards().catch(() => []);
    const existingMap = new Map<string, any>();
    for (const card of existingCards) {
      if (card.applicationId) existingMap.set(card.applicationId, card);
      if (card.applicationNumber) existingMap.set(card.applicationNumber, card);
      if (card.rollNumber) existingMap.set(card.rollNumber, card);
    }

    // Filter applications
    const filteredApps = applications.filter((app: any) => {
      if (app.status === 'draft') return false;

      // Class filter
      if (classFilter !== 'all') {
        const appClass = (app.classApplying || '').toLowerCase();
        const targetClass = classFilter.toLowerCase();
        if (!appClass.includes(targetClass.replace('class', '').trim())) {
          return false;
        }
      }

      // Stream filter for Class 11
      if (streamFilter !== 'all') {
        const appStream = (app.stream || app.academicInfo?.stream || '').toLowerCase();
        const targetStream = streamFilter.toLowerCase();
        if (targetStream.includes('non') && !(appStream.includes('non') || appStream.includes('pcm'))) return false;
        if (targetStream.includes('comm') && !appStream.includes('comm')) return false;
        if (targetStream.includes('med') && !targetStream.includes('non') && (!appStream.includes('med') || appStream.includes('non'))) return false;
        if ((targetStream.includes('human') || targetStream.includes('art')) && !(appStream.includes('human') || appStream.includes('art'))) return false;
      }

      return true;
    });

    const resultCards: AdmitCard[] = [];

    for (const app of filteredApps) {
      const regId = app.registrationNumber || app.applicationNumber || app.id;
      let card = existingMap.get(app.id) || existingMap.get(regId) || (app.rollNumber ? existingMap.get(app.rollNumber) : null);

      if (!card) {
        // Generate on the fly so no approved/paid candidate is omitted
        const candidateGender = app.personalInfo?.gender;
        const candidateStream = app.stream || app.academicInfo?.stream;
        let rollNumber = app.rollNumber;
        if (!rollNumber) {
          rollNumber = await db.getNextRollNumber(app.classApplying, candidateGender, candidateStream);
          try {
            await db.updateApplication(app.id, { rollNumber });
          } catch {}
        }

        const examDetails = getExamDetailsForGender(candidateGender, regId);

        card = await db.generateOrReleaseAdmitCard({
          id: 'admit-' + app.id,
          applicationId: app.id,
          applicationNumber: regId,
          rollNumber,
          candidateName: app.personalInfo?.fullName || 'Applicant',
          fatherName: app.parentInfo?.fatherName || 'N/A',
          motherName: app.parentInfo?.motherName || 'MEENA',
          previousSchoolName: app.academicInfo?.previousSchoolName || app.personalInfo?.previousSchoolName || 'KL INTERNATIONAL SCHOOL',
          aadhaarNumber: app.personalInfo?.aadhaarNumber || '740766742979',
          classApplying: app.classApplying,
          stream: candidateStream,
          examCentreName: examDetails.examCentreName,
          examCentreAddress: examDetails.examCentreAddress,
          examDate: examDetails.examDate,
          reportingTime: examDetails.reportingTime,
          examDuration: examDetails.examDuration,
          roomNumber: 'Hall-A',
          candidatePhotoUrl: app.documents?.photo || '/logo-gurukul.png',
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
      }

      // Enrich card
      const enrichedCard: AdmitCard = {
        ...card,
        gender: app.personalInfo?.gender,
        motherName: card.motherName || app.parentInfo?.motherName || 'MEENA',
        previousSchoolName: card.previousSchoolName || app.academicInfo?.previousSchoolName || app.personalInfo?.previousSchoolName || 'KL INTERNATIONAL SCHOOL',
        aadhaarNumber: card.aadhaarNumber || app.personalInfo?.aadhaarNumber || '740766742979',
        candidatePhotoUrl: app.documents?.photo || card.candidatePhotoUrl || '/logo-gurukul.png',
      };

      const addressParts = [
        app.addressInfo?.streetAddress,
        app.addressInfo?.city,
        app.addressInfo?.district,
        app.addressInfo?.state,
        app.addressInfo?.pincode,
      ].filter(Boolean);
      enrichedCard.address = addressParts.length > 0 ? addressParts.join(', ') : (card.address || 'HOME NO- 45, KRISHNA GADARN COLONY, THANA- GANGANAGAR, AMEDA ROAD');

      const examDetails = getExamDetailsForGender(app.personalInfo?.gender, enrichedCard.rollNumber || enrichedCard.applicationNumber);
      enrichedCard.examCentreName = examDetails.examCentreName;
      enrichedCard.examCentreAddress = examDetails.examCentreAddress;
      enrichedCard.examDate = examDetails.examDate;
      enrichedCard.reportingTime = examDetails.reportingTime;
      enrichedCard.examDuration = examDetails.examDuration;

      resultCards.push(enrichedCard);
    }

    // Sort by roll number ascending
    resultCards.sort((a, b) => (a.rollNumber || '').localeCompare(b.rollNumber || '', undefined, { numeric: true }));

    return NextResponse.json({
      success: true,
      count: resultCards.length,
      class: classFilter,
      stream: streamFilter,
      admitCards: resultCards,
    });
  } catch (error: any) {
    console.error('Error fetching bulk admit card list:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch bulk admit cards list.' },
      { status: 500 }
    );
  }
}
