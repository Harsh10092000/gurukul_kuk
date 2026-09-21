import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';
import { ExamResult } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin role required.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, rows, publishDirectly } = body;

    // Action 0: Clear all existing results
    if (action === 'clear') {
      await db.clearResults();
      await recordAuditLog({
        userId: user.userId,
        userName: user.name,
        userRole: user.role,
        action: 'CLEAR_RESULTS',
        entity: 'Results',
        details: { clearedBy: user.name },
      });
      return NextResponse.json({ success: true, message: 'All results cleared successfully.' });
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: 'No candidate result rows found. Please upload a valid Excel or CSV file.' },
        { status: 400 }
      );
    }

    const applications = await db.getApplications();
    const admitCards = await db.getAdmitCards();

    const parsedResults: any[] = [];
    const errors: string[] = [];

    rows.forEach((rawRow: any, idx: number) => {
      // Find candidate name (case-insensitive keys)
      const nameKey = Object.keys(rawRow).find((k) =>
        /^(candidate\s*name|name|student\s*name|full\s*name)$/i.test(k.trim())
      );
      const rollKey = Object.keys(rawRow).find((k) =>
        /^(roll\s*number|roll\s*no|rollno|roll)$/i.test(k.trim())
      );
      const dobKey = Object.keys(rawRow).find((k) =>
        /^(dob|date\s*of\s*birth|birth\s*date)$/i.test(k.trim())
      );
      const remarkKey = Object.keys(rawRow).find((k) =>
        /^(remark|remarks|selection\s*remark|comments|status|selection\s*comment)$/i.test(k.trim())
      );

      const candidateName = (nameKey ? String(rawRow[nameKey] || '') : '').trim();
      const rollNumber = (rollKey ? String(rawRow[rollKey] || '') : '').trim();
      let dob = (dobKey ? String(rawRow[dobKey] || '') : '').trim();
      const remarks = (remarkKey ? String(rawRow[remarkKey] || '') : '').trim();

      // Format Excel serial date if numeric (e.g. 41771)
      if (dob && /^\d{5}$/.test(dob)) {
        try {
          const serial = parseInt(dob, 10);
          const utcDays = serial - 25569;
          const dateObj = new Date(utcDays * 86400 * 1000);
          if (!isNaN(dateObj.getTime())) {
            dob = dateObj.toISOString().slice(0, 10);
          }
        } catch {}
      }

      if (!rollNumber && !candidateName) {
        // Skip purely empty trailing rows
        return;
      }

      if (!rollNumber) {
        errors.push(`Row ${idx + 1}: Missing Roll Number.`);
        return;
      }

      // Determine qualifying status from remark / comment
      const lowerRemark = (remarks + ' ' + (rawRow.status || '')).toLowerCase();
      let qualifyingStatus: 'Qualified' | 'Not Qualified' = 'Qualified';
      if (
        lowerRemark.includes('not qualified') ||
        lowerRemark.includes('not_qualified') ||
        lowerRemark.includes('rejected') ||
        lowerRemark.includes('disqualified') ||
        lowerRemark.includes('fail')
      ) {
        qualifyingStatus = 'Not Qualified';
      } else if (
        lowerRemark.includes('qualified') ||
        lowerRemark.includes('selected') ||
        lowerRemark.includes('shortlisted') ||
        lowerRemark.includes('pass')
      ) {
        qualifyingStatus = 'Qualified';
      } else {
        // Default to Qualified if positive remarks, or Not Qualified if negative
        qualifyingStatus = lowerRemark.length > 0 ? 'Qualified' : 'Not Qualified';
      }

      // Find matching application or admit card in system
      const card = admitCards.find(
        (c) =>
          c.rollNumber?.toLowerCase() === rollNumber.toLowerCase() ||
          c.applicationNumber?.toLowerCase() === rollNumber.toLowerCase()
      );
      const app = applications.find(
        (a) =>
          a.id === card?.applicationId ||
          a.rollNumber?.toLowerCase() === rollNumber.toLowerCase() ||
          a.registrationNumber?.toLowerCase() === rollNumber.toLowerCase()
      );

      parsedResults.push({
        id: `res-${rollNumber.replace(/[^a-zA-Z0-9]/g, '')}`,
        applicationId: app ? app.id : `app-ext-${rollNumber}`,
        applicationNumber: app ? app.registrationNumber : rollNumber,
        rollNumber,
        candidateName: candidateName || app?.personalInfo?.fullName || `Candidate (${rollNumber})`,
        dob: dob || app?.personalInfo?.dob || '',
        classApplying: app?.classApplying || 'Class 6',
        qualifyingStatus,
        remarks: remarks || (qualifyingStatus === 'Qualified' ? 'Qualified for admission counseling.' : 'Not qualified for current session.'),
        isMatched: !!app,
        isPublished: Boolean(publishDirectly),
        createdAt: new Date().toISOString(),
      });
    });

    if (parsedResults.length === 0) {
      return NextResponse.json(
        { error: 'No valid candidate records could be parsed from the provided file.' },
        { status: 400 }
      );
    }

    const qualifiedCount = parsedResults.filter((r) => r.qualifyingStatus === 'Qualified').length;
    const notQualifiedCount = parsedResults.filter((r) => r.qualifyingStatus === 'Not Qualified').length;

    // Action 1: Preview mode
    if (action === 'preview') {
      return NextResponse.json({
        success: true,
        action: 'preview',
        totalRows: parsedResults.length,
        qualifiedCount,
        notQualifiedCount,
        matchedCount: parsedResults.filter((r) => r.isMatched).length,
        previewRows: parsedResults,
        errors,
      });
    }

    // Action 2: Commit mode (Save to database)
    if (action === 'commit') {
      const toSave: ExamResult[] = parsedResults.map((r) => ({
        id: r.id,
        applicationId: r.applicationId,
        applicationNumber: r.applicationNumber,
        rollNumber: r.rollNumber,
        candidateName: r.candidateName,
        dob: r.dob,
        classApplying: r.classApplying,
        qualifyingStatus: r.qualifyingStatus,
        remarks: r.remarks,
        isPublished: Boolean(publishDirectly),
        counselingDate: r.qualifyingStatus === 'Qualified' ? '10 January 2027 at 10:00 AM' : undefined,
        counselingVenue: r.qualifyingStatus === 'Qualified' ? 'Main Administrative Block, The Gurukul Nilokheri' : undefined,
        createdAt: new Date().toISOString(),
      }));

      await db.bulkSaveResults(toSave);

      if (publishDirectly) {
        await db.updateSettings({ resultsDeclared: true });
      }

      await recordAuditLog({
        userId: user.userId,
        userName: user.name,
        userRole: user.role,
        action: 'UPLOAD_RESULTS_EXCEL',
        entity: 'Results',
        details: {
          totalUploaded: toSave.length,
          qualified: qualifiedCount,
          notQualified: notQualifiedCount,
          publishedImmediately: !!publishDirectly,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Successfully uploaded ${toSave.length} results (${qualifiedCount} Qualified, ${notQualifiedCount} Not Qualified).`,
        totalUploaded: toSave.length,
        qualifiedCount,
        notQualifiedCount,
      });
    }

    return NextResponse.json({ error: 'Invalid action parameter. Must be preview or commit.' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in results import API:', err);
    return NextResponse.json({ error: err.message || 'Failed to process Excel results.' }, { status: 500 });
  }
}
