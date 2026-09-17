'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Printer, Download, Search, Users, Calendar, MapPin, Building } from 'lucide-react';

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
      .catch((e) => console.warn('Failed to load settings in attendance page:', e));
  }, []);

  const fetchAttendance = () => {
    setLoading(true);
    // For Class 11 stream variants, we pass the class and stream separately
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
        setCandidates(data.candidates || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchAttendance();
  }, [selectedClass, selectedWing]);

  const handlePrintWing = (wing: 'all' | 'boys' | 'girls') => {
    setSelectedWing(wing);
    setTimeout(() => {
      window.print();
    }, 400);
  };

  const formatClass = (cls?: string) => {
    if (!cls) return '—';
    const str = String(cls).trim();
    // Check if already ends with th, st, nd, rd (e.g. 6th)
    if (/^\d+(st|nd|rd|th)/i.test(str)) {
      return str;
    }
    // Match "Class 7", "Class 11 Science", "7", "11", etc.
    const match = str.match(/(?:class\s*)?(\d+)(.*)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      const suffix = match[2] ? match[2].trim() : '';
      let ordinal = 'th';
      if (num === 1 || (num % 10 === 1 && num !== 11)) ordinal = 'st';
      else if (num === 2 || (num % 10 === 2 && num !== 12)) ordinal = 'nd';
      else if (num === 3 || (num % 10 === 3 && num !== 13)) ordinal = 'rd';
      return `${num}${ordinal}${suffix ? ` ${suffix}` : ''}`;
    }
    return str;
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner (Hidden on Print) */}
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-gurukul-600 bg-amber-100 px-3 py-1 rounded-full font-bold">
            Examination Desk • Session 2027-28
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-gurukul-navy mt-1.5">
            Entrance Examination Attendance Registers
          </h1>
          <p className="text-xs text-slate-500">
            Generate official printable invigilator attendance sheets separated for Boys Wing and Girls Wing.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handlePrintWing('boys')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition flex items-center justify-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Boys Sheet</span>
          </button>
          <button
            type="button"
            onClick={() => handlePrintWing('girls')}
            className="bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition flex items-center justify-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Girls Sheet</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="bg-gurukul-navy hover:bg-slate-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition flex items-center justify-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>Print Current Sheet</span>
          </button>
        </div>
      </div>

      {/* Category / Wing Tabs & Filters (Hidden on Print) */}
      <div className="space-y-3 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-600 mr-1">Category / Wing:</span>
          <button
            type="button"
            onClick={() => setSelectedWing('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${selectedWing === 'all'
              ? 'bg-gurukul-navy text-white shadow-sm'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
          >
            All Candidates
          </button>
          <button
            type="button"
            onClick={() => setSelectedWing('boys')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${selectedWing === 'boys'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
              }`}
          >
            <span> Boys Attendance Sheet</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedWing('girls')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${selectedWing === 'girls'
              ? 'bg-pink-600 text-white shadow-sm'
              : 'bg-white text-pink-700 border border-pink-200 hover:bg-pink-50'
              }`}
          >
            <span>Girls Attendance Sheet</span>

          </button>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <Building className="w-4 h-4 text-gurukul-600" />
            <span>Centre: <strong className="text-gurukul-navy">{officialCentre}</strong></span>
            <span className="text-slate-300">|</span>
            <span>Date: <strong className="text-gurukul-navy">{officialExamDate}</strong></span>
            <span className="text-slate-300">|</span>
            <span>Time: <strong className="text-gurukul-navy">{officialExamTime}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Filter Class:</span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="text-xs border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
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

          <span className="text-xs font-mono text-slate-500 ml-auto flex items-center gap-1.5">
            Candidates in Sheet:{' '}
            {loading ? (
              <span className="text-amber-600 font-bold animate-pulse">Loading...</span>
            ) : (
              <strong className="text-slate-900">{candidates.length}</strong>
            )}
          </span>
        </div>
      </div>

      {/* Printable Sheet Container */}
      <div className="bg-white border border-slate-300 rounded-2xl shadow-sm p-6 print:p-0 print:border-none print:shadow-none">
        {/* Printable Header Matching PDF Template */}
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

        {/* Attendance Register Table with Exact Columns from PDF */}
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
                  <td colSpan={8} className="p-12 text-center text-slate-500 border border-black bg-slate-50/60">
                    <div className="flex flex-col items-center justify-center gap-2.5 py-4">
                      <div className="w-9 h-9 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                      <p className="font-black text-xs text-slate-800 tracking-wider uppercase">
                        Loading Attendance Register Candidates...
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Retrieving allotted candidate hall tickets &amp; photographs
                      </p>
                    </div>
                  </td>
                </tr>
              ) : candidates.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-500 space-y-2 border border-black">
                    <p className="font-bold text-sm text-slate-700">No candidates with allotted Roll Numbers found.</p>
                    <p className="text-xs text-slate-400">
                      Candidates must have an active Admit Card and allotted Roll Number to appear on the official attendance register.
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
                            alt="Candidate Signature"
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
            <span>Signature of Centre Superintendent & Seal</span>
          </div>
        </div>
      </div>
    </div>
  );
}

