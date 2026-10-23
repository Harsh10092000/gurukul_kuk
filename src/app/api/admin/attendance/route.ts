import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getExamDetailsForGender } from '@/lib/validations';

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
    let allCandidates = eligibleApplications.map((app) => {
      const card = admitCards.find((c) => c.applicationId === app.id);
      const regNo = (app.registrationNumber || app.applicationNumber || '').trim().toUpperCase();
      const rawGender = (app.personalInfo?.gender || card?.gender || '').trim().toLowerCase();
      const rollNumber = card?.rollNumber || app.rollNumber || 'PENDING';

      // 1. Identify female from roll number series (if allotted)
      let isFemaleFromRoll: boolean | null = null;
      const rollMatch = rollNumber.match(/^27(\d{2})(\d{4,})$/);
      if (rollMatch) {
        const classCode = rollMatch[1];
        const seq = parseInt(rollMatch[2], 10);
        if (classCode === '11') {
          // Class 11 stream allocation:
          // Non-Medical: Boys 0001-1000, Girls 1001-2000
          // Medical: Boys 2001-3000, Girls 3001-4000
          // Commerce: Boys 4001-5000, Girls 5001-6000
          // Humanities: Girls Only 7001-8000
          isFemaleFromRoll =
            (seq >= 1001 && seq <= 2000) ||
            (seq >= 3001 && seq <= 4000) ||
            (seq >= 5001 && seq <= 6000) ||
            (seq >= 7001 && seq <= 8000);
        } else {
          // Classes 5-10: Boys are 0001-5000, Girls are 5001-9999
          isFemaleFromRoll = seq >= 5001;
        }
      }

      // 2. Determine gender strictly and accurately:
      // - NILG prefix is strictly Girls / Female
      // - NILB prefix is strictly Boys / Male
      // - Explicit personal gender 'Female' / 'Girl' vs 'Male' / 'Boy'
      // - If registration prefix or gender string is missing, verify roll number series
      let isGirl = false;
      if (regNo.startsWith('NILG')) {
        isGirl = true;
      } else if (regNo.startsWith('NILB')) {
        isGirl = false;
      } else if (rawGender === 'female' || rawGender === 'girl') {
        isGirl = true;
      } else if (rawGender === 'male' || rawGender === 'boy') {
        isGirl = false;
      } else if (isFemaleFromRoll !== null) {
        isGirl = isFemaleFromRoll;
      }

      const examDetails = getExamDetailsForGender(
        isGirl ? 'Female' : 'Male',
        rollNumber !== 'PENDING' ? rollNumber : regNo
      );

      return {
        id: app.id,
        registrationNumber: app.registrationNumber || app.applicationNumber,
        rollNumber,
        fullName: app.personalInfo?.fullName || 'N/A',
        fatherName: app.parentInfo?.fatherName || 'N/A',
        aadharNo: app.personalInfo?.aadhaarNumber || '—',
        classApplying: app.classApplying,
        stream: (app as any).stream || '',
        gender: isGirl ? 'Female' : 'Male',
        categoryWing: isGirl ? 'Girls Wing (The Gurukul Nilokheri)' : 'Boys Wing (Aryakulam Nilokheri)',
        photo: app.documents?.photo || '',
        signature: app.documents?.signature || '',
        centreName: card?.examCentreName || examDetails.examCentreName,
        examDate: card?.examDate || examDetails.examDate,
        reportingTime: card?.reportingTime || examDetails.reportingTime,
        roomNumber: card?.roomNumber || 'Hall A',
        status: app.status,
      };
    });

    // STRICT FILTER: Show ONLY candidates whose official Roll Number has been allotted (exclude 'PENDING' and rejected)
    allCandidates = allCandidates.filter((c) => c.rollNumber && c.rollNumber !== 'PENDING' && c.status !== 'rejected');

    // Sort by roll number numerically or alphabetically
    allCandidates.sort((a, b) => a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true }));

    // Baseline counts across all allotted candidates
    const totalAll = allCandidates.length;
    const totalBoys = allCandidates.filter((c) => c.gender === 'Male').length;
    const totalGirls = allCandidates.filter((c) => c.gender === 'Female').length;

    let filtered = allCandidates;

    if (centre) {
      filtered = filtered.filter((c) => c.centreName.toLowerCase().includes(centre.toLowerCase()));
    }
    if (classFilter) {
      // Exact classApplying match (e.g. "Class 6", "Class 11")
      filtered = filtered.filter((c) =>
        c.classApplying?.toLowerCase().trim() === classFilter.toLowerCase().trim()
      );
    }
    if (streamFilter) {
      // Filter by stream (for Class 11 variants: Non Medical, Medical, Commerce, Arts)
      filtered = filtered.filter((c) =>
        (c.stream || '').toLowerCase().trim() === streamFilter.toLowerCase().trim()
      );
    }
    if (genderFilter) {
      const g = genderFilter.toLowerCase();
      if (g === 'boys' || g === 'male' || g === 'boy') {
        filtered = filtered.filter((c) => c.gender === 'Male');
      } else if (g === 'girls' || g === 'female' || g === 'girl') {
        filtered = filtered.filter((c) => c.gender === 'Female');
      }
    }

    return NextResponse.json({
      success: true,
      count: filtered.length,
      counts: {
        all: totalAll,
        boys: totalBoys,
        girls: totalGirls,
      },
      candidates: filtered,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch attendance data' }, { status: 500 });
  }
}
