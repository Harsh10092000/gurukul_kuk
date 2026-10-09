import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate') || searchParams.get('from');
    const endDateParam = searchParams.get('endDate') || searchParams.get('to');
    const format = searchParams.get('format') || 'xlsx';

    const applications = await db.getApplications().catch((err) => {
      console.error('Error fetching applications for class summary:', err);
      return [];
    });

    // Date range filter
    let startMs: number | null = null;
    let endMs: number | null = null;

    if (startDateParam) {
      const d = new Date(startDateParam);
      if (!isNaN(d.getTime())) {
        d.setHours(0, 0, 0, 0);
        startMs = d.getTime();
      }
    }

    if (endDateParam) {
      const d = new Date(endDateParam);
      if (!isNaN(d.getTime())) {
        d.setHours(23, 59, 59, 999);
        endMs = d.getTime();
      }
    }

    const filteredApps = (applications || []).filter((app: any) => {
      // Don't count incomplete drafts
      if (app.status === 'draft') return false;

      if (startMs || endMs) {
        const appDate = new Date(app.createdAt || app.created_at || 0).getTime();
        if (isNaN(appDate) || appDate === 0) return true; // keep if date missing
        if (startMs && appDate < startMs) return false;
        if (endMs && appDate > endMs) return false;
      }
      return true;
    });

    // 8 Predefined Rows matching the user's template
    const categories = [
      { sNo: 1, class: 'Class 5', stream: 'Class 5', match: (a: any) => (a.classApplying || '').toLowerCase().includes('5') },
      { sNo: 2, class: 'Class 9', stream: 'Class 9', match: (a: any) => (a.classApplying || '').toLowerCase().includes('9') },
      { sNo: 3, class: 'Class 6', stream: 'Class 6', match: (a: any) => (a.classApplying || '').toLowerCase().includes('6') },
      { sNo: 4, class: 'Class 7', stream: 'Class 7', match: (a: any) => (a.classApplying || '').toLowerCase().includes('7') },
      { sNo: 5, class: 'Class 8', stream: 'Class 8', match: (a: any) => (a.classApplying || '').toLowerCase().includes('8') },
      {
        sNo: 6,
        class: 'Class 11',
        stream: 'Non-Medical',
        match: (a: any) => {
          const cls = (a.classApplying || '').toLowerCase();
          if (!cls.includes('11')) return false;
          const str = (a.stream || a.academicInfo?.stream || '').toLowerCase();
          return str.includes('non') || str.includes('pcm');
        },
      },
      {
        sNo: 7,
        class: 'Class 11',
        stream: 'Commerce',
        match: (a: any) => {
          const cls = (a.classApplying || '').toLowerCase();
          if (!cls.includes('11')) return false;
          const str = (a.stream || a.academicInfo?.stream || '').toLowerCase();
          return str.includes('comm');
        },
      },
      {
        sNo: 8,
        class: 'Class 11',
        stream: 'Medical',
        match: (a: any) => {
          const cls = (a.classApplying || '').toLowerCase();
          if (!cls.includes('11')) return false;
          const str = (a.stream || a.academicInfo?.stream || '').toLowerCase();
          return str.includes('med') && !str.includes('non');
        },
      },
      {
        sNo: 9,
        class: 'Class 11',
        stream: 'Humanities (Girls Only)',
        match: (a: any) => {
          const cls = (a.classApplying || '').toLowerCase();
          if (!cls.includes('11')) return false;
          const str = (a.stream || a.academicInfo?.stream || '').toLowerCase();
          return str.includes('human') || str.includes('art');
        },
      },
    ];

    let totalRegistered = 0;
    let totalApproved = 0;
    let totalWithdrawn = 0;
    let grandTotal = 0;

    const summaryRows = categories.map((cat) => {
      const matching = filteredApps.filter(cat.match);
      const registered = matching.length;
      const approved = matching.filter((a: any) => a.status === 'approved' || a.status === 'admitted' || a.status === 'admit_card_ready').length;
      const withdrawn = matching.filter((a: any) => a.status === 'rejected' || a.status === 'withdrawn' || a.status === 'cancelled').length;
      const total = registered;

      totalRegistered += registered;
      totalApproved += approved;
      totalWithdrawn += withdrawn;
      grandTotal += total;

      return {
        sNo: cat.sNo,
        class: cat.class,
        stream: cat.stream,
        registered,
        approved,
        withdrawn,
        total,
      };
    });

    // If client requested JSON preview
    if (format === 'json') {
      return NextResponse.json({
        success: true,
        generatedAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        dateRange: {
          startDate: startDateParam || null,
          endDate: endDateParam || null,
        },
        rows: summaryRows,
        totals: {
          sNo: 9,
          class: 'Total',
          stream: '',
          registered: totalRegistered,
          approved: totalApproved,
          withdrawn: totalWithdrawn,
          total: grandTotal,
        },
        filteredCandidateCount: filteredApps.length,
      });
    }

    // Build Native Excel Workbook via SheetJS
    const nowFormatted = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST';
    const dateRangeNote = startDateParam && endDateParam
      ? `From ${startDateParam} To ${endDateParam}`
      : startDateParam
      ? `From ${startDateParam} onwards`
      : endDateParam
      ? `Up to ${endDateParam}`
      : 'All Available Dates';

    // Sheet 1: Class Summary
    const sheetData: any[][] = [
      [],
      ['Generated At:', nowFormatted, '', 'Date Filter:', dateRangeNote],
      [],
      ['S.NO', 'CLASS', 'Stream', 'REGISTERED', 'APPROVED', 'WITHDRAWN', 'TOTAL'],
    ];

    summaryRows.forEach((r) => {
      sheetData.push([r.sNo, r.class, r.stream, r.registered, r.approved, r.withdrawn, r.total]);
    });

    // Total row
    sheetData.push([9, 'Total', '', totalRegistered, totalApproved, totalWithdrawn, grandTotal]);

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.aoa_to_sheet(sheetData);

    // Set column widths for clean formatting
    wsSummary['!cols'] = [
      { wch: 8 },  // S.NO
      { wch: 14 }, // CLASS
      { wch: 18 }, // Stream
      { wch: 16 }, // REGISTERED
      { wch: 14 }, // APPROVED
      { wch: 14 }, // WITHDRAWN
      { wch: 12 }, // TOTAL
    ];

    XLSX.utils.book_append_sheet(wb, wsSummary, 'Class Summary');

    // Sheet 2: Candidate Roster (Detailed student records in that phase)
    const rosterHeaders = [
      'S.No',
      'Registration ID',
      'Roll Number',
      'Candidate Name',
      'Class',
      'Stream',
      'Gender',
      'DOB',
      'Father Name',
      'Father Mobile',
      'Exam Centre',
      'Fee Status',
      'Application Status',
      'Registration Date',
    ];

    const rosterRows = filteredApps.map((app: any, idx: number) => [
      idx + 1,
      app.registrationNumber || app.applicationNumber || app.id,
      app.rollNumber || 'PENDING',
      app.personalInfo?.fullName || 'Candidate',
      app.classApplying || 'Class 6',
      app.stream || app.academicInfo?.stream || 'N/A',
      app.personalInfo?.gender || '',
      app.personalInfo?.dob || '',
      app.parentInfo?.fatherName || '',
      app.personalInfo?.candidateMobile || app.parentInfo?.fatherPhone || '',
      app.studyLocationPref?.firstPreference || app.studyLocation?.firstPreference || '',
      app.paymentStatus === 'completed' || app.paymentStatus === 'paid' ? 'Paid (₹800)' : 'Pending',
      (app.status || 'approved').toUpperCase(),
      app.createdAt ? new Date(app.createdAt).toLocaleDateString('en-IN') : '',
    ]);

    const wsRoster = XLSX.utils.aoa_to_sheet([rosterHeaders, ...rosterRows]);
    wsRoster['!cols'] = [
      { wch: 6 },
      { wch: 16 },
      { wch: 12 },
      { wch: 22 },
      { wch: 10 },
      { wch: 14 },
      { wch: 10 },
      { wch: 12 },
      { wch: 20 },
      { wch: 16 },
      { wch: 24 },
      { wch: 14 },
      { wch: 18 },
      { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(wb, wsRoster, 'Candidate Roster');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = `The_Gurukul_Class_Summary_${startDateParam || 'All'}_to_${endDateParam || 'Latest'}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating class summary report:', error);
    return NextResponse.json({ error: 'Failed to generate class summary report', details: error?.message }, { status: 500 });
  }
}
