import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin role required.' }, { status: 403 });
    }

    const body = await req.json();
    const { action, csvContent, publishDirectly } = body;

    if (!csvContent || typeof csvContent !== 'string') {
      return NextResponse.json({ error: 'Valid CSV content is required.' }, { status: 400 });
    }

    // Parse CSV lines
    const lines = csvContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV file must have a header row and at least one candidate record.' }, { status: 400 });
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const dataRows = lines.slice(1);

    const applications = await db.getApplications();
    const admitCards = await db.getAdmitCards();

    const parsedResults: any[] = [];
    const errors: string[] = [];

    dataRows.forEach((rowStr, idx) => {
      const cols = rowStr.split(',').map((c) => c.trim());
      if (cols.length < 5) {
        errors.push(`Row ${idx + 2}: Incomplete columns.`);
        return;
      }

      // Expected columns: RollNo, Math, Science, English, SanskritGK, Rank, Status
      const rollNumber = cols[0];
      const math = parseFloat(cols[1]) || 0;
      const sci = parseFloat(cols[2]) || 0;
      const eng = parseFloat(cols[3]) || 0;
      const gk = parseFloat(cols[4]) || 0;
      const rank = cols[5] ? parseInt(cols[5]) : idx + 1;
      const status = cols[6]?.toLowerCase() === 'qualified' ? 'qualified' : 'not_qualified';

      const total = math + sci + eng + gk;

      // Find matching application by roll number or registration number
      const card = admitCards.find((c) => c.rollNumber === rollNumber);
      const app = applications.find(
        (a) => a.id === card?.applicationId || a.rollNumber === rollNumber || a.registrationNumber === rollNumber
      );

      parsedResults.push({
        rowNumber: idx + 2,
        rollNumber,
        applicationId: app ? app.id : `app-import-${rollNumber}`,
        candidateName: app?.personalInfo?.fullName || `Candidate (${rollNumber})`,
        classApplying: app?.classApplying || 'Class 6',
        subjectMarks: {
          mathematics: math,
          science: sci,
          englishHindi: eng,
          sanskritGk: gk,
        },
        totalMarks: total,
        maxMarks: 100,
        rank,
        qualifyingStatus: status,
        isMatched: !!app,
      });
    });

    // Action 1: Preview only
    if (action === 'preview') {
      return NextResponse.json({
        success: true,
        action: 'preview',
        totalRows: dataRows.length,
        parsedCount: parsedResults.length,
        validCount: parsedResults.filter((r) => r.isMatched).length,
        previewRows: parsedResults.slice(0, 50),
        errors,
      });
    }

    // Action 2: Commit and save
    if (action === 'commit') {
      for (const res of parsedResults) {
        const subjectsList = [
          { subject: 'Mathematics', maxMarks: 25, marksObtained: res.subjectMarks.mathematics },
          { subject: 'Science', maxMarks: 25, marksObtained: res.subjectMarks.science },
          { subject: 'English & Hindi', maxMarks: 25, marksObtained: res.subjectMarks.englishHindi },
          { subject: 'Sanskrit & General Knowledge', maxMarks: 25, marksObtained: res.subjectMarks.sanskritGk },
        ];
        const percentage = parseFloat(((res.totalMarks / 100) * 100).toFixed(2));
        const qualifyingStatus = res.qualifyingStatus === 'qualified' ? 'Qualified for Admission' : 'Not Qualified';

        await db.publishResult({
          id: `res-${Date.now()}-${res.rollNumber}`,
          applicationId: res.applicationId,
          applicationNumber: res.rollNumber,
          rollNumber: res.rollNumber,
          candidateName: res.candidateName,
          classApplying: res.classApplying,
          subjects: subjectsList,
          totalMarks: res.totalMarks,
          maxTotalMarks: 100,
          percentage,
          rank: res.rank,
          qualifyingStatus,
          isPublished: !!publishDirectly,
          counselingDate: qualifyingStatus === 'Qualified for Admission' ? '05 January 2027' : undefined,
          counselingVenue: qualifyingStatus === 'Qualified for Admission' ? 'Gurukul Kurukshetra Main Campus Auditorium' : undefined,
        });
      }

      await recordAuditLog({
        userId: user.userId,
        userName: user.name,
        userRole: user.role,
        action: 'IMPORT_RESULTS_CSV',
        entity: 'Results',
        details: {
          totalImported: parsedResults.length,
          published: !!publishDirectly,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Successfully imported ${parsedResults.length} entrance exam results!`,
        totalImported: parsedResults.length,
      });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'CSV processing failed' }, { status: 500 });
  }
}
