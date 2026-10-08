import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function parseDataUrl(dataUrl?: string): { buffer: Buffer; ext: string } | null {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.includes(';base64,')) return null;
  const parts = dataUrl.split(';base64,');
  if (parts.length < 2) return null;
  const mime = parts[0].replace('data:', '').trim().toLowerCase();
  const base64Data = parts[1];

  let ext = 'jpg';
  if (mime.includes('png')) ext = 'png';
  else if (mime.includes('pdf')) ext = 'pdf';
  else if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';

  try {
    const buffer = Buffer.from(base64Data, 'base64');
    return { buffer, ext };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const classFilter = searchParams.get('class') || 'all';
    const streamFilter = searchParams.get('stream') || 'all';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const applications = await db.getApplications().catch((err) => {
      console.error('Failed to get applications for bulk download:', err);
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

    const filtered = (applications || []).filter((app: any) => {
      if (app.status === 'draft') return false;

      // Class filter
      if (classFilter !== 'all') {
        const appClass = (app.classApplying || '').toLowerCase();
        const targetClass = classFilter.toLowerCase();
        if (!appClass.includes(targetClass.replace('class', '').trim())) {
          return false;
        }
      }

      // Stream filter (for Class 11 streams)
      if (streamFilter !== 'all') {
        const appStream = (app.stream || app.academicInfo?.stream || '').toLowerCase();
        const targetStream = streamFilter.toLowerCase();
        if (targetStream.includes('non') && !(appStream.includes('non') || appStream.includes('pcm'))) return false;
        if (targetStream.includes('comm') && !appStream.includes('comm')) return false;
        if (targetStream.includes('med') && !targetStream.includes('non') && (!appStream.includes('med') || appStream.includes('non'))) return false;
      }

      // Date range filter
      if (startMs || endMs) {
        const appDate = new Date(app.createdAt || app.created_at || 0).getTime();
        if (startMs && appDate < startMs) return false;
        if (endMs && appDate > endMs) return false;
      }

      return true;
    });

    const zip = new JSZip();

    // Summary Manifest CSV
    const manifestRows = [
      ['S.No', 'Registration ID', 'Roll Number', 'Candidate Name', 'Class', 'Stream', 'Gender', 'Phone', 'Father Name', 'Exam Centre', 'Photo Available', 'Signature Available', 'Aadhaar Available'],
    ];

    let filesIncluded = 0;

    for (let i = 0; i < filtered.length; i++) {
      const app = filtered[i];
      const regId = app.registrationNumber || app.applicationNumber || `APP_${i + 1}`;
      const name = (app.personalInfo?.fullName || 'Candidate').replace(/[^a-zA-Z0-9_\- ]/g, '').trim().replace(/\s+/g, '_');
      const cls = (app.classApplying || 'Class_6').replace(/\s+/g, '_');
      const stream = (app.stream || app.academicInfo?.stream || 'General').replace(/\s+/g, '_');

      const folderName = `${cls}/${regId}_${name}`;
      const candidateFolder = zip.folder(folderName);

      const docs = app.documents || {};
      let hasPhoto = false;
      let hasSig = false;
      let hasAadhaar = false;

      // 1. Candidate Photo
      const photoParsed = parseDataUrl(docs.photo);
      if (photoParsed && candidateFolder) {
        candidateFolder.file(`Photo.${photoParsed.ext}`, photoParsed.buffer);
        hasPhoto = true;
        filesIncluded++;
      }

      // 2. Candidate Signature
      const sigParsed = parseDataUrl(docs.signature);
      if (sigParsed && candidateFolder) {
        candidateFolder.file(`Signature.${sigParsed.ext}`, sigParsed.buffer);
        hasSig = true;
        filesIncluded++;
      }

      // 3. Candidate Aadhaar Card
      const aadhaarParsed = parseDataUrl(docs.aadhaarCard);
      if (aadhaarParsed && candidateFolder) {
        candidateFolder.file(`Aadhaar_Card.${aadhaarParsed.ext}`, aadhaarParsed.buffer);
        hasAadhaar = true;
        filesIncluded++;
      }

      // 4. Candidate Info Dossier Card
      const infoText = [
        '==================================================================',
        '              THE GURUKUL ENTRANCE EXAMINATION (2027-28)          ',
        '                        OFFICIAL CANDIDATE DOSSIER                ',
        '==================================================================',
        '',
        `Registration Number : ${regId}`,
        `Roll Number         : ${app.rollNumber || 'PENDING ALLOTMENT'}`,
        `Candidate Name      : ${app.personalInfo?.fullName || 'N/A'}`,
        `Gender              : ${app.personalInfo?.gender || 'N/A'}`,
        `Date of Birth       : ${app.personalInfo?.dob || 'N/A'}`,
        `Category            : ${app.personalInfo?.category || 'General'}`,
        `Class Applying      : ${app.classApplying || 'N/A'}`,
        `Stream              : ${app.stream || app.academicInfo?.stream || 'N/A'}`,
        `Previous School     : ${app.personalInfo?.previousSchoolName || app.academicInfo?.previousSchoolName || 'N/A'}`,
        `Previous Board      : ${app.personalInfo?.previousBoard || app.academicInfo?.previousBoard || 'N/A'}`,
        '',
        '--- PARENT / GUARDIAN PARTICULARS ---',
        `Father Name         : ${app.parentInfo?.fatherName || 'N/A'}`,
        `Father Mobile       : ${app.parentInfo?.fatherPhone || app.personalInfo?.candidateMobile || 'N/A'}`,
        `Mother Name         : ${app.parentInfo?.motherName || 'N/A'}`,
        `Mother Mobile       : ${app.parentInfo?.motherPhone || 'N/A'}`,
        `Candidate Email     : ${app.personalInfo?.candidateEmail || 'N/A'}`,
        '',
        '--- POSTAL ADDRESS ---',
        `Street Address      : ${app.addressInfo?.streetAddress || 'N/A'}`,
        `City / Town         : ${app.addressInfo?.city || 'N/A'}`,
        `District            : ${app.addressInfo?.district || 'N/A'}`,
        `State               : ${app.addressInfo?.state || 'Haryana'}`,
        `PIN Code            : ${app.addressInfo?.pincode || 'N/A'}`,
        '',
        '--- EXAMINATION PREFERENCES ---',
        `Study Location Pref : ${app.studyLocationPref?.firstPreference || 'The Gurukul Nilokheri'}`,
        `Exam Centre Pref    : ${app.examCentrePref?.preferredCenter1 || app.studyLocationPref?.firstPreference || 'Aryakulam Nilokheri'}`,
        '',
        '--- FEE & REGISTRATION STATUS ---',
        `Application Status  : ${(app.status || 'approved').toUpperCase()}`,
        `Fee Payment Status  : ${(app.paymentStatus || 'completed').toUpperCase()}`,
        `Amount Paid         : ₹${app.amountPaid || 800}`,
        `Transaction ID      : ${app.transactionId || 'CONFIRMED'}`,
        `Registered Date     : ${app.createdAt || 'N/A'}`,
        '==================================================================',
      ].join('\r\n');

      if (candidateFolder) {
        candidateFolder.file('Candidate_Details.txt', infoText);
      }

      manifestRows.push([
        String(i + 1),
        regId,
        app.rollNumber || 'PENDING',
        app.personalInfo?.fullName || 'Candidate',
        app.classApplying || '',
        app.stream || app.academicInfo?.stream || 'N/A',
        app.personalInfo?.gender || '',
        app.personalInfo?.candidateMobile || app.parentInfo?.fatherPhone || '',
        app.parentInfo?.fatherName || '',
        app.studyLocationPref?.firstPreference || '',
        hasPhoto ? 'YES' : 'NO',
        hasSig ? 'YES' : 'NO',
        hasAadhaar ? 'YES' : 'NO',
      ]);
    }

    // Add Root Index CSV
    const csvContent = '\uFEFF' + manifestRows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    zip.file('Candidates_Manifest_Index.csv', csvContent);

    // Readme
    zip.file(
      'README.txt',
      `The Gurukul Nilokheri - Bulk Candidate Documents Archive\r\n` +
      `Class Filter: ${classFilter}\r\n` +
      `Stream Filter: ${streamFilter}\r\n` +
      `Total Candidates: ${filtered.length}\r\n` +
      `Generated On: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST\r\n`
    );

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const safeClass = classFilter.replace(/\s+/g, '_');
    const safeStream = streamFilter.replace(/\s+/g, '_');
    const filename = `Gurukul_Candidate_Docs_${safeClass}_${safeStream}_${Date.now()}.zip`;

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating bulk documents zip:', error);
    return NextResponse.json({ error: 'Failed to generate bulk documents ZIP', details: error?.message }, { status: 500 });
  }
}
