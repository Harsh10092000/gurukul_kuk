'use client';

import React from 'react';
import Image from 'next/image';
import { Printer, ArrowLeft, Download, ShieldCheck, Award } from 'lucide-react';
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto my-6 px-2 sm:px-4 font-sans print:m-0 print:p-0 print:max-w-full">
      {/* Top Action Bar (Hidden on Print) */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 print:hidden">
        <div className="flex items-center gap-2">
          <Link
            href={backUrl || "/dashboard"}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition flex items-center gap-1.5 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{backLabel || "Dashboard"}</span>
          </Link>
          <span className="text-slate-300">|</span>
          <span className="text-xs font-bold text-slate-700">Official Admission Form (A4)</span>
        </div>
        <button
          onClick={handlePrint}
          className="bg-gurukul-navy hover:bg-slate-900 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow transition flex items-center gap-2"
        >
          <Printer className="w-4 h-4 text-amber-400" />
          <span>Print / Save as PDF</span>
        </button>
      </div>

      {/* The Printable A4 One-Page Form Sheet */}
      <div className="bg-white border-2 border-slate-900 rounded-lg p-6 print:p-3 print:border print:shadow-none print-card text-slate-900 space-y-3 text-[11px] leading-tight">
        {/* Institutional Header */}
        <div className="border-b-2 border-slate-900 pb-2 flex items-center justify-between gap-3">
          <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center">
            <Image
              src="/logo-gurukul.png"
              alt="Gurukul Crest"
              width={64}
              height={64}
              className="brand-logo-img object-contain"
            />
          </div>

          <div className="flex-1 text-center">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gurukul-navy leading-none">
              GURUKUL KURUKSHETRA
            </h1>
            <p className="text-[11px] font-serif font-bold text-gurukul-700 mt-0.5">
              तमसो मा ज्योतिर्गमय • Established 1912 by Swami Shraddhanand Ji
            </p>
            <p className="text-[10px] text-slate-600 font-medium">
              CBSE Affiliation No. 530006 • Near 3rd Gate, Kurukshetra University, Kurukshetra (Haryana) - 136119
            </p>
            <div className="mt-1 bg-gurukul-navy text-white text-[11px] font-black tracking-wider uppercase py-0.5 px-3 rounded inline-block">
              Official Admission Verification & Enrolment Form (Session 2026-27)
            </div>
          </div>

          {/* Verification Stamp placeholder */}
          <div className="w-20 h-20 border border-slate-400 rounded bg-slate-50 flex flex-col items-center justify-center text-center p-1 text-[8px] font-bold text-slate-500 flex-shrink-0">
            <span>OFFICIAL STAMP</span>
            <span>& VERIFICATION</span>
          </div>
        </div>

        {/* Identification Strip */}
        <div className="grid grid-cols-4 gap-2 bg-slate-100 p-2 rounded border border-slate-300 text-[10px]">
          <div>
            <span className="text-slate-500 block">Registration No:</span>
            <span className="font-mono font-black text-xs text-gurukul-navy">{regNo}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Entrance Roll No:</span>
            <span className="font-mono font-black text-xs text-amber-900">{rollNo}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Class Seeking Admission:</span>
            <span className="font-black text-xs text-slate-900">{application.classApplying}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Social Category:</span>
            <span className="font-bold text-xs text-slate-900">{application.personalInfo?.category || 'General'}</span>
          </div>
        </div>

        {/* Grid: Details (Left 75%) + Photo & Signature (Right 25%) */}
        <div className="grid grid-cols-12 gap-3 items-start">
          <div className="col-span-9 space-y-2.5">
            {/* Section A: Candidate Particulars */}
            <div>
              <h3 className="font-black text-[11px] bg-slate-200 px-2 py-0.5 uppercase tracking-wide text-gurukul-navy mb-1">
                1. Candidate Particulars
              </h3>
              <div className="grid grid-cols-3 gap-x-2 gap-y-1">
                <div>
                  <span className="text-slate-500 block text-[9px]">Full Name:</span>
                  <span className="font-bold">{application.personalInfo?.fullName || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px]">Date of Birth:</span>
                  <span className="font-semibold">{application.personalInfo?.dob || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px]">Gender / Blood Group:</span>
                  <span className="font-semibold">{application.personalInfo?.gender} / {application.personalInfo?.bloodGroup || 'B+'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px]">Aadhaar Number:</span>
                  <span className="font-mono font-semibold">{application.personalInfo?.aadhaarNumber || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px]">Nationality / Religion:</span>
                  <span className="font-semibold">{application.personalInfo?.nationality || 'Indian'} / {application.personalInfo?.religion || 'Hindu'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px]">Registered Mobile No:</span>
                  <span className="font-mono font-semibold">{application.personalInfo?.candidateMobile || application.personalInfo?.whatsappNumber || '—'}</span>
                </div>
              </div>
            </div>

            {/* Section B: Parent Particulars */}
            <div>
              <h3 className="font-black text-[11px] bg-slate-200 px-2 py-0.5 uppercase tracking-wide text-gurukul-navy mb-1">
                2. Parent / Guardian Particulars
              </h3>
              <div className="grid grid-cols-3 gap-x-2 gap-y-1">
                <div>
                  <span className="text-slate-500 block text-[9px]">Father&apos;s Name:</span>
                  <span className="font-bold">{application.parentInfo?.fatherName || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px]">Father&apos;s Occupation:</span>
                  <span className="font-semibold">{application.parentInfo?.fatherOccupation || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px]">Father&apos;s Mobile:</span>
                  <span className="font-mono font-semibold">{application.parentInfo?.fatherPhone || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px]">Mother&apos;s Name:</span>
                  <span className="font-bold">{application.parentInfo?.motherName || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px]">Mother&apos;s Occupation:</span>
                  <span className="font-semibold">{application.parentInfo?.motherOccupation || 'Not Specified'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px]">Annual Family Income:</span>
                  <span className="font-bold text-gurukul-700">{application.parentInfo?.annualIncome || '—'}</span>
                </div>
              </div>
            </div>

            {/* Section C: Permanent Address */}
            <div>
              <h3 className="font-black text-[11px] bg-slate-200 px-2 py-0.5 uppercase tracking-wide text-gurukul-navy mb-1">
                3. Permanent Residential Address
              </h3>
              <div className="grid grid-cols-4 gap-x-2 gap-y-1">
                <div className="col-span-2">
                  <span className="text-slate-500 block text-[9px]">Street Address / House No:</span>
                  <span className="font-semibold">{application.addressInfo?.streetAddress || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px]">District, State:</span>
                  <span className="font-semibold">{application.addressInfo?.district}, {application.addressInfo?.state}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px]">PIN Code:</span>
                  <span className="font-mono font-semibold">{application.addressInfo?.pincode}</span>
                </div>
              </div>
            </div>

            {/* Section D: Previous Academic Record */}
            <div>
              <h3 className="font-black text-[11px] bg-slate-200 px-2 py-0.5 uppercase tracking-wide text-gurukul-navy mb-1">
                4. Academic History & Performance
              </h3>
              <div className="grid grid-cols-4 gap-x-2 gap-y-1">
                <div className="col-span-2">
                  <span className="text-slate-500 block text-[9px]">Previous School:</span>
                  <span className="font-semibold">{application.academicInfo?.previousSchoolName || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px]">Board / Passing Year:</span>
                  <span className="font-semibold">{application.academicInfo?.previousBoard} ({application.academicInfo?.passingYear || '2025'})</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px]">Marks / Aggregate %:</span>
                  <span className="font-black text-gurukul-700">{application.academicInfo?.previousClassMarksPercentage}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Photo & Signature Box */}
          <div className="col-span-3 flex flex-col items-center justify-between space-y-2">
            <div className="w-28 h-36 border-2 border-slate-400 rounded bg-slate-50 flex flex-col items-center justify-center relative overflow-hidden">
              {application.documents?.photo ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={application.documents.photo}
                  alt="Candidate"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[9px] text-slate-400 text-center px-1">Candidate Passport Photo</span>
              )}
            </div>

            <div className="w-28 h-12 border border-slate-400 rounded bg-white flex flex-col items-center justify-center p-0.5">
              {application.documents?.signature ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={application.documents.signature}
                  alt="Sign"
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-[8px] text-slate-400">Candidate Signature</span>
              )}
            </div>

            <div className="w-28 h-10 border border-slate-300 rounded bg-slate-50 flex items-center justify-center text-[8px] text-slate-400 text-center px-1">
              Parent Signature
            </div>
          </div>
        </div>

        {/* Section E: Undertaking & Declaration */}
        <div className="border-t border-slate-300 pt-1.5 text-[9px] text-slate-700 space-y-1">
          <p className="font-bold uppercase text-[9px] text-slate-900">Declaration by Student and Parent:</p>
          <p className="leading-snug">
            We hereby declare that all statements made in this application are true and correct. If admitted to Gurukul Kurukshetra, the candidate shall strictly abide by the rules, Vedic code of conduct, daily sandhya, yoga routine, and residential discipline of the Gurukul. We acknowledge that admission is strictly merit-based and no donation/capitation fee is accepted.
          </p>
          <div className="flex justify-between pt-4 px-2 font-bold text-[9px]">
            <span>Date: ________________</span>
            <span>Signature of Candidate</span>
            <span>Signature of Father / Guardian</span>
          </div>
        </div>

        {/* Section F: FOR OFFICE USE ONLY (Admission Cell) */}
        <div className="border-2 border-dashed border-slate-500 bg-slate-50 p-2.5 rounded space-y-1.5 text-[9.5px]">
          <div className="flex justify-between items-center border-b border-slate-300 pb-1">
            <span className="font-black uppercase tracking-wider text-gurukul-navy">
              FOR OFFICIAL USE ONLY (Gurukul Kurukshetra Admission Cell)
            </span>
            <span className="text-[9px] text-slate-500 font-mono">Form Ref: {regNo}</span>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-0.5 font-mono">
            <div>
              <span className="text-slate-500 block text-[8.5px]">Allotted Admission No:</span>
              <span className="font-bold border-b border-dotted border-slate-400 block min-h-[16px]"></span>
            </div>
            <div>
              <span className="text-slate-500 block text-[8.5px]">Scholar Register No:</span>
              <span className="font-bold border-b border-dotted border-slate-400 block min-h-[16px]"></span>
            </div>
            <div>
              <span className="text-slate-500 block text-[8.5px]">Application Fee Receipt:</span>
              <span className="font-bold text-slate-900">PAID (₹1,200)</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[8.5px]">Admission Status:</span>
              <span className="font-bold text-emerald-700">VERIFIED / PROVISIONAL</span>
            </div>
          </div>

          <div className="flex justify-between pt-4 px-2 font-bold text-[8.5px] border-t border-slate-200 mt-2">
            <span>Scrutiny Clerk Sign: __________________</span>
            <span>Exam Controller Sign: __________________</span>
            <span>Director / Principal Signature & Seal: __________________</span>
          </div>
        </div>
      </div>
    </div>
  );
}
