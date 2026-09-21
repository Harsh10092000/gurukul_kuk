'use client';

import React from 'react';
import Image from 'next/image';
import { Printer, ArrowLeft, ShieldCheck, FileCheck, CheckSquare, Square } from 'lucide-react';
import Link from 'next/link';
import { Application, AdmitCard } from '@/lib/types';

interface AdmissionFormProps {
  application: Application;
  admitCard?: AdmitCard | null;
  registrationNumber?: string;
  backUrl?: string;
  backLabel?: string;
}

export default function AdmissionFormView({
  application,
  admitCard,
  registrationNumber,
  backUrl,
  backLabel,
}: AdmissionFormProps) {
  const regNo = registrationNumber || application.registrationNumber || application.applicationNumber;
  const rollNo = admitCard?.rollNumber || application.rollNumber || 'PENDING ALLOTMENT';

  const formatDob = (dobStr?: string) => {
    if (!dobStr) return '—';
    const s = dobStr.trim();
    const match = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      return `${match[3]}-${match[2]}-${match[1]}`;
    }
    return s;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto my-6 px-2 sm:px-4 font-sans print:m-0 print:p-0 print:max-w-full">
      {/* Top Action Bar (Hidden on Print) */}
      <div className="flex justify-between items-center portal-card p-3 sm:p-4 mb-5 print:hidden">
        <div className="flex items-center gap-2">
          <Link
            href={backUrl || "/admin/applications"}
            className="btn-secondary text-xs h-8 px-3 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{backLabel || "Admin Applications"}</span>
          </Link>
          <span className="text-slate-300">|</span>
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <span className="bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
              Office Use Only
            </span>
            <span>Admission Scrutiny &amp; Enrolment Dossier</span>
          </span>
        </div>
        <button
          onClick={handlePrint}
          className="btn-primary text-xs h-8 px-4 flex items-center gap-1.5 font-bold"
        >
          <Printer className="w-4 h-4 text-amber-400" />
          <span>Print Office Dossier</span>
        </button>
      </div>

      {/* The Printable A4 Administrative Office Form Sheet */}
      <div className="bg-white border-2 border-black rounded-sm p-4 sm:p-5 print:p-2.5 print:border-2 print:border-black print:shadow-none print-card text-black space-y-2.5 text-[10.5px] leading-tight">
        
        {/* 1. Official Institutional Header */}
        <div className="border-b-2 border-black pb-2 flex items-center justify-between gap-3">
          <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center">
            <Image
              src="/logo-gurukul.png"
              alt="Gurukul Crest"
              width={60}
              height={60}
              className="brand-logo-img object-contain"
            />
          </div>

          <div className="flex-1 text-center">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-black leading-none font-serif">
              THE GURUKUL NILOKHERI
            </h1>
            <p className="text-[11px] font-serif font-black text-slate-800 mt-0.5">
              मा प्रगाम पथो वयम् • CBSE AFFILIATED INSTITUTIONAL NETWORK
            </p>
            <p className="text-[9.5px] text-black font-extrabold uppercase tracking-wide mt-0.5">
              CENTRAL ADMISSION CELL &amp; SCRUTINY BOARD • SESSION 2027-28
            </p>
            <div className="mt-1 bg-black text-white text-[10px] font-black tracking-widest uppercase py-0.5 px-3 rounded-none inline-block">
              OFFICIAL ADMISSION SCRUTINY &amp; ENROLMENT RECORD (OFFICE USE ONLY)
            </div>
          </div>

          {/* Right Patron Portrait */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 print:w-16 print:h-16 flex-shrink-0 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/gurukul-patron.png"
              alt="Gurukul Patron"
              className="max-h-16 sm:max-h-20 print:max-h-16 max-w-full object-contain rounded-full shadow-xs"
            />
          </div>
        </div>

        {/* 2. Key Identification Strip */}
        <div className="grid grid-cols-4 gap-2 border border-black bg-slate-100 p-1.5 text-[9.5px]">
          <div>
            <span className="text-slate-600 block text-[8px] uppercase font-bold">Registration ID:</span>
            <span className="font-mono font-black text-xs text-black">{regNo}</span>
          </div>
          <div>
            <span className="text-slate-600 block text-[8px] uppercase font-bold">Entrance Roll No:</span>
            <span className="font-mono font-black text-xs text-black">{rollNo}</span>
          </div>
          <div>
            <span className="text-slate-600 block text-[8px] uppercase font-bold">Class &amp; Stream:</span>
            <span className="font-black text-xs text-black">
              Class {application.classApplying}{application.stream ? ` (${application.stream})` : ''}
            </span>
          </div>
          <div>
            <span className="text-slate-600 block text-[8px] uppercase font-bold">Category &amp; Gender:</span>
            <span className="font-bold text-xs text-black">
              {application.personalInfo?.category || 'General'} • {application.personalInfo?.gender || '—'}
            </span>
          </div>
        </div>

        {/* 3. Grid: Candidate Dossier (Left 9 cols) + Affixed Photos/Signs (Right 3 cols) */}
        <div className="grid grid-cols-12 gap-2.5 items-start">
          <div className="col-span-9 space-y-2">
            
            {/* Section A: Candidate Particulars */}
            <div>
              <div className="bg-slate-200 border border-black px-2 py-0.5 font-black text-[10px] uppercase tracking-wide flex justify-between">
                <span>1. Candidate Identification Particulars</span>
                <span className="font-mono text-[9px]">Verified Office Record</span>
              </div>
              <div className="border-x border-b border-black p-1.5 grid grid-cols-3 gap-x-2 gap-y-1">
                <div>
                  <span className="text-slate-600 block text-[8.5px]">Full Name:</span>
                  <span className="font-black text-[10.5px] uppercase">{application.personalInfo?.fullName || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-600 block text-[8.5px]">Date of Birth:</span>
                  <span className="font-bold">{formatDob(application.personalInfo?.dob)}</span>
                </div>
                <div>
                  <span className="text-slate-600 block text-[8.5px]">Aadhaar Number:</span>
                  <span className="font-mono font-bold">{application.personalInfo?.aadhaarNumber || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-600 block text-[8.5px]">PEN (Permanent Education No):</span>
                  <span className="font-mono font-semibold">{application.personalInfo?.panNumber || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-600 block text-[8.5px]">Family ID / PPP:</span>
                  <span className="font-mono font-semibold">{application.personalInfo?.familyId || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-600 block text-[8.5px]">Primary Contact Phone:</span>
                  <span className="font-mono font-bold">{application.personalInfo?.candidateMobile || application.personalInfo?.whatsappNumber || '—'}</span>
                </div>
              </div>
            </div>

            {/* Section B: Parent / Guardian Record */}
            <div>
              <div className="bg-slate-200 border border-black px-2 py-0.5 font-black text-[10px] uppercase tracking-wide">
                2. Parent / Guardian Office Record
              </div>
              <div className="border-x border-b border-black p-1.5 grid grid-cols-3 gap-x-2 gap-y-1">
                <div>
                  <span className="text-slate-600 block text-[8.5px]">Father&apos;s Name:</span>
                  <span className="font-bold uppercase">{application.parentInfo?.fatherName || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-600 block text-[8.5px]">Father&apos;s Occupation:</span>
                  <span className="font-medium">{application.parentInfo?.fatherOccupation || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-600 block text-[8.5px]">Father&apos;s Mobile:</span>
                  <span className="font-mono font-bold">{application.parentInfo?.fatherPhone || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-600 block text-[8.5px]">Mother&apos;s Name:</span>
                  <span className="font-bold uppercase">{application.parentInfo?.motherName || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-600 block text-[8.5px]">Mother&apos;s Occupation:</span>
                  <span className="font-medium">{application.parentInfo?.motherOccupation || 'Housewife'}</span>
                </div>
                <div>
                  <span className="text-slate-600 block text-[8.5px]">Annual Family Income:</span>
                  <span className="font-bold">{application.parentInfo?.annualIncome || '—'}</span>
                </div>
              </div>
            </div>

            {/* Section C: Permanent Address */}
            <div>
              <div className="bg-slate-200 border border-black px-2 py-0.5 font-black text-[10px] uppercase tracking-wide">
                3. Permanent Residential Address
              </div>
              <div className="border-x border-b border-black p-1.5 grid grid-cols-4 gap-x-2 gap-y-1">
                <div className="col-span-2">
                  <span className="text-slate-600 block text-[8.5px]">Address Line:</span>
                  <span className="font-medium uppercase text-[9.5px]">{application.addressInfo?.streetAddress || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-600 block text-[8.5px]">District, State:</span>
                  <span className="font-bold uppercase">{application.addressInfo?.district}, {application.addressInfo?.state}</span>
                </div>
                <div>
                  <span className="text-slate-600 block text-[8.5px]">PIN Code:</span>
                  <span className="font-mono font-bold">{application.addressInfo?.pincode || '—'}</span>
                </div>
              </div>
            </div>

            {/* Section D: Academic Record & Campus Preference */}
            <div>
              <div className="bg-slate-200 border border-black px-2 py-0.5 font-black text-[10px] uppercase tracking-wide">
                4. Academic History &amp; Study Campus Allotment
              </div>
              <div className="border-x border-b border-black p-1.5 grid grid-cols-2 gap-x-2 gap-y-1">
                <div>
                  <span className="text-slate-600 block text-[8.5px]">Previous School Name:</span>
                  <span className="font-semibold uppercase">{application.personalInfo?.previousSchoolName || application.academicInfo?.previousSchoolName || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-600 block text-[8.5px]">Previous Board:</span>
                  <span className="font-semibold uppercase">
                    {application.personalInfo?.previousBoard || application.academicInfo?.previousBoard || 'CBSE'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600 block text-[8.5px]">1st Campus Preference:</span>
                  <span className="font-bold text-black">{application.studyLocation?.firstPreference || 'Gurukul Nilokheri'}</span>
                </div>
                <div>
                  <span className="text-slate-600 block text-[8.5px]">2nd Campus Preference:</span>
                  <span className="font-medium text-slate-800">{application.studyLocation?.secondPreference || 'None'}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Right 3 Cols: Candidate Photo & Signatures */}
          <div className="col-span-3 flex flex-col items-center space-y-2 border border-black p-1.5 bg-slate-50">
            <span className="text-[8px] font-black uppercase text-slate-700 tracking-tight">
              AFFIXED PHOTOGRAPH
            </span>
            <div className="w-24 h-32 border-2 border-black bg-white flex flex-col items-center justify-center relative overflow-hidden">
              {application.documents?.photo ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={application.documents.photo}
                  alt="Candidate"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[8px] text-slate-400 text-center px-1 font-bold">Candidate Photo</span>
              )}
            </div>

            <div className="w-full">
              <span className="text-[7.5px] font-bold text-slate-700 block uppercase text-center">Candidate Signature</span>
              <div className="w-full h-9 border border-black bg-white flex items-center justify-center p-0.5">
                {application.documents?.signature ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={application.documents.signature}
                    alt="Candidate Sign"
                    className="max-h-8 w-auto object-contain"
                  />
                ) : (
                  <span className="text-[7px] text-slate-400">Specimen Signature</span>
                )}
              </div>
            </div>

            <div className="w-full">
              <span className="text-[7.5px] font-bold text-slate-700 block uppercase text-center">Parent Signature</span>
              <div className="w-full h-9 border border-black bg-white flex items-center justify-center p-0.5">
                {application.documents?.parentSignature ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={application.documents.parentSignature}
                    alt="Parent Sign"
                    className="max-h-8 w-auto object-contain"
                  />
                ) : (
                  <span className="text-[7px] text-slate-400">Specimen Signature</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 4. Official Document Scrutiny & Verification Checklist (4 Registration Documents) */}
        <div className="border border-black">
          <div className="bg-slate-200 border-b border-black px-2 py-1 font-black text-[10px] uppercase tracking-wide flex justify-between items-center">
            <span>5. Office Document Verification &amp; Scrutiny Checklist</span>
            <span className="text-[8.5px] font-bold text-slate-700">4 Registration Documents • To be verified by Scrutiny Officer</span>
          </div>

          <table className="w-full text-[9.5px] border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-black text-left font-black">
                <th className="p-1.5 border-r border-black w-8 text-center">Sr.</th>
                <th className="p-1.5 border-r border-black">Document / Registration Credential</th>
                <th className="p-1.5 border-r border-black w-36 text-center">Status</th>
                <th className="p-1.5 w-52">Officer Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black font-medium">
              <tr className="h-9">
                <td className="p-1.5 border-r border-black text-center font-mono font-bold">1</td>
                <td className="p-1.5 border-r border-black font-semibold">Candidate Recent Coloured Photograph</td>
                <td className="p-1.5 border-r border-black text-center"></td>
                <td className="p-1.5"></td>
              </tr>
              <tr className="h-9">
                <td className="p-1.5 border-r border-black text-center font-mono font-bold">2</td>
                <td className="p-1.5 border-r border-black font-semibold">Candidate Specimen Signature</td>
                <td className="p-1.5 border-r border-black text-center"></td>
                <td className="p-1.5"></td>
              </tr>
              <tr className="h-9">
                <td className="p-1.5 border-r border-black text-center font-mono font-bold">3</td>
                <td className="p-1.5 border-r border-black font-semibold">Parent / Guardian Signature</td>
                <td className="p-1.5 border-r border-black text-center"></td>
                <td className="p-1.5"></td>
              </tr>
              <tr className="h-9">
                <td className="p-1.5 border-r border-black text-center font-mono font-bold">4</td>
                <td className="p-1.5 border-r border-black font-semibold">Candidate Aadhaar Card / Valid Photo ID Proof</td>
                <td className="p-1.5 border-r border-black text-center"></td>
                <td className="p-1.5"></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 5. Accounts & Entrance Fee Verification Section */}
        <div className="border border-black bg-slate-50 p-2 text-[9px] space-y-1">
          <div className="flex justify-between items-center border-b border-black pb-1">
            <span className="font-black uppercase tracking-wider text-black text-[9.5px]">
              6. Accounts Branch Counterfoil &amp; Registration Fee Audit
            </span>
            <span className="font-mono text-black font-bold">Registration ID: {regNo}</span>
          </div>
          <div className="grid grid-cols-4 gap-2 font-mono text-[9px] pt-0.5">
            <div>
              <span className="text-slate-600 block text-[8px]">Fee Amount:</span>
              <strong className="text-black text-[10px]">₹{application.amountPaid || 800}.00 (PAID)</strong>
            </div>
            <div>
              <span className="text-slate-600 block text-[8px]">Transaction ID:</span>
              <strong className="text-black truncate block text-[9.5px]" title={application.paymentInfo?.transactionId || application.transactionId}>
                {application.paymentInfo?.transactionId || application.transactionId || 'PAID-ONLINE'}
              </strong>
            </div>
            <div>
              <span className="text-slate-600 block text-[8px]">Payment Mode:</span>
              <strong className="text-black">Online / Razorpay</strong>
            </div>
            <div>
              <span className="text-slate-600 block text-[8px]">Fee Reconciliation:</span>
              <strong className="text-black uppercase">AUDITED &amp; CONFIRMED</strong>
            </div>
          </div>
        </div>

        {/* 6. Multi-Officer Approval Desk & Institutional Sanction */}
        <div className="border-2 border-black p-2 bg-white space-y-2">
          <div className="text-[9px] font-black uppercase tracking-wider border-b border-black pb-0.5 text-center">
            7. Official Scrutiny Board &amp; Admission Committee Sanction
          </div>

          <div className="grid grid-cols-4 gap-2 pt-2 text-center text-[8.5px] items-end">
            <div>
              <div className="h-10 border-b border-black mx-auto max-w-[120px]"></div>
              <span className="font-black text-black block mt-1 uppercase text-[8px]">
                Scrutiny Officer
              </span>
              <span className="text-[7.5px] text-slate-600 block">Name &amp; Signature</span>
            </div>

            <div>
              <div className="h-10 border-b border-black mx-auto max-w-[120px]"></div>
              <span className="font-black text-black block mt-1 uppercase text-[8px]">
                Exam Board Convener
              </span>
              <span className="text-[7.5px] text-slate-600 block">Signature &amp; Date</span>
            </div>

            <div>
              <div className="h-10 border-b border-black mx-auto max-w-[120px]"></div>
              <span className="font-black text-black block mt-1 uppercase text-[8px]">
                Hostel Proctor / Warden
              </span>
              <span className="text-[7.5px] text-slate-600 block">Residential Fitness</span>
            </div>

            <div>
              <div className="h-10 border-b border-black mx-auto max-w-[130px] flex items-center justify-center pb-0.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/principal-signature.png" alt="Principal Signature" className="max-h-9 w-auto object-contain" />
              </div>
              <span className="font-black text-black block mt-1 uppercase text-[8px]">
                Principal / Director
              </span>
              <span className="text-[7.5px] text-slate-600 block">Official Seal &amp; Approval</span>
            </div>
          </div>
        </div>

        {/* Confidentiality Footer */}
        <div className="text-[8px] text-center text-slate-600 border-t border-black pt-1">
          CONFIDENTIAL OFFICE RECORD • GURUKUL EXAMINATION &amp; ADMISSION ADMINISTRATION • ARCHIVAL RETENTION: 5 YEARS
        </div>

      </div>
    </div>
  );
}
