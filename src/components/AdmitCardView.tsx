'use client';

import React from 'react';
import Image from 'next/image';
import { Printer, Download, CheckCircle, AlertTriangle, ShieldCheck, MapPin, Clock, Calendar } from 'lucide-react';
import { AdmitCard } from '@/lib/types';

interface AdmitCardViewProps {
  admitCard: AdmitCard;
}

export default function AdmitCardView({ admitCard }: AdmitCardViewProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-6">
      {/* Action Bar (Hidden when printing) */}
      <div className="no-print bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-amber-900 font-bold text-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            Official Admit Card Ready
          </h2>
          <p className="text-xs text-amber-800">
            Please print at least 2 copies of this Hall Ticket on A4 size white paper and carry it to the examination centre.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="bg-gurukul-600 hover:bg-gurukul-700 text-white font-bold px-5 py-2.5 rounded-lg text-sm shadow-md flex items-center gap-2 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save as PDF</span>
          </button>
        </div>
      </div>

      {/* The Printable Hall Ticket Sheet */}
      <div className="bg-white border-2 border-slate-900 shadow-xl rounded-lg p-6 sm:p-8 print:p-4 print:border print:shadow-none print-card text-slate-900">
        {/* Header Section */}
        <div className="border-b-2 border-slate-900 pb-4 mb-5 text-center relative">
          <div className="flex justify-between items-center gap-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 flex items-center justify-center">
              <Image
                src="/logo-gurukul.png"
                alt="Gurukul Crest"
                width={80}
                height={80}
                className="brand-logo-img object-contain"
              />
            </div>

            <div className="flex-1 text-center px-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gurukul-navy">
                GURUKUL KURUKSHETRA
              </h1>
              <p className="text-xs sm:text-sm font-serif font-bold text-gurukul-700">
                तमसो मा ज्योतिर्गमय
              </p>
              <p className="text-[11px] text-slate-600 font-medium">
                (Affiliated to CBSE, New Delhi - Affiliation No. 530006)
              </p>
              <p className="text-[11px] text-slate-500">
                Near 3rd Gate, Kurukshetra University, Kurukshetra, Haryana - 136119
              </p>
              <div className="mt-2 inline-block bg-gurukul-navy text-white text-xs sm:text-sm font-black tracking-wider px-4 py-1 rounded">
                ENTRANCE EXAMINATION (SESSION 2026-27) • ADMIT CARD
              </div>
            </div>

            {/* Barcode representation */}
            <div className="hidden sm:flex flex-col items-center justify-center p-2 border border-slate-300 rounded text-center w-28">
              <div className="w-24 h-8 bg-slate-900 flex items-center justify-center text-[10px] text-white font-mono tracking-widest">
                |||||||||||||
              </div>
              <span className="text-[10px] font-mono mt-1 font-bold">{admitCard.rollNumber}</span>
            </div>
          </div>
        </div>

        {/* Candidate & Exam Coordinates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border border-slate-300 p-4 rounded-lg bg-slate-50 mb-6">
          {/* Main Info Columns (Col 1-3) */}
          <div className="md:col-span-3 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block font-medium">Roll Number:</span>
                <span className="font-mono font-black text-lg text-gurukul-navy">
                  {admitCard.rollNumber}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Application No:</span>
                <span className="font-mono font-bold text-sm text-slate-800">
                  {admitCard.applicationNumber}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Applying For:</span>
                <span className="font-bold text-sm text-gurukul-700 bg-amber-100 px-2 py-0.5 rounded inline-block">
                  {admitCard.classApplying}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block font-medium">Candidate Name:</span>
                <span className="font-bold text-sm text-slate-900 uppercase">
                  {admitCard.candidateName}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Father&apos;s Name:</span>
                <span className="font-bold text-sm text-slate-900">
                  {admitCard.fatherName}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Room / Desk:</span>
                <span className="font-bold text-sm text-slate-900">
                  {admitCard.roomNumber || 'Hall-A'}
                </span>
              </div>
            </div>

            {/* Exam Date & Venue Highlights */}
            <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded border border-slate-200 text-xs">
              <div>
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-gurukul-600" /> Exam Date & Timing:
                </span>
                <p className="font-extrabold text-sm text-gurukul-navy mt-0.5">
                  {admitCard.examDate}
                </p>
                <p className="text-slate-600 text-xs flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3 text-slate-400" />
                  Reporting: {admitCard.reportingTime} ({admitCard.examDuration})
                </p>
              </div>

              <div>
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gurukul-600" /> Examination Centre:
                </span>
                <p className="font-bold text-xs text-slate-900 mt-0.5">
                  {admitCard.examCentreName}
                </p>
                <p className="text-[11px] text-slate-500 leading-tight">
                  {admitCard.examCentreAddress}
                </p>
              </div>
            </div>
          </div>

          {/* Candidate Photo & Sign Box (Col 4) */}
          <div className="flex flex-col items-center justify-between border-t md:border-t-0 md:border-l border-slate-300 pt-3 md:pt-0 md:pl-4">
            <div className="w-28 h-36 border-2 border-dashed border-slate-400 rounded bg-slate-100 flex flex-col items-center justify-center relative overflow-hidden">
              {admitCard.candidatePhotoUrl ? (
                <Image
                  src={admitCard.candidatePhotoUrl}
                  alt="Candidate Photo"
                  fill
                  className="object-cover"
                />
              ) : (
                <span className="text-[10px] text-slate-400 text-center px-1">
                  Affix Passport Size Photo
                </span>
              )}
            </div>
            <div className="w-28 h-10 border border-slate-300 mt-2 bg-white flex items-center justify-center text-[9px] text-slate-400 font-mono">
              Candidate Signature
            </div>
          </div>
        </div>

        {/* Instructions Section */}
        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 mb-6 text-xs text-slate-700">
          <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
            <ShieldCheck className="w-4 h-4 text-gurukul-600" /> Important Instructions for Candidate
          </h3>
          <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
            <li>
              Candidate must report at the examination centre at the specified reporting time (<strong>{admitCard.reportingTime}</strong>). No entry will be permitted after the exam commencement.
            </li>
            <li>
              Bring this printed Admit Card along with original Aadhaar Card or school identity card for physical verification.
            </li>
            <li>
              Use only <strong>Blue or Black Ballpoint Pen</strong> to write answers/darken OMR circles. Pencils, gel pens, or correction fluids are strictly prohibited.
            </li>
            <li>
              Possession of electronic gadgets, mobile phones, digital watches, or calculators inside the examination hall will lead to immediate disqualification.
            </li>
            <li>
              Admissions to Gurukul Kurukshetra are based strictly on merit followed by counseling and physical fitness verification.
            </li>
          </ol>
        </div>

        {/* Signatures & Seal Verification */}
        <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-300 text-center text-xs">
          <div>
            <div className="h-10 border-b border-slate-400 mx-4"></div>
            <p className="mt-1 font-semibold text-slate-600">Candidate&apos;s Signature</p>
            <span className="text-[9px] text-slate-400">(In presence of invigilator)</span>
          </div>
          <div>
            <div className="h-10 border-b border-slate-400 mx-4"></div>
            <p className="mt-1 font-semibold text-slate-600">Invigilator&apos;s Signature</p>
            <span className="text-[9px] text-slate-400">(Exam Room Incharge)</span>
          </div>
          <div>
            <div className="h-10 flex items-center justify-center mx-4">
              <span className="font-serif italic font-bold text-gurukul-800 text-sm">Gurukul Exam Cell</span>
            </div>
            <p className="mt-1 font-bold text-slate-900">Controller of Examinations</p>
            <span className="text-[9px] text-slate-500">Gurukul Kurukshetra</span>
          </div>
        </div>
      </div>
    </div>
  );
}
