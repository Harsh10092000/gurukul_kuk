'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Printer, Download, Search, Users, Calendar, MapPin, Building } from 'lucide-react';

export default function AdminAttendancePage() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCentre, setSelectedCentre] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [centresList, setCentresList] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/admin/centres')
      .then((res) => res.json())
      .then((data) => {
        if (data.centres) setCentresList(data.centres);
      })
      .catch((e) => console.warn('Failed to load centres for filter:', e));
  }, []);

  const fetchAttendance = () => {
    setLoading(true);
    let url = `/api/admin/attendance?`;
    if (selectedCentre) url += `centre=${encodeURIComponent(selectedCentre)}&`;
    if (selectedClass) url += `class=${encodeURIComponent(selectedClass)}&`;

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
  }, [selectedCentre, selectedClass]);

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner (Hidden on Print) */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-gurukul-600 bg-amber-100 px-3 py-1 rounded-full font-bold">
            Examination Desk • Session 2026-27
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-gurukul-navy mt-1.5">
            Entrance Examination Attendance Registers
          </h1>
          <p className="text-xs text-slate-500">
            Generate official printable invigilator attendance sheets (strictly displays candidates with allotted Roll Numbers).
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="bg-gurukul-navy hover:bg-slate-900 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow transition flex items-center justify-center gap-2"
        >
          <Printer className="w-4 h-4 text-amber-400" />
          <span>Print Attendance Sheet</span>
        </button>
      </div>

      {/* Filters (Hidden on Print) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center print:hidden">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Building className="w-4 h-4 text-gurukul-600" />
          <span>Centre Filter:</span>
        </div>
        <select
          value={selectedCentre}
          onChange={(e) => setSelectedCentre(e.target.value)}
          className="text-xs border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
        >
          <option value="">All Examination Centres</option>
          {centresList.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name} ({c.code})
            </option>
          ))}
        </select>

        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="text-xs border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
        >
          <option value="">All Classes</option>
          <option value="Class 5">Class 5th</option>
          <option value="Class 6">Class 6th</option>
          <option value="Class 7">Class 7th</option>
          <option value="Class 8">Class 8th</option>
          <option value="Class 9">Class 9th</option>
          <option value="Class 11 Science">Class 11th Science</option>
          <option value="Class 11 Commerce">Class 11th Commerce</option>
          <option value="Class 11 NDA Wing">Class 11th NDA Wing</option>
        </select>

        <span className="text-xs font-mono text-slate-500 ml-auto">
          Total Candidates: <strong>{candidates.length}</strong>
        </span>
      </div>

      {/* Printable Sheet Container */}
      <div className="bg-white border border-slate-300 rounded-2xl shadow-sm p-6 print:p-0 print:border-none print:shadow-none">
        {/* Printable Header */}
        <div className="border-b-2 border-slate-900 pb-3 mb-4 text-center">
          <h2 className="text-xl font-black text-gurukul-navy uppercase tracking-wider">
            GURUKUL KURUKSHETRA
          </h2>
          <p className="text-xs font-serif font-bold text-gurukul-700">
            ENTRANCE EXAMINATION ATTENDANCE SHEET & VERIFICATION REGISTER (2026-27)
          </p>
          <div className="flex justify-between items-center text-[10px] text-slate-600 font-mono pt-2">
            <span>Examination Date: <strong>06 December 2026</strong></span>
            <span>Centre: <strong>{selectedCentre || 'All Centres'}</strong></span>
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
                    <td className="p-2 border border-slate-300 text-center font-semibold">
                      {c.classApplying}
                    </td>
                    <td className="p-2 border border-slate-300 text-center min-h-[36px]"></td>
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
