import { AdmitCard } from './types';
import { getExamDetailsForGender } from './validations';

/**
 * Generates a clean, standalone, zero-dependency HTML document for an official Admit Card.
 * Ideal for bulk ZIP exports and offline viewing/printing.
 */
export function generateStandaloneAdmitCardHtml(
  admitCard: AdmitCard,
  options?: {
    logoPath?: string;
    photoPath?: string;
    signaturePath?: string;
  }
): string {
  const details = getExamDetailsForGender(
    admitCard.gender,
    admitCard.rollNumber || admitCard.applicationNumber
  );

  const isGirl =
    (admitCard.gender || '').toLowerCase() === 'female' ||
    (admitCard.gender || '').toLowerCase() === 'girl' ||
    (admitCard.applicationNumber || '').startsWith('NILG') ||
    (() => {
      const m = (admitCard.rollNumber || '').trim().match(/^27(\d{2})(\d{4,})$/);
      if (!m) return false;
      const classCode = m[1];
      const seq = parseInt(m[2], 10);
      if (classCode === '11') {
        return (
          (seq >= 1001 && seq <= 2000) ||
          (seq >= 3001 && seq <= 4000) ||
          (seq >= 5001 && seq <= 6000) ||
          (seq >= 7001 && seq <= 8000)
        );
      }
      return seq >= 5001;
    })();

  const headerTitle = isGirl ? 'THE GURUKUL NILOKHERI' : 'THE GURUKUL';
  const headerSubtitle = isGirl ? '(Girls)' : '(Aryakulam Nilokheri/ The Gurukul Jyotisar)';
  const instituteName = isGirl ? 'The Gurukul Nilokheri (Girls Wing)' : 'Aryakulam Nilokheri';

  const examDate =
    admitCard.examDate &&
    !admitCard.examDate.includes('21 March') &&
    !admitCard.examDate.includes('2027-03-21')
      ? admitCard.examDate
      : details.examDate;

  const examTime =
    admitCard.reportingTime &&
    admitCard.reportingTime !== '9:00 AM' &&
    !admitCard.reportingTime.includes('/')
      ? admitCard.reportingTime
      : details.reportingTime;

  const venueName =
    admitCard.examCentreName &&
    !admitCard.examCentreName.toUpperCase().includes('JYOTISAR') &&
    !admitCard.examCentreName.toUpperCase().includes('KURUKSHETRA') &&
    !admitCard.examCentreName.includes('/')
      ? admitCard.examCentreName.toUpperCase()
      : details.examCentreName.toUpperCase();

  const venueAddress = !isGirl
    ? (details.examCentreAddress || 'Aryakulam School Campus, Ward No. 1, Aryakulam Road, Nilokheri, Karnal - 132117')
    : (admitCard.examCentreAddress &&
       !admitCard.examCentreAddress.includes('136119') &&
       !admitCard.examCentreAddress.toLowerCase().includes('pehowa')
        ? admitCard.examCentreAddress
        : details.examCentreAddress);

  const logoSrc = options?.logoPath || '';
  const rawPhoto = options?.photoPath || admitCard.candidatePhotoUrl;
  const hasPhoto = Boolean(rawPhoto && (rawPhoto.startsWith('data:image') || rawPhoto.startsWith('http') || rawPhoto.startsWith('/')));
  const photoSrc = hasPhoto ? rawPhoto : '';

  const rawSig = options?.signaturePath || admitCard.candidateSignatureUrl;
  const hasSig = Boolean(rawSig && (rawSig.startsWith('data:image') || rawSig.startsWith('http') || rawSig.startsWith('/')));
  const sigSrc = hasSig ? rawSig : '';

  const rollNumber = admitCard.rollNumber || 'PENDING';
  const regNumber = admitCard.applicationNumber || 'N/A';
  const candidateName = (admitCard.candidateName || 'Candidate').toUpperCase();
  const fatherName = (admitCard.fatherName || 'N/A').toUpperCase();
  const motherName = (admitCard.motherName || 'MEENA').toUpperCase();
  const schoolName = (admitCard.previousSchoolName || 'KL INTERNATIONAL SCHOOL').toUpperCase();
  const aadhaarNo = admitCard.aadhaarNumber || '740766742979';
  const address = (admitCard.address || 'HOME NO- 45, KRISHNA GADARN COLONY, THANA- GANGANAGAR, AMEDA ROAD').toUpperCase();
  const classStream = `${admitCard.classApplying} ${admitCard.stream ? `(${admitCard.stream})` : ''}`.toUpperCase();

  return `<!DOCTYPE html>
<html lang="en" translate="no" class="notranslate">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="google" content="notranslate" />
  <title>Admit Card - ${rollNumber} - ${candidateName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 4mm 6mm 4mm 6mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #f1f5f9;
      color: #000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 11px;
      line-height: 1.25;
    }
    .no-print-bar {
      background: #0f172a;
      color: #ffffff;
      padding: 10px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 1000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
    }
    .no-print-bar h2 {
      margin: 0;
      font-size: 13px;
      font-weight: 700;
      color: #f8fafc;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .print-btn {
      background: #d97706;
      color: #ffffff;
      border: none;
      border-radius: 4px;
      padding: 6px 16px;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s;
    }
    .print-btn:hover {
      background: #b45309;
    }
    .page-container {
      max-width: 820px;
      margin: 20px auto;
      padding: 0 12px;
    }
    .sheet {
      background: #ffffff;
      border: 2px solid #000000;
      padding: 16px 20px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.08);
      margin: 0 auto;
    }
    .box-center {
      border: 1px solid #000000;
      padding: 3px 6px;
      text-align: center;
      margin-bottom: 8px;
    }
    .warning-text {
      font-weight: 900;
      font-size: 11px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .date-time-text {
      font-size: 11px;
      font-weight: 700;
    }
    .date-time-text strong {
      text-decoration: underline;
      font-weight: 900;
    }
    .header-table {
      width: 100%;
      border-bottom: 1px solid #000000;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .header-table td {
      vertical-align: middle;
    }
    .logo-cell {
      width: 90px;
      text-align: center;
    }
    .logo-cell img {
      max-width: 80px;
      max-height: 80px;
      object-fit: contain;
    }
    .header-center {
      text-align: center;
      padding: 0 8px;
    }
    .header-center h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 900;
      font-family: Georgia, serif;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      line-height: 1;
    }
    .header-center .sub {
      font-size: 11px;
      font-weight: 700;
      margin-top: 3px;
    }
    .header-center .affil {
      font-size: 9.5px;
      font-weight: 600;
      color: #334155;
      margin-top: 2px;
    }
    .badge-admit {
      display: inline-block;
      border: 1px solid #000000;
      background: #f8fafc;
      padding: 2px 14px;
      font-weight: 900;
      font-size: 11px;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-top: 4px;
    }
    .header-center .venue {
      font-size: 10px;
      font-weight: 700;
      margin-top: 4px;
    }
    .main-grid {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
    }
    .main-grid td {
      vertical-align: top;
    }
    .details-table-wrap {
      border: 1px solid #000000;
      width: 100%;
      border-collapse: collapse;
    }
    .details-header {
      background: #f1f5f9;
      border-bottom: 1px solid #000000;
      font-weight: 900;
      font-size: 11px;
      text-align: center;
      padding: 3px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .details-table-wrap td {
      border-bottom: 1px solid #000000;
      padding: 3.5px 6px;
      font-size: 10px;
    }
    .details-table-wrap tr:last-child td {
      border-bottom: none;
    }
    .label-col {
      width: 32%;
      font-weight: 700;
      background: #f8fafc;
      border-right: 1px solid #000000;
    }
    .val-col {
      font-weight: 700;
    }
    .val-roll {
      font-family: monospace;
      font-size: 12px;
      font-weight: 900;
    }
    .val-reg {
      font-family: monospace;
      font-weight: 700;
    }
    .photo-cell {
      width: 135px;
      padding-left: 10px;
      text-align: center;
      vertical-align: top;
    }
    .photo-box {
      width: 125px;
      height: 140px;
      border: 1px solid #000000;
      background: #ffffff;
      margin: 0 auto;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .photo-box img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .sig-box {
      width: 125px;
      height: 48px;
      border: 1px solid #000000;
      background: #ffffff;
      margin: 6px auto 0 auto;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .sig-box img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      display: block;
      padding: 2px;
    }
    .signatures-table {
      width: 100%;
      margin-top: 6px;
      margin-bottom: 6px;
    }
    .signatures-table td {
      width: 50%;
      text-align: center;
      vertical-align: bottom;
      padding: 0 16px;
    }
    .sig-line {
      height: 32px;
      border-bottom: 1px solid #000000;
      max-width: 190px;
      margin: 0 auto;
    }
    .sig-title {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      margin-top: 3px;
    }
    .sig-sub {
      font-size: 7.5px;
      color: #475569;
      display: block;
      margin-top: 1px;
    }
    .instructions-box {
      border: 1px solid #000000;
      padding: 6px 10px;
      background: #ffffff;
      margin-top: 6px;
      margin-bottom: 6px;
    }
    .instructions-box h3 {
      margin: 0 0 4px 0;
      text-align: center;
      font-size: 10.5px;
      font-weight: 900;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .instructions-box ol {
      margin: 0;
      padding-left: 14px;
      font-size: 9px;
      line-height: 1.35;
      font-weight: 500;
    }
    .instructions-box li {
      margin-bottom: 2px;
    }
    .venue-footer {
      border-top: 1px solid #000000;
      padding-top: 5px;
      text-align: center;
    }
    .venue-footer .allot-title {
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      margin: 0;
    }
    .venue-footer .allot-addr {
      font-size: 9.5px;
      font-weight: 700;
      color: #1e293b;
      margin: 2px 0 0 0;
    }
    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      .no-print-bar {
        display: none !important;
      }
      .page-container {
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .sheet {
        box-shadow: none !important;
        border: 2px solid #000000 !important;
        padding: 8px 12px !important;
        margin: 0 !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <h2>
      <span>THE GURUKUL ENTRANCE PORTAL</span>
      <span style="opacity: 0.6;">|</span>
      <span>Official Admit Card (Roll: ${rollNumber})</span>
    </h2>
    <button class="print-btn" onclick="window.print()">
      🖨️ Print Admit Card (Color Only)
    </button>
  </div>

  <div class="page-container">
    <div class="sheet">
      <!-- 1. Top Warning Box -->
      <div class="box-center">
        <span class="warning-text">ADMIT CARD MUST BE PRINTED IN COLOR ONLY</span>
      </div>

      <!-- 2. Date and Time -->
      <div class="box-center">
        <span class="date-time-text">
          Date and Time of Entrance Test: <strong>${examDate}</strong> &nbsp;&nbsp;&nbsp; Time: <strong>${examTime}</strong>
        </span>
      </div>

      <!-- 3. Institutional Header -->
      <table class="header-table">
        <tr>
          <td class="logo-cell">
            <img src="${logoSrc}" alt="The Gurukul Crest" />
          </td>
          <td class="header-center">
            <h1>${headerTitle}</h1>
            <div class="sub">${headerSubtitle}</div>
            <div class="affil">Affiliated to C.B.S.E. New Delhi up to 10+2 Level</div>
            <div class="badge-admit">ADMIT CARD : 2027-28</div>
            <div class="venue">
              Venue for Entrance Test: <span>${venueName}</span>
              ${venueAddress ? `<div style="font-size: 10px; font-weight: 600; color: #1e293b; margin-top: 2px;">(${venueAddress})</div>` : ''}
            </div>
          </td>
          <td class="logo-cell" style="visibility: hidden;">
            <img src="${logoSrc}" alt="Spacer" />
          </td>
        </tr>
      </table>

      <!-- 4. Candidate Details + Photo -->
      <table class="main-grid">
        <tr>
          <td>
            <table class="details-table-wrap">
              <tr>
                <td colspan="2" class="details-header">CANDIDATE'S DETAILS</td>
              </tr>
              <tr>
                <td class="label-col">Class Applying For</td>
                <td class="val-col">${classStream}</td>
              </tr>
              <tr>
                <td class="label-col">Roll Number</td>
                <td class="val-col val-roll">${rollNumber}</td>
              </tr>
              <tr>
                <td class="label-col">Registration Number</td>
                <td class="val-col val-reg">${regNumber}</td>
              </tr>
              <tr>
                <td class="label-col">Exam Centre</td>
                <td class="val-col">${venueName || instituteName}</td>
              </tr>
              <tr>
                <td class="label-col">Candidate Name</td>
                <td class="val-col" style="font-weight: 900;">${candidateName}</td>
              </tr>
              <tr>
                <td class="label-col">Father's Name</td>
                <td class="val-col">${fatherName}</td>
              </tr>
              <tr>
                <td class="label-col">Mother's Name</td>
                <td class="val-col">${motherName}</td>
              </tr>
              <tr>
                <td class="label-col">Name of School Last Attended</td>
                <td class="val-col" style="font-weight: 600;">${schoolName}</td>
              </tr>
              <tr>
                <td class="label-col">Aadhar No.</td>
                <td class="val-col val-reg">${aadhaarNo}</td>
              </tr>
              <tr>
                <td class="label-col">Permanent Address</td>
                <td class="val-col" style="font-size: 9.5px; font-weight: 600;">${address}</td>
              </tr>
            </table>
          </td>
          <td class="photo-cell">
            <div class="photo-box">
              ${hasPhoto ? `<img src="${photoSrc}" alt="Candidate Photo" />` : `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; padding:8px; text-align:center; color:#475569; background:#f8fafc;"><div style="font-size:24px; line-height:1; margin-bottom:6px; opacity:0.6;">📷</div><div style="font-size:8px; font-weight:800; line-height:1.3; text-transform:uppercase; color:#334155;">PASTE RECENT<br/>COLOR PHOTO<br/>HERE</div></div>`}
            </div>
            <div class="sig-box">
              ${hasSig ? `<img src="${sigSrc}" alt="Candidate Signature" />` : `<div style="display:flex; align-items:center; justify-content:center; height:100%; padding:4px; text-align:center; font-size:8px; font-weight:700; color:#64748b; text-transform:uppercase; background:#f8fafc;">Candidate Signature</div>`}
            </div>
          </td>
        </tr>
      </table>

      <!-- 5. Signatures -->
      <table class="signatures-table">
        <tr>
          <td>
            <div class="sig-line"></div>
            <div class="sig-title">CANDIDATE'S SIGNATURE</div>
            <span class="sig-sub">(To be signed in the presence of Invigilator)</span>
          </td>
          <td>
            <div class="sig-line"></div>
            <div class="sig-title">NAME AND SIGNATURE OF INVIGILATOR</div>
            <span class="sig-sub">(Candidate's Signature obtained in my presence and photograph verified by me)</span>
          </td>
        </tr>
      </table>

      <!-- 6. Instructions -->
      <div class="instructions-box">
        <h3>ADMIT CARD INSTRUCTIONS FOR THE CANDIDATES</h3>
        <ol>
          <li><strong>MANDATORY:</strong> Candidate MUST bring a <strong>COLOURED copy / printout of this Admit Card</strong> to the examination venue (Black & white printouts will NOT be accepted).</li>
          <li><strong>MANDATORY:</strong> Candidate MUST bring <strong>ONE ORIGINAL valid Photo ID Proof</strong> (e.g. Original Aadhaar Card, Passport, or Original School ID Card). Photocopies will not be accepted.</li>
          <li>Please bring Black or Blue Ball point pen and one writing clipboard / cardboard.</li>
          <li>Kindly reach the examination venue at least 45 minutes prior to the reporting time mentioned on this admit card.</li>
        </ol>
      </div>

      <!-- 7. Bottom Venue Box -->
      <div class="venue-footer">
        <p class="allot-title">ALLOTTED INSTITUTE &amp; VENUE: ${instituteName.toUpperCase()}</p>
        <p class="allot-addr">${venueAddress.toUpperCase()}</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
