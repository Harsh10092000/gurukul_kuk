import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getExamDetailsForGender } from '@/lib/validations';

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const applications = await db.getApplications();
    const admitCards = await db.getAdmitCards();
    const admitCardMap = new Map<string, any>();
    (admitCards || []).forEach((c: any) => {
      if (c.applicationId) admitCardMap.set(c.applicationId, c);
      if (c.applicationNumber) admitCardMap.set(c.applicationNumber, c);
    });

    // Comprehensive CSV Column Headers
    const headers = [
      'Registration ID',
      'Roll Number',
      'Candidate Full Name',
      'Class Applying',
      'Stream',
      'Gender',
      'Date of Birth',
      'Category',
      'Aadhaar Number',
      'PEN Number',
      'APAAR ID',
      'Family ID / PPP',
      'Candidate Email',
      'Candidate Mobile',
      'WhatsApp Number',
      'Father Name',
      'Father Phone',
      'Father Occupation',
      'Mother Name',
      'Mother Phone',
      'Mother Occupation',
      'Annual Income',
      'Guardian Name',
      'Guardian Relation',
      'Street Address',
      'City / Town',
      'District',
      'State',
      'Pincode',
      '1st Study Location Preference',
      '2nd Study Location Preference',
      'Allotted Examination Centre',
      'Previous School Name',
      'Previous Board',
      'Payment Status',
      'Transaction Ref / Order ID',
      'Registration Date',
    ];

    const rows = applications.map((app) => {
      const card = admitCardMap.get(app.id) || admitCardMap.get(app.registrationNumber) || admitCardMap.get(app.applicationNumber);
      const rollNumber = app.rollNumber || card?.rollNumber || 'PENDING';
      const examDet = getExamDetailsForGender(app.personalInfo?.gender, app.registrationNumber || app.applicationNumber);

      const studyPref1 = app.studyLocationPref?.firstPreference || app.studyLocation?.firstPreference || app.examCentrePref?.preferredCenter1 || '';
      const studyPref2 = app.studyLocationPref?.secondPreference || app.studyLocation?.secondPreference || app.examCentrePref?.preferredCenter2 || '';

      const regDate = app.createdAt ? new Date(app.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '';

      return [
        escapeCsv(app.registrationNumber || app.applicationNumber || app.id),
        escapeCsv(rollNumber),
        escapeCsv(app.personalInfo?.fullName || ''),
        escapeCsv(app.classApplying || ''),
        escapeCsv(app.stream || app.academicInfo?.stream || 'N/A'),
        escapeCsv(app.personalInfo?.gender || ''),
        escapeCsv(app.personalInfo?.dob || ''),
        escapeCsv(app.personalInfo?.category || ''),
        escapeCsv(app.personalInfo?.aadhaarNumber || ''),
        escapeCsv(app.personalInfo?.panNumber || ''),
        escapeCsv(app.personalInfo?.apaarId || ''),
        escapeCsv(app.personalInfo?.familyId || ''),
        escapeCsv(app.personalInfo?.candidateEmail || app.personalInfo?.email || ''),
        escapeCsv(app.personalInfo?.candidateMobile || ''),
        escapeCsv(app.personalInfo?.whatsappNumber || app.addressInfo?.whatsappNumber || ''),
        escapeCsv(app.parentInfo?.fatherName || ''),
        escapeCsv(app.parentInfo?.fatherPhone || ''),
        escapeCsv(app.parentInfo?.fatherOccupation || ''),
        escapeCsv(app.parentInfo?.motherName || ''),
        escapeCsv(app.parentInfo?.motherPhone || ''),
        escapeCsv(app.parentInfo?.motherOccupation || ''),
        escapeCsv(app.parentInfo?.annualIncome || ''),
        escapeCsv(app.parentInfo?.guardianName || ''),
        escapeCsv(app.parentInfo?.guardianRelation || ''),
        escapeCsv(app.addressInfo?.streetAddress || ''),
        escapeCsv(app.addressInfo?.city || ''),
        escapeCsv(app.addressInfo?.district || ''),
        escapeCsv(app.addressInfo?.state || ''),
        escapeCsv(app.addressInfo?.pincode || ''),
        escapeCsv(studyPref1),
        escapeCsv(studyPref2),
        escapeCsv(card?.examCentreName || examDet.examCentreName),
        escapeCsv(app.personalInfo?.previousSchoolName || app.academicInfo?.previousSchoolName || ''),
        escapeCsv(app.personalInfo?.previousBoard || app.academicInfo?.previousBoard || ''),
        escapeCsv(app.paymentStatus || 'paid'),
        escapeCsv(app.transactionId || ''),
        escapeCsv(regDate),
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.map(escapeCsv).join(','), ...rows].join('\r\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="the_gurukul_applicants_master_${Date.now()}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error generating export:', error);
    return NextResponse.json({ error: 'Failed to generate CSV export' }, { status: 500 });
  }
}
