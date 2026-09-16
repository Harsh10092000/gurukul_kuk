'use client';

import React from 'react';
import Image from 'next/image';
import { Printer, Award, CheckCircle, Calendar, MapPin, FileCheck, Shield } from 'lucide-react';
import { ExamResult } from '@/lib/types';

interface ScorecardViewProps {
  result: ExamResult;
}

export default function ScorecardView({ result }: ScorecardViewProps) {
  const handlePrint = () => {
    window.print();
  };

  const isQualified = result.qualifyingStatus === 'Qualified for Admission';
  const isGirlsWing =
    result.applicationNumber?.startsWith('NILG-') ||
    (result as any).gender === 'Female' ||
    (result as any).categoryWing?.includes('Girls') ||
    (result as any).campus?.toLowerCase().includes('aryakulam');

  return (
    <div className="w-full max-w-4xl mx-auto my-6">
      {/* Top Banner & Print Trigger (Hidden on print) */}
      <div className="no-print bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-amber-900 font-bold text-lg flex items-center gap-2">
            <Award className="w-5 h-5 text-gurukul-600" />
            Official Entrance Result &amp; Scorecard (2026-27)
          </h2>
          <p className="text-xs text-amber-800">
            Official merit assessment result for Gurukul Kurukshetra Entrance Examination • {isGirlsWing ? 'Aryakulam Nilokheri (Girls Wing)' : 'Gurukul Nilokheri & Jyotisar (Boys Wing)'}.
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="bg-gurukul-600 hover:bg-gurukul-700 text-white font-bold px-5 py-2.5 rounded-lg text-sm shadow-md flex items-center gap-2 transition"
        >
          <Printer className="w-4 h-4" />
          <span>Print Scorecard</span>
        </button>
      </div>

      {/* Official Scorecard Document */}
      <div className="bg-white border-2 border-slate-900 shadow-xl rounded-lg p-6 sm:p-8 print:p-4 print:border print:shadow-none print-card text-slate-900">
        {/* Header */}
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
                {isGirlsWing ? 'ARYAKULAM NILOKHERI' : 'GURUKUL KURUKSHETRA'}
              </h1>
              <p className="text-xs sm:text-sm font-serif font-bold text-gurukul-700">
                तमसो मा ज्योतिर्गमय
              </p>
              <p className="text-[11px] text-slate-600 font-medium">
                (Affiliated to CBSE New Delhi - Affiliation No. 530006)
              </p>
              <div className="mt-2 inline-block bg-gurukul-navy text-white text-xs sm:text-sm font-black tracking-wider px-4 py-1 rounded">
                ENTRANCE EXAMINATION RESULT &amp; MERIT SCORECARD • 2026-27
              </div>
            </div>

            {/* Rank Badge */}
            <div className="flex flex-col items-center justify-center p-3 bg-amber-50 border-2 border-amber-300 rounded-lg text-center w-24 sm:w-28">
              <span className="text-[10px] uppercase font-bold text-amber-900">
                {isGirlsWing ? 'Girls Rank' : 'Boys Rank'}
              </span>
              <span className="text-xl sm:text-2xl font-black text-gurukul-600">#{result.rank}</span>
            </div>
          </div>
        </div>

        {/* Candidate Profile Details */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-50 border border-slate-200 p-4 rounded-lg mb-6 text-xs">
          <div>
            <span className="text-slate-500 block">Candidate Name:</span>
            <span className="font-bold text-sm text-slate-900 uppercase">{result.candidateName}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Roll Number:</span>
            <span className="font-mono font-black text-sm text-gurukul-navy">{result.rollNumber}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Application No:</span>
            <span className="font-mono font-bold text-sm text-slate-800">{result.applicationNumber}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Class Applied:</span>
            <span className="font-bold text-sm text-gurukul-700 bg-amber-100 px-2 py-0.5 rounded inline-block">
              {result.classApplying}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Category / Wing:</span>
            <span className={`font-bold text-xs px-2.5 py-0.5 rounded inline-block ${isGirlsWing ? 'bg-pink-100 text-pink-900' : 'bg-blue-100 text-blue-900'}`}>
              {isGirlsWing ? 'Girls Wing' : 'Boys Wing'}
            </span>
          </div>
        </div>

        {/* Marks Breakdown Table */}
        <div className="border border-slate-300 rounded-lg overflow-hidden mb-6">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Subject / Section</th>
                <th className="py-2.5 px-4 text-center">Maximum Marks</th>
                <th className="py-2.5 px-4 text-center">Marks Obtained</th>
                <th className="py-2.5 px-4 text-center">Percentage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {result.subjects.map((sub, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-medium text-slate-900">{sub.subject}</td>
                  <td className="py-2.5 px-4 text-center text-slate-600">{sub.maxMarks}</td>
                  <td className="py-2.5 px-4 text-center font-bold text-slate-900">{sub.marksObtained}</td>
                  <td className="py-2.5 px-4 text-center font-mono text-slate-600">
                    {((sub.marksObtained / sub.maxMarks) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-100 font-bold text-slate-900 text-sm">
                <td className="py-3 px-4">Aggregate Total</td>
                <td className="py-3 px-4 text-center">{result.maxTotalMarks}</td>
                <td className="py-3 px-4 text-center text-gurukul-600 text-base">{result.totalMarks}</td>
                <td className="py-3 px-4 text-center text-gurukul-600 text-base">{result.percentage}%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Result Status Notice */}
        <div className={`p-4 rounded-lg border mb-6 flex items-start gap-3 ${
          isQualified 
            ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
            : 'bg-amber-50 border-amber-300 text-amber-950'
        }`}>
          <CheckCircle className={`w-6 h-6 flex-shrink-0 mt-0.5 ${isQualified ? 'text-emerald-600' : 'text-amber-600'}`} />
          <div className="space-y-1">
            <h4 className="font-extrabold text-sm uppercase tracking-wide">
              Result Status: {result.qualifyingStatus}
            </h4>
            <p className="text-xs leading-relaxed">
              {isQualified
                ? `Congratulations! You have qualified for admission counseling to Gurukul Kurukshetra for ${result.classApplying}. Please report with original documents as per the schedule below.`
                : 'You are placed in the Waiting List. Vacancy-based allotment will be announced after the first round of counseling.'}
            </p>
          </div>
        </div>

        {/* Counseling & Document Verification Schedule */}
        {isQualified && result.counselingDate && (
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 mb-6 text-xs text-slate-700 space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
              <Calendar className="w-4 h-4 text-gurukul-600" /> Admission Counseling & Physical Fitness Schedule
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-slate-500 block">Reporting Date & Time:</span>
                <span className="font-bold text-slate-900 text-sm">{result.counselingDate}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Counseling Venue:</span>
                <span className="font-bold text-slate-900 text-sm">{result.counselingVenue || 'Main Admin Block, Gurukul Kurukshetra'}</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-200">
              <span className="font-bold text-slate-800 block mb-1">Documents to bring in original:</span>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600">
                <li>Original Transfer Certificate (TC) from recognized school</li>
                <li>Previous Class Marksheet & Report Card</li>
                <li>Original Aadhaar Card (Student & Parents)</li>
                <li>Recent 6 passport size photographs of student in white shirt</li>
                <li>Medical fitness certificate from Registered Medical Practitioner</li>
              </ul>
            </div>
          </div>
        )}

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-300 text-center text-xs">
          <div>
            <div className="h-10 flex items-center justify-center mx-4">
              <span className="font-serif italic font-semibold text-slate-700">Exam Verification Committee</span>
            </div>
            <p className="font-semibold text-slate-700">Convener, Admission Cell</p>
          </div>
          <div>
            <div className="h-10 flex items-center justify-center mx-4">
              <span className="font-serif italic font-bold text-gurukul-800 text-base">Controller of Examinations</span>
            </div>
            <p className="font-bold text-slate-900">Principal & Director</p>
            <span className="text-[10px] text-slate-500">Gurukul Kurukshetra</span>
          </div>
        </div>
      </div>
    </div>
  );
}
