import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const applications = await db.getApplications();

    // Generate CSV Header
    const headers = [
      'Application Number',
      'Candidate Name',
      'Class Applying',
      'Gender',
      'DOB',
      'Category',
      'Father Name',
      'Mobile Phone',
      'City',
      'State',
      'Preferred Centre',
      'Status',
      'Payment Status',
      'Amount (INR)',
      'Transaction Ref',
      'Submission Date',
    ];

    const rows = applications.map((app) => [
      `"${app.applicationNumber}"`,
      `"${app.personalInfo?.fullName || ''}"`,
      `"${app.classApplying || ''}"`,
      `"${app.personalInfo?.gender || ''}"`,
      `"${app.personalInfo?.dob || ''}"`,
      `"${app.personalInfo?.category || ''}"`,
      `"${app.parentInfo?.fatherName || ''}"`,
      `"${app.parentInfo?.fatherPhone || ''}"`,
      `"${app.addressInfo?.city || ''}"`,
      `"${app.addressInfo?.state || ''}"`,
      `"${app.examCentrePref?.preferredCenter1 || ''}"`,
      `"${app.status}"`,
      `"${app.paymentStatus}"`,
      `"${app.amountPaid || 1200}"`,
      `"${app.transactionId || ''}"`,
      `"${new Date(app.createdAt).toISOString()}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="gurukul_applicants_${Date.now()}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error generating export:', error);
    return NextResponse.json({ error: 'Failed to generate CSV export' }, { status: 500 });
  }
}
