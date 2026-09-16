'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Printer, Download, Search, Users, Calendar, MapPin, Building } from 'lucide-react';

export default function AdminAttendancePage() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedWing, setSelectedWing] = useState<'all' | 'boys' | 'girls'>('all');
  const [officialCentre, setOfficialCentre] = useState('Gurukul Kurukshetra Main Campus');

  useEffect(() => {
    fetch('/api/admin/centres')
      .then((res) => res.json())
      .then((data) => {
        if (data.centres && data.centres.length > 0) {
          setOfficialCentre(data.centres[0].name);
        }
      })
      .catch((e) => console.warn('Failed to load centre name:', e));
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
            Examination Desk • Session 2026-27
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

          <span className="text-xs font-mono text-slate-500 ml-auto">
            Candidates in Sheet: <strong>{candidates.length}</strong>
          </span>
        </div>
      </div>

      {/* Printable Sheet Container */}
      <div className="bg-white border border-slate-300 rounded-2xl shadow-sm p-6 print:p-0 print:border-none print:shadow-none">
        {/* Printable Header */}
        <div className="border-b-2 border-slate-900 pb-3 mb-4 text-center">
          <h2 className="text-xl font-black text-gurukul-navy uppercase tracking-wider">
            {selectedWing === 'girls' ? 'ARYAKULAM NILOKHERI' : 'GURUKUL KURUKSHETRA'}
          </h2>
          <p className="text-xs font-serif font-bold text-gurukul-700">
            ENTRANCE EXAMINATION ATTENDANCE SHEET &amp; VERIFICATION REGISTER (2026-27)
            {selectedWing === 'boys' ? ' — BOYS' : selectedWing === 'girls' ? ' — GIRLS' : ' — [CONSOLIDATED]'}
          </p>
          <div className="flex justify-between items-center text-[10px] text-slate-600 font-mono pt-2">
            <span>Examination Date: <strong>06 December 2026</strong></span>
            <span>Wing: <strong>{selectedWing === 'boys' ? 'BOYS WING (GURUKUL)' : selectedWing === 'girls' ? 'GIRLS WING (ARYAKULAM)' : 'ALL WINGS'}</strong></span>
            <span>Centre: <strong>{officialCentre}</strong></span>
            <span>Reporting: <strong>08:30 AM</strong></span>
          </div>
        </div>

        {/* Attendance Register Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-300 text-[11px]">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                <th className="p-2 border border-slate-300 w-12 text-center">S.No</th>
                <th className="p-2 border border-slate-300 w-16 text-center">Photo</th>
                <th className="p-2 border border-slate-300">Roll Number</th>
                <th className="p-2 border border-slate-300">Registration No</th>
                <th className="p-2 border border-slate-300">Candidate Name</th>
                <th className="p-2 border border-slate-300">Father&apos;s Name</th>
                <th className="p-2 border border-slate-300 w-16 text-center">Class</th>
                <th className="p-2 border border-slate-300 w-28 text-center">Candidate Signature</th>
                <th className="p-2 border border-slate-300 w-24 text-center">Invigilator Sign</th>
              </tr>
            </thead>
            <tbody>
              {candidates.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-slate-500 space-y-2">
                    <p className="font-bold text-sm text-slate-700">No candidates with allotted Roll Numbers found.</p>
                    <p className="text-xs text-slate-400">
                      Candidates must have an active Admit Card and allotted Roll Number to appear on the official attendance register.
                    </p>
                  </td>
                </tr>
              ) : (
                candidates.map((c, idx) => (
                  <tr key={c.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="p-2 border border-slate-300 text-center font-mono">{idx + 1}</td>
                    <td className="p-1 border border-slate-300 text-center">
                      <div className="w-10 h-12 border border-slate-300 mx-auto bg-slate-50 flex items-center justify-center overflow-hidden">
                        {c.photo ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={c.photo} alt="Photo" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[8px] text-slate-400">Photo</span>
                        )}
                      </div>
                    </td>
                    <td className="p-2 border border-slate-300 font-mono font-black text-gurukul-navy">
                      {c.rollNumber}
                    </td>
                    <td className="p-2 border border-slate-300 font-mono text-slate-600">
                      {c.registrationNumber}
                    </td>
                    <td className="p-2 border border-slate-300 font-bold text-slate-900">
                      {c.fullName}
                    </td>
                    <td className="p-2 border border-slate-300 text-slate-700">
                      {c.fatherName}
                    </td>
                    <td className="p-2 border border-slate-300 text-center font-bold text-slate-800">
                      {formatClass(c.classApplying)}
                    </td>
                    <td className="p-1 border border-slate-300 text-center">
                      {c.signature ? (
                        <div className="h-9 flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={c.signature}
                            alt="Candidate Signature"
                            className="max-h-8 max-w-[110px] object-contain mx-auto"
                          />
                        </div>
                      ) : (
                        <div className="h-9 border border-dashed border-slate-200 rounded flex items-center justify-center">
                          <span className="text-[8px] text-slate-300 font-mono italic">Sign Attached</span>
                        </div>
                      )}
                    </td>
                    <td className="p-2 border border-slate-300 text-center min-h-[36px]"></td>
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
