import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const centre = searchParams.get('centre') || '';
    const classFilter = searchParams.get('class') || '';
    const streamFilter = searchParams.get('stream') || '';

    const genderFilter = searchParams.get('gender') || '';

    const applications = await db.getApplications();
    const admitCards = await db.getAdmitCards();

    // Exclude all applications in draft state or incomplete/un-submitted registrations
    const eligibleApplications = applications.filter((app) => {
      if (!app) return false;
      if (app.status === 'draft') return false;
      const regNo = app.registrationNumber || app.applicationNumber || '';
      if (regNo.startsWith('DRAFT-')) return false;
      if (app.paymentStatus === 'pending' && app.status !== 'approved' && app.status !== 'submitted') return false;
      return true;
    });

    // Map eligible candidates with admit cards if issued
    let candidates = eligibleApplications.map((app) => {
      const card = admitCards.find((c) => c.applicationId === app.id);
      const isGirl =
        app.personalInfo?.gender === 'Female' ||
        (app.registrationNumber || '').startsWith('NILG-') ||
        (app.studyLocation?.firstPreference || '').toLowerCase().includes('aryakulam');
      return {
        id: app.id,
        registrationNumber: app.registrationNumber || app.applicationNumber,
        rollNumber: card?.rollNumber || app.rollNumber || 'PENDING',
        fullName: app.personalInfo?.fullName || 'N/A',
        fatherName: app.parentInfo?.fatherName || 'N/A',
        classApplying: app.classApplying,
        stream: (app as any).stream || '',
        gender: isGirl ? 'Female' : 'Male',
        categoryWing: isGirl ? 'Girls Wing (Aryakulam)' : 'Boys Wing (Gurukul)',
        photo: app.documents?.photo || '',
        signature: app.documents?.signature || '',
        centreName: card?.examCentreName || app.studyLocation?.firstPreference || app.examCentrePref?.preferredCenter1 || 'Gurukul Nilokheri',
        examDate: card?.examDate || '06 December 2026',
        reportingTime: card?.reportingTime || '08:30 AM',
        roomNumber: card?.roomNumber || 'Hall A',
        status: app.status,
      };
    });

    if (centre) {
      candidates = candidates.filter((c) => c.centreName.toLowerCase().includes(centre.toLowerCase()));
    }
    if (classFilter) {
      // Exact classApplying match (e.g. "Class 6", "Class 11")
      candidates = candidates.filter((c) =>
        c.classApplying?.toLowerCase().trim() === classFilter.toLowerCase().trim()
      );
    }
    if (streamFilter) {
      // Filter by stream (for Class 11 variants: Non Medical, Medical, Commerce, Arts)
      candidates = candidates.filter((c) =>
        (c.stream || '').toLowerCase().trim() === streamFilter.toLowerCase().trim()
      );
    }
    if (genderFilter) {
      const g = genderFilter.toLowerCase();
      if (g === 'boys' || g === 'male') {
        candidates = candidates.filter((c) => c.gender === 'Male');
      } else if (g === 'girls' || g === 'female') {
        candidates = candidates.filter((c) => c.gender === 'Female');
      }
    }

    // STRICT FILTER: Show ONLY candidates whose official Roll Number has been allotted (exclude 'PENDING' and rejected)
    candidates = candidates.filter((c) => c.rollNumber && c.rollNumber !== 'PENDING' && c.status !== 'rejected');

    // Sort by roll number numerically or alphabetically
    candidates.sort((a, b) => a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true }));

    return NextResponse.json({
      success: true,
      count: candidates.length,
      candidates,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch attendance data' }, { status: 500 });
  }
}
