'use client';

import React, { useState, useEffect } from 'react';
import { Printer, Building, Loader2 } from 'lucide-react';

export default function AdminAttendancePage() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedWing, setSelectedWing] = useState<'all' | 'boys' | 'girls'>('all');
  const [officialCentre, setOfficialCentre] = useState('THE GURUKUL JYOTISAR PEHOWA ROAD, KURUKSHETRA');
  const [officialVenueAddress, setOfficialVenueAddress] = useState('136119, Haryana');
  const [officialExamDate, setOfficialExamDate] = useState('21 March 2027');
  const [officialExamTime, setOfficialExamTime] = useState('9:30 AM');

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) {
          if (data.settings.examVenueName) setOfficialCentre(data.settings.examVenueName);
          if (data.settings.examVenueAddress) setOfficialVenueAddress(data.settings.examVenueAddress);
          if (data.settings.entranceExamDate) setOfficialExamDate(data.settings.entranceExamDate);
          if (data.settings.entranceExamTime) setOfficialExamTime(data.settings.entranceExamTime);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    const [classVal, streamVal] = selectedClass.includes('|')
      ? selectedClass.split('|')
      : [selectedClass, ''];

    let url = `/api/admin/attendance?`;
    if (classVal) url += `class=${encodeURIComponent(classVal)}&`;
    if (streamVal) url += `stream=${encodeURIComponent(streamVal)}&`;
    if (selectedWing !== 'all') url += `gender=${encodeURIComponent(selectedWing)}&`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          setCandidates(data.candidates || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedClass, selectedWing]);

  const handlePrintWing = (wing: 'all' | 'boys' | 'girls') => {
    setSelectedWing(wing);
    setTimeout(() => {
      window.print();
    }, 400);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner (Hidden on Print) */}
      <div className="portal-card p-6 flex flex-col lg:flex-row justify-between lg:items-center gap-4 print:hidden">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-portal-navy bg-slate-100 px-2.5 py-0.5 rounded">
            Examination Desk • Session 2027-28
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Entrance Examination Attendance Registers
          </h1>
          <p className="text-xs text-slate-500">
            Generate printable invigilator attendance sheets separated for Boys Wing and Girls Wing.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handlePrintWing('boys')}
            className="btn-secondary text-xs px-3.5 py-2 font-medium"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Boys Sheet</span>
          </button>
          <button
            type="button"
            onClick={() => handlePrintWing('girls')}
            className="btn-secondary text-xs px-3.5 py-2 font-medium"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Girls Sheet</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-primary text-xs px-4 py-2 font-medium"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Current Sheet</span>
          </button>
        </div>
      </div>

      {/* Category Tabs & Filters (Hidden on Print) */}
      <div className="space-y-3 print:hidden">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="text-slate-500 mr-1 text-[11px] uppercase tracking-wider">Wing:</span>
          <button
            type="button"
            onClick={() => setSelectedWing('all')}
            className={`px-3 py-1.5 rounded-lg transition ${
              selectedWing === 'all'
                ? 'bg-portal-navy text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Candidates
          </button>
          <button
            type="button"
            onClick={() => setSelectedWing('boys')}
            className={`px-3 py-1.5 rounded-lg transition ${
              selectedWing === 'boys'
                ? 'bg-portal-navy text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Boys Attendance Sheet
          </button>
          <button
            type="button"
            onClick={() => setSelectedWing('girls')}
            className={`px-3 py-1.5 rounded-lg transition ${
              selectedWing === 'girls'
                ? 'bg-portal-navy text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Girls Attendance Sheet
          </button>
        </div>

        <div className="portal-card p-4 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50 px-3 py-1.5 rounded border border-slate-200">
            <Building className="w-3.5 h-3.5 text-portal-navy" />
            <span>Centre: <strong>{officialCentre}</strong></span>
            <span className="text-slate-300">|</span>
            <span>Date: <strong>{officialExamDate}</strong></span>
            <span className="text-slate-300">|</span>
            <span>Time: <strong>{officialExamTime}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600">Class:</span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="text-xs border rounded-lg px-2.5 py-1.5 outline-none font-medium text-slate-800"
            >
              <option value="">All Classes</option>
              <option value="Class 6">Class 6th</option>
              <option value="Class 7">Class 7th</option>
              <option value="Class 8">Class 8th</option>
              <option value="Class 9">Class 9th</option>
              <option value="Class 11|Non Medical">Class 11th — Non Medical</option>
              <option value="Class 11|Medical">Class 11th — Medical</option>
              <option value="Class 11|Commerce">Class 11th — Commerce</option>
              <option value="Class 11|Arts">Class 11th — Arts</option>
            </select>
          </div>

          {loading ? (
            <span className="text-xs text-slate-500 ml-auto inline-flex items-center gap-1.5 font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-portal-navy" />
              <span>Loading candidates...</span>
            </span>
          ) : (
            <span className="text-xs text-slate-500 ml-auto">
              Candidates: <strong className="text-slate-900">{candidates.length}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Printable Sheet Container */}
      <div className="bg-white border border-slate-300 rounded-xl p-6 print:p-0 print:border-none print:shadow-none">
        {/* Printable Header */}
        <div className="border-2 border-black pb-2 pt-2 mb-4 text-center bg-slate-50 print:bg-transparent">
          <h2 className="text-xl sm:text-2xl font-black text-black uppercase tracking-wider font-serif">
            GURUKUL
          </h2>
          <p className="text-sm font-black text-black uppercase tracking-wide mt-0.5">
            ENTERENCE EXAM 2027-28
          </p>
          <p className="text-xs font-black text-black uppercase tracking-wider mt-0.5">
            {selectedClass ? selectedClass.toUpperCase() : 'ALL CLASSES'}
          </p>
          <p className="text-[11px] font-bold text-slate-800 uppercase mt-1">
            EXAMINATION CENTRE: {officialCentre} {officialVenueAddress ? `(${officialVenueAddress})` : ''} • DATE: {officialExamDate} • TIME: {officialExamTime}
          </p>
        </div>

        {/* Attendance Register Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border-2 border-black text-xs">
            <thead>
              <tr className="bg-slate-100 text-black font-black border-b-2 border-black text-center text-[11px]">
                <th className="p-2 border border-black w-14">Sr. No.</th>
                <th className="p-2 border border-black">Registration No.</th>
                <th className="p-2 border border-black">Roll Number</th>
                <th className="p-2 border border-black">Student Name</th>
                <th className="p-2 border border-black">Father Name</th>
                <th className="p-2 border border-black">Aadhar No.</th>
                <th className="p-2 border border-black w-24">Student Photo</th>
                <th className="p-2 border border-black w-28">Student Signature</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-16 text-center text-slate-500 border border-black bg-slate-50">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-portal-navy" />
                      <div>
                        <p className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                          Loading Attendance Register...
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Fetching candidate hall ticket and examination roll records
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : candidates.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 space-y-1 border border-black">
                    <p className="font-semibold text-xs text-slate-700">No candidates with allotted Roll Numbers found.</p>
                    <p className="text-[11px] text-slate-400">
                      Candidates must have an active Admit Card and allotted Roll Number to appear on the attendance register.
                    </p>
                  </td>
                </tr>
              ) : (
                candidates.map((c, idx) => (
                  <tr key={c.id} className="border-b border-black hover:bg-slate-50 h-16">
                    <td className="p-2 border border-black text-center font-mono font-bold">{idx + 1}</td>
                    <td className="p-2 border border-black font-mono font-bold text-center">
                      {c.registrationNumber}
                    </td>
                    <td className="p-2 border border-black font-mono font-black text-center text-sm">
                      {c.rollNumber}
                    </td>
                    <td className="p-2 border border-black font-bold uppercase">
                      {c.fullName}
                    </td>
                    <td className="p-2 border border-black font-medium uppercase">
                      {c.fatherName}
                    </td>
                    <td className="p-2 border border-black font-mono font-bold text-center">
                      {c.aadharNo || '—'}
                    </td>
                    <td className="p-1 border border-black text-center">
                      <div className="w-12 h-14 border border-black mx-auto bg-slate-50 flex items-center justify-center overflow-hidden">
                        {c.photo ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={c.photo} alt="Photo" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[8px] text-slate-400">Affix Photo</span>
                        )}
                      </div>
                    </td>
                    <td className="p-1 border border-black text-center">
                      {c.signature ? (
                        <div className="h-12 flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={c.signature}
                            alt="Signature"
                            className="max-h-10 max-w-[100px] object-contain mx-auto"
                          />
                        </div>
                      ) : (
                        <div className="h-12 flex items-end justify-center pb-1">
                          <span className="text-[9px] text-slate-300 font-mono">Sign</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer for Invigilator Certification */}
        <div className="mt-6 pt-4 border-t-2 border-slate-900 flex justify-between items-center text-[10px] font-bold">
          <div>
            <span>Total Candidates in Room: __________</span>
            <span className="ml-6">Present: __________</span>
            <span className="ml-6">Absent: __________</span>
          </div>
          <div>
            <span>Signature of Centre Superintendent &amp; Seal</span>
          </div>
        </div>
      </div>
    </div>
  );
}
