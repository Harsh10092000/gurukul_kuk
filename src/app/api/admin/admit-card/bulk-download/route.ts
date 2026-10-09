import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { db, toMySqlDatetime } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getExamDetailsForGender } from '@/lib/validations';
import { AdmitCard } from '@/lib/types';
import { generateStandaloneAdmitCardHtml } from '@/lib/admit-card-html';

export const dynamic = 'force-dynamic';

function parseDataUrl(dataUrl?: string): { buffer: Buffer; ext: string } | null {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.includes(';base64,')) return null;
  const parts = dataUrl.split(';base64,');
  if (parts.length < 2) return null;
  const mime = parts[0].replace('data:', '').trim().toLowerCase();
  const base64Data = parts[1];

  let ext = 'jpg';
  if (mime.includes('png')) ext = 'png';
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
      return NextResponse.json(
        { error: 'Unauthorized: Administrative access required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const classFilter = searchParams.get('class') || 'all';
    const streamFilter = searchParams.get('stream') || 'all';

    const applications = await db.getApplications().catch((err) => {
      console.error('Failed to get applications for bulk admit card download:', err);
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

    if (filteredApps.length === 0) {
      return NextResponse.json(
        { error: `No registered candidates found matching criteria (Class: ${classFilter}, Stream: ${streamFilter}).` },
        { status: 404 }
      );
    }

    const zip = new JSZip();

    // 1. Embed Official Crest Logo in ZIP assets and base64 string
    const logoFilePath = path.join(process.cwd(), 'public', 'logo-gurukul.png');
    let logoBase64 = '';
    if (fs.existsSync(logoFilePath)) {
      try {
        const logoBuffer = fs.readFileSync(logoFilePath);
        logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
        zip.file('assets/logo-gurukul.png', logoBuffer);
      } catch (err) {
        console.warn('Could not read logo-gurukul.png for ZIP asset:', err);
      }
    }

    // Prepare Master Register Spreadsheet Rows
    const excelRows: any[] = [];

    // Ensure and generate cards
    const enrichedList: AdmitCard[] = [];

    for (let i = 0; i < filteredApps.length; i++) {
      const app = filteredApps[i];
      const regId = app.registrationNumber || app.applicationNumber || app.id;
      let card = existingMap.get(app.id) || existingMap.get(regId) || (app.rollNumber ? existingMap.get(app.rollNumber) : null);

      if (!card) {
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

      enrichedList.push(enrichedCard);
    }

    // Sort by roll number ascending
    enrichedList.sort((a, b) => (a.rollNumber || '').localeCompare(b.rollNumber || '', undefined, { numeric: true }));

    // 2. Build folder files & master spreadsheet
    enrichedList.forEach((card, index) => {
      const clsFolder = (card.classApplying || 'Class_General').replace(/\s+/g, '_');
      const roll = card.rollNumber || `ROLL_${index + 1}`;
      const safeName = (card.candidateName || 'Candidate').replace(/[^a-zA-Z0-9_\- ]/g, '').trim().replace(/\s+/g, '_');

      // Candidate Photo extraction
      let photoDataUri = '';
      const parsedPhoto = parseDataUrl(card.candidatePhotoUrl);
      if (parsedPhoto && card.candidatePhotoUrl) {
        photoDataUri = card.candidatePhotoUrl;
        zip.file(`assets/photos/${roll}.${parsedPhoto.ext}`, parsedPhoto.buffer);
      } else if (card.candidatePhotoUrl && card.candidatePhotoUrl.startsWith('data:image')) {
        photoDataUri = card.candidatePhotoUrl;
      }

      // Generate HTML with 100% embedded self-contained images
      const htmlContent = generateStandaloneAdmitCardHtml(card, {
        logoPath: logoBase64,
        photoPath: photoDataUri,
      });

      const fileName = `${clsFolder}/Admit_Card_${roll}_${safeName}.html`;
      zip.file(fileName, htmlContent);

      // Add to Excel rows
      excelRows.push({
        'S.No': index + 1,
        'Roll Number': roll,
        'Registration ID': card.applicationNumber,
        'Candidate Name': card.candidateName,
        'Gender': card.gender || 'N/A',
        'Class Applying': card.classApplying,
        'Stream': card.stream || 'N/A',
        "Father's Name": card.fatherName,
        "Mother's Name": card.motherName || 'MEENA',
        'Aadhaar Number': card.aadhaarNumber,
        'Exam Centre': card.examCentreName,
        'Exam Centre Address': card.examCentreAddress,
        'Exam Date': card.examDate,
        'Reporting Time': card.reportingTime,
        'Room / Desk': card.roomNumber || 'Hall-A',
        'Photo Available': parsedPhoto ? 'YES' : 'NO',
      });
    });

    // 3. Create Excel Master Register
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Admit Cards Register');
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    zip.file(
      `Admit_Cards_Master_Register_${classFilter.replace(/\s+/g, '_')}.xlsx`,
      excelBuffer
    );

    // 4. Generate ZIP
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const timestamp = new Date().toISOString().slice(0, 10);
    const cleanClassName = classFilter.replace(/\s+/g, '_');
    const cleanStreamName = streamFilter !== 'all' ? `_${streamFilter.replace(/\s+/g, '_')}` : '';
    const downloadFilename = `Gurukul_Admit_Cards_${cleanClassName}${cleanStreamName}_${timestamp}.zip`;

    return new NextResponse(zipBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${downloadFilename}"`,
        'Cache-Control': 'no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Error generating bulk admit card ZIP:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate bulk admit cards archive.' },
      { status: 500 }
    );
  }
}
