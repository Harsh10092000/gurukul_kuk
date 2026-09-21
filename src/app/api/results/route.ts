import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { sendNotification } from '@/lib/notifications';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    const appId = searchParams.get('appId');
    const rollNo = searchParams.get('rollNo');
    const dob = searchParams.get('dob');
    const all = searchParams.get('all');

    // Admin access
    if (user && user.role === 'admin') {
      if (all === 'true') {
        const results = await db.getAllResults();
        return NextResponse.json({ results });
      }
      if (rollNo) {
        const res = await db.getResultByRollAndDob(rollNo, dob || undefined);
        return NextResponse.json({ result: res });
      }
      if (appId) {
        const res = await db.getResult(appId);
        return NextResponse.json({ result: res });
      }
    }

    // Check if results are officially declared by examination cell
    const resultsDeclared = await db.areResultsDeclared();
    if (!resultsDeclared) {
      return NextResponse.json(
        { message: 'Results have not been officially declared yet.', resultsDeclared: false, result: null },
        { status: 200 }
      );
    }

    // Candidate Search via Roll Number & Date of Birth
    if (rollNo) {
      if (!user || user.role !== 'admin') {
        if (!dob || !dob.trim()) {
          return NextResponse.json(
            { error: 'Date of Birth (DOB) is required to verify and view results.', result: null, resultsDeclared: true },
            { status: 400 }
          );
        }
      }
      const res = await db.getResultByRollAndDob(rollNo, dob ? dob.trim() : undefined);
      if (res && res.isPublished) {
        // Sanitize: Under institutional policy, absolutely NO marks are transmitted
        const sanitized = {
          id: res.id,
          rollNumber: res.rollNumber,
          applicationNumber: res.applicationNumber,
          candidateName: res.candidateName,
          dob: res.dob,
          classApplying: res.classApplying,
          qualifyingStatus: res.qualifyingStatus,
          remarks: res.remarks,
          counselingDate: res.counselingDate,
          counselingVenue: res.counselingVenue,
          isPublished: res.isPublished,
        };
        return NextResponse.json({ result: sanitized, resultsDeclared: true });
      }
      return NextResponse.json({ result: null, resultsDeclared: true });
    }

    // Direct appId query or logged-in applicant checking from dashboard
    if (appId || user) {
      const userApp = user ? await db.getApplicationByUserId(user.userId) : null;
      const targetId = appId || userApp?.id || '';
      const res = (targetId ? await db.getResult(targetId) : null) ||
                  (userApp?.rollNumber ? await db.getResult(userApp.rollNumber) : null);
      if (res && res.isPublished) {
        const sanitized = {
          id: res.id,
          rollNumber: res.rollNumber,
          applicationNumber: res.applicationNumber,
          candidateName: res.candidateName,
          dob: res.dob || userApp?.personalInfo?.dob,
          classApplying: res.classApplying,
          qualifyingStatus: res.qualifyingStatus,
          remarks: res.remarks,
          counselingDate: res.counselingDate,
          counselingVenue: res.counselingVenue,
          isPublished: res.isPublished,
        };
        return NextResponse.json({ result: sanitized, resultsDeclared: true });
      }
    }

    return NextResponse.json({ result: null, resultsDeclared: true });
  } catch (error) {
    console.error('Error in results route:', error);
    return NextResponse.json({ error: 'Failed to retrieve result' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { applicationId, rollNumber, candidateName, dob, classApplying, qualifyingStatus, remarks } = body;

    const application = applicationId ? await db.getApplicationById(applicationId) : null;
    const finalRoll = rollNumber || application?.rollNumber || 'ROLL-' + Date.now();
    const finalName = candidateName || application?.personalInfo.fullName || `Candidate (${finalRoll})`;

    const newResult = await db.publishResult({
      id: 'res-' + Date.now(),
      applicationId: application ? application.id : `app-manual-${finalRoll}`,
      applicationNumber: application ? application.applicationNumber : finalRoll,
      rollNumber: finalRoll,
      candidateName: finalName,
      dob: dob || application?.personalInfo?.dob || '',
      classApplying: classApplying || application?.classApplying || 'Class 6',
      qualifyingStatus: qualifyingStatus === 'Qualified' ? 'Qualified' : 'Not Qualified',
      counselingDate: qualifyingStatus === 'Qualified' ? '10 January 2027 at 10:00 AM' : undefined,
      counselingVenue: qualifyingStatus === 'Qualified' ? 'Main Administrative Block, The Gurukul Nilokheri Campus' : undefined,
      isPublished: true,
      remarks: remarks || (qualifyingStatus === 'Qualified' ? 'Qualified for admission counseling.' : 'Not qualified for current session.'),
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, result: newResult });
  } catch (error) {
    console.error('Error publishing result:', error);
    return NextResponse.json({ error: 'Failed to publish result' }, { status: 500 });
  }
}
