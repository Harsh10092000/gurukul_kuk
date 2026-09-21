'use client';

import React from 'react';
import Image from 'next/image';
import { Printer, CheckCircle } from 'lucide-react';
import { AdmitCard } from '@/lib/types';
import { getExamDetailsForGender } from '@/lib/validations';

interface AdmitCardViewProps {
  admitCard: AdmitCard;
}

export function printAdmitCard(sheetId: string = 'admit-card-print-sheet', title?: string) {
  const element = document.getElementById(sheetId);
  if (!element) {
    window.print();
    return;
  }

  // Remove any previous print iframe if it exists
  const existingFrame = document.getElementById('admit-card-print-iframe');
  if (existingFrame) {
    existingFrame.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'admit-card-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.top = '0';
  iframe.style.left = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.style.zIndex = '-9999';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  // Extract all CSS links and style tags from parent document
  const headElements = Array.from(
    document.querySelectorAll('link[rel="stylesheet"], style')
  )
    .map((el) => el.outerHTML)
    .join('\n');

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${title || 'Gurukul_Admit_Card'}</title>
        ${headElements}
        <style>
          @page {
            size: A4 portrait;
            margin: 4mm 6mm 4mm 6mm;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            width: 100% !important;
            height: auto !important;
          }
          .no-print, button {
            display: none !important;
          }
          .print-card {
            border: 2px solid #000000 !important;
            box-shadow: none !important;
            margin: 0 auto !important;
            width: 100% !important;
            max-width: 100% !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        </style>
      </head>
      <body>
        <div style="width: 100%; max-width: 100%; margin: 0 auto; background: #ffffff;">
          ${element.outerHTML}
        </div>
      </body>
    </html>
  `);
  doc.close();

  const trigger = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('Error invoking iframe print', e);
      window.print();
    }
  };

  // Wait for all images to be loaded
  const imgs = iframe.contentDocument?.images;
  const total = imgs ? imgs.length : 0;
  if (total === 0) {
    setTimeout(trigger, 250);
  } else {
    let loaded = 0;
    let done = false;
    const checkDone = () => {
      loaded++;
      if (loaded >= total && !done) {
        done = true;
        setTimeout(trigger, 250);
      }
    };
    for (let i = 0; i < total; i++) {
      const img = imgs![i];
      if (img.complete) {
        checkDone();
      } else {
        img.onload = checkDone;
        img.onerror = checkDone;
      }
    }
    setTimeout(() => {
      if (!done) {
        done = true;
        trigger();
      }
    }, 1500);
  }
}

export default function AdmitCardView({ admitCard }: AdmitCardViewProps) {
  const handlePrint = () => {
    const docTitle = `AdmitCard_${admitCard.rollNumber || admitCard.applicationNumber}_${(admitCard.candidateName || 'Candidate').replace(/\s+/g, '_')}`;
    printAdmitCard('admit-card-print-sheet', docTitle);
  };

  // Listen to keyboard Ctrl+P / Cmd+P to trigger clean isolated print
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [admitCard]);

  // Dynamic Venue, Exam Date, and Timing values tailored for Boys vs Girls
  const details = getExamDetailsForGender(admitCard.gender, admitCard.rollNumber || admitCard.applicationNumber);
  const examDate = (admitCard.examDate && !admitCard.examDate.includes('21 March') && !admitCard.examDate.includes('2027-03-21'))
    ? admitCard.examDate
    : details.examDate;
  const examTime = (admitCard.reportingTime && admitCard.reportingTime !== '9:00 AM' && !admitCard.reportingTime.includes('/'))
    ? admitCard.reportingTime
    : details.reportingTime;
  const venueName = (admitCard.examCentreName && !admitCard.examCentreName.toUpperCase().includes('JYOTISAR') && !admitCard.examCentreName.toUpperCase().includes('KURUKSHETRA') && !admitCard.examCentreName.includes('/'))
    ? admitCard.examCentreName.toUpperCase()
    : details.examCentreName.toUpperCase();
  const venueAddress = (admitCard.examCentreAddress && !admitCard.examCentreAddress.includes('136119') && !admitCard.examCentreAddress.toLowerCase().includes('pehowa'))
    ? admitCard.examCentreAddress
    : details.examCentreAddress;

  return (
    <div className="w-full max-w-4xl mx-auto my-6 px-2 sm:px-4 font-sans text-slate-900 print:m-0 print:p-0 print:max-w-full">
      {/* Top Action Bar (Hidden when printing) */}
      <div className="no-print portal-card p-4 mb-6 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-slate-900 font-bold text-base sm:text-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            Official Admit Card Ready (Session 2027-28)
          </h2>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            id="admit-card-print-btn"
            className="btn-primary text-xs sm:text-sm h-10 px-5 flex items-center gap-2"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Print / Save as PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet (Standard A4 Official Layout matching PDF Template) */}
      <div
        id="admit-card-print-sheet"
        className="bg-white border-2 border-black p-4 sm:p-7 print:p-2.5 print:border-2 print:border-black print-card text-black space-y-3 sm:space-y-3.5 print:space-y-1.5 leading-tight"
      >

        {/* 1. Top Warning Box */}
        <div className="border border-black py-1 print:py-0.5 px-2 text-center">
          <span className="font-black text-xs sm:text-sm print:text-xs tracking-wider uppercase">
            ADMIT CARD MUST BE PRINTED IN COLOR ONLY
          </span>
        </div>

        {/* 2. Date and Time of Entrance Test */}
        <div className="border border-black py-1 print:py-0.5 px-3 text-center">
          <span className="text-xs sm:text-[13px] print:text-xs font-bold">
            Date and Time of Entrance Test: <strong className="font-black underline decoration-1 underline-offset-2">{examDate}</strong> &nbsp;&nbsp; Time: <strong className="font-black underline decoration-1 underline-offset-2">{examTime}</strong>
          </span>
        </div>

        {/* 3. Ranking Banner Subtitle */}
        <div className="text-center pt-0.5 print:pt-0">
          <p className="text-[10px] sm:text-[11px] print:text-[9.5px] font-extrabold uppercase tracking-tight text-slate-800">
            RANKED HARYANA&apos;S NO.1 BEST VINTAGE LEGACY BOYS BOARDING SCHOOL BY EDUCATION WORLD FOR THE YEAR 2025-26
          </p>
        </div>

        {/* 4. Institutional Header Section with Dual Logos */}
        <div className="flex items-center justify-between gap-3 pt-1 pb-2 print:pt-0.5 print:pb-1 border-b border-black">
          {/* Left Crest Logo */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 print:w-16 print:h-16 flex-shrink-0 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-gurukul.png"
              alt="Gurukul Crest"
              className="max-h-20 sm:max-h-24 print:max-h-16 max-w-full object-contain"
            />
          </div>

          {/* Center Institutional Details */}
          <div className="flex-1 text-center px-1">
            <h1 className="text-xl sm:text-2xl print:text-lg font-black tracking-tight uppercase leading-none font-serif text-slate-900">
              THE GURUKUL NILOKHERI
            </h1>
            <p className="text-[11px] sm:text-xs print:text-[10px] font-semibold text-slate-700 mt-1 print:mt-0.5">
              Affiliated to C.B.S.E. New Delhi up to 10+2 Level
            </p>
            <div className="mt-1.5 print:mt-1 inline-block border border-black bg-slate-50 text-black text-xs sm:text-sm print:text-xs font-black tracking-wider px-4 py-0.5 print:px-3 print:py-0.2 uppercase">
              ADMIT CARD : 2027-28
            </div>
            <p className="text-[11px] sm:text-xs print:text-[10px] font-bold text-slate-900 mt-1.5 print:mt-0.5 leading-snug">
              Venue for Entrance Test: <span className="uppercase">{venueName}</span>
            </p>
          </div>

          {/* Right Patron Portrait */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 print:w-16 print:h-16 flex-shrink-0 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/gurukul-patron.png"
              alt="Gurukul Patron"
              className="max-h-20 sm:max-h-24 print:max-h-16 max-w-full object-contain rounded-full shadow-sm"
            />
          </div>
        </div>

        {/* 5. Main Section: Candidate Details Table + Dual Photos */}
        <div className="grid grid-cols-1 md:grid-cols-12 print:grid-cols-12 gap-3 print:gap-2 pt-1 print:pt-0.5">
          {/* Candidate's Details Table (Left Side - 9 Columns / 75%) */}
          <div className="md:col-span-9 print:col-span-9">
            <div className="border border-black">
              {/* Details Header Bar */}
              <div className="bg-slate-100 border-b border-black text-center py-1 print:py-0.5 font-black text-xs sm:text-sm print:text-xs uppercase tracking-wider">
                CANDIDATE&apos;S DETAILS
              </div>

              {/* Field Rows */}
              <div className="divide-y divide-black text-[11px] sm:text-xs print:text-[10px]">
                <div className="grid grid-cols-12">
                  <div className="col-span-5 sm:col-span-4 p-1.5 print:py-0.5 print:px-1.5 font-bold border-r border-black bg-slate-50/70">
                    Class Applying For
                  </div>
                  <div className="col-span-7 sm:col-span-8 p-1.5 print:py-0.5 print:px-1.5 font-bold uppercase">
                    {admitCard.classApplying} {admitCard.stream ? `(${admitCard.stream})` : ''}
                  </div>
                </div>

                <div className="grid grid-cols-12">
                  <div className="col-span-5 sm:col-span-4 p-1.5 print:py-0.5 print:px-1.5 font-bold border-r border-black bg-slate-50/70">
                    Registration Number
                  </div>
                  <div className="col-span-7 sm:col-span-8 p-1.5 print:py-0.5 print:px-1.5 font-mono font-bold">
                    {admitCard.applicationNumber}
                  </div>
                </div>

                <div className="grid grid-cols-12">
                  <div className="col-span-5 sm:col-span-4 p-1.5 print:py-0.5 print:px-1.5 font-bold border-r border-black bg-slate-50/70">
                    Roll Number
                  </div>
                  <div className="col-span-7 sm:col-span-8 p-1.5 print:py-0.5 print:px-1.5 font-mono font-black text-sm print:text-xs text-slate-900">
                    {admitCard.rollNumber}
                  </div>
                </div>

                <div className="grid grid-cols-12">
                  <div className="col-span-5 sm:col-span-4 p-1.5 print:py-0.5 print:px-1.5 font-bold border-r border-black bg-slate-50/70">
                    Candidate Name
                  </div>
                  <div className="col-span-7 sm:col-span-8 p-1.5 print:py-0.5 print:px-1.5 font-black uppercase">
                    {admitCard.candidateName}
                  </div>
                </div>

                <div className="grid grid-cols-12">
                  <div className="col-span-5 sm:col-span-4 p-1.5 print:py-0.5 print:px-1.5 font-bold border-r border-black bg-slate-50/70">
                    Father&apos;s Name
                  </div>
                  <div className="col-span-7 sm:col-span-8 p-1.5 print:py-0.5 print:px-1.5 font-bold uppercase">
                    {admitCard.fatherName}
                  </div>
                </div>

                <div className="grid grid-cols-12">
                  <div className="col-span-5 sm:col-span-4 p-1.5 print:py-0.5 print:px-1.5 font-bold border-r border-black bg-slate-50/70">
                    Mother&apos;s Name
                  </div>
                  <div className="col-span-7 sm:col-span-8 p-1.5 print:py-0.5 print:px-1.5 font-bold uppercase">
                    {admitCard.motherName || 'MEENA'}
                  </div>
                </div>

                <div className="grid grid-cols-12">
                  <div className="col-span-5 sm:col-span-4 p-1.5 print:py-0.5 print:px-1.5 font-bold border-r border-black bg-slate-50/70">
                    Name of School Last Attended
                  </div>
                  <div className="col-span-7 sm:col-span-8 p-1.5 print:py-0.5 print:px-1.5 font-medium uppercase">
                    {admitCard.previousSchoolName || 'KL INTERNATIONAL SCHOOL'}
                  </div>
                </div>

                <div className="grid grid-cols-12">
                  <div className="col-span-5 sm:col-span-4 p-1.5 print:py-0.5 print:px-1.5 font-bold border-r border-black bg-slate-50/70">
                    Aadhar No.
                  </div>
                  <div className="col-span-7 sm:col-span-8 p-1.5 print:py-0.5 print:px-1.5 font-mono font-bold">
                    {admitCard.aadhaarNumber || '740766742979'}
                  </div>
                </div>

                <div className="grid grid-cols-12">
                  <div className="col-span-5 sm:col-span-4 p-1.5 print:py-0.5 print:px-1.5 font-bold border-r border-black bg-slate-50/70">
                    Permanent Address of the Student
                  </div>
                  <div className="col-span-7 sm:col-span-8 p-1.5 print:py-0.5 print:px-1.5 uppercase text-[10px] sm:text-[11px] print:text-[9.5px] leading-tight">
                    {admitCard.address || 'HOME NO- 45, KRISHNA GADARN COLONY, THANA- GANGANAGAR, AMEDA ROAD'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Uploaded Candidate Photograph (Col 3 / 25%) */}
          <div className="md:col-span-3 print:col-span-3 flex flex-col justify-center items-center gap-1.5 print:gap-1">
            <div className="w-32 sm:w-36 h-40 sm:h-44 print:w-28 print:h-34 border border-black bg-slate-50 flex items-center justify-center relative overflow-hidden shadow-inner">
              {admitCard.candidatePhotoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={admitCard.candidatePhotoUrl}
                  alt="Candidate Photo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-2 text-[10px] font-bold text-slate-400">
                  Candidate Photo
                </div>
              )}
            </div>
            <span className="text-[9px] print:text-[8px] font-bold uppercase tracking-wider text-slate-600">
              Candidate Photograph
            </span>
          </div>
        </div>

        {/* 6. Signatures Verification Row (Candidate & Invigilator) */}
        <div className="grid grid-cols-2 print:grid-cols-2 gap-8 print:gap-4 pt-3 print:pt-1.5 items-end px-4 print:px-2">
          {/* Candidate's Signature */}
          <div className="text-center">
            <div className="h-14 print:h-9 border-b border-black mx-auto max-w-[200px]"></div>
            <p className="mt-1 print:mt-0.5 font-bold text-[10px] sm:text-xs print:text-[9.5px] uppercase tracking-tight text-slate-900">
              CANDIDATE&apos;S SIGNATURE
            </p>
            <span className="text-[9px] print:text-[8px] text-slate-600 block">
              (To be signed in the presence of Invigilator)
            </span>
          </div>

          {/* Invigilator's Signature & Legal Statement */}
          <div className="text-center">
            <div className="h-14 print:h-9 border-b border-black mx-auto max-w-[220px]"></div>
            <p className="mt-1 print:mt-0.5 font-bold text-[10px] sm:text-xs print:text-[9.5px] uppercase tracking-tight text-slate-900 leading-tight">
              NAME AND SIGNATURE OF INVIGILATOR
            </p>
            <span className="text-[8px] sm:text-[9px] print:text-[7.5px] text-slate-600 block leading-tight mt-0.5">
              (Candidate&apos;s Signature obtained in my presence and photograph verified by me)
            </span>
          </div>
        </div>

        {/* 7. Numbered Instructions Box */}
        <div className="border border-black p-2.5 sm:p-3 print:p-1.5 bg-white mt-2 print:mt-1">
          <h3 className="font-black text-center uppercase text-xs sm:text-[13px] print:text-[11px] tracking-wider mb-1.5 print:mb-0.5">
            ADMIT CARD INSTRUCTIONS FOR THE CANDIDATES
          </h3>
          <ol className="list-decimal list-inside space-y-1 print:space-y-0.5 text-[10px] sm:text-[11px] print:text-[9px] text-slate-900 font-medium leading-relaxed print:leading-tight pl-1 sm:pl-2">
            <li><strong>MANDATORY:</strong> Candidate MUST bring a <strong>COLOURED copy / printout of this Admit Card</strong> to the examination venue (Black &amp; white printouts will NOT be accepted).</li>
            <li><strong>MANDATORY:</strong> Candidate MUST bring <strong>ONE ORIGINAL valid Photo ID Proof</strong> (e.g. Original Aadhaar Card, Passport, or Original School ID Card). Photocopies will not be accepted.</li>
            <li>Please bring Black or Blue Ball point pen and one writing clipboard / cardboard.</li>
            <li>Kindly reach the examination venue at least 45 minutes prior to the reporting time mentioned on this admit card.</li>
          </ol>
        </div>

        {/* 8. Dynamic Bottom Venue Box */}
        <div className="text-center pt-2 print:pt-1 border-t border-black">
          <p className="font-black text-xs sm:text-sm print:text-xs uppercase tracking-wide text-slate-900">
            VENUE: {venueName}
          </p>
          <p className="font-bold text-xs sm:text-sm print:text-[10.5px] text-slate-800 uppercase mt-0.5">
            {venueAddress}
          </p>
        </div>

      </div>
    </div>
  );
}
