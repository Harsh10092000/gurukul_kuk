'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Printer,
  Building,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Layers,
  FileDown
} from 'lucide-react';

const PRINT_SHEET_SIZE = 10; // Standard examination practice: 10 candidates per A4 page

export default function AdminAttendancePage() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedWing, setSelectedWing] = useState<'all' | 'boys' | 'girls'>('all');
  const [officialCentre, setOfficialCentre] = useState('Aryakulam Nilokheri (Boys) / The Gurukul Nilokheri (Girls)');
  const [officialVenueAddress, setOfficialVenueAddress] = useState('Nilokheri, Karnal - 132117');
  const [officialExamDate, setOfficialExamDate] = useState('14 February 2027');
  const [officialExamTime, setOfficialExamTime] = useState('9:30 AM (Boys) / 8:30 AM (Girls)');

  // Screen Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [pageJumpInput, setPageJumpInput] = useState('');

  // Print/Download Scope: 'all' (whole register) or 'current' (active screen page)
  const [printScope, setPrintScope] = useState<'all' | 'current'>('all');

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) {
          if (data.settings.examVenueName && !data.settings.examVenueName.includes('KURUKSHETRA')) {
            setOfficialCentre(data.settings.examVenueName);
          }
          if (data.settings.examVenueAddress && !data.settings.examVenueAddress.includes('136119')) {
            setOfficialVenueAddress(data.settings.examVenueAddress);
          }
          if (data.settings.entranceExamDate && !data.settings.entranceExamDate.includes('21 March')) {
            setOfficialExamDate(data.settings.entranceExamDate);
          }
          if (data.settings.entranceExamTime && data.settings.entranceExamTime !== '9:00 AM') {
            setOfficialExamTime(data.settings.entranceExamTime);
          }
        }
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setCurrentPage(1); // Reset to page 1 on filter change
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

  // Screen Pagination Calculations
  const totalPages = Math.max(1, Math.ceil(candidates.length / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, candidates.length);
  const paginatedCandidates = useMemo(() => {
    return candidates.slice(startIndex, endIndex);
  }, [candidates, startIndex, endIndex]);

  // Candidates selected for Print / PDF Generation
  const candidatesToPrint = useMemo(() => {
    if (printScope === 'current') {
      return paginatedCandidates;
    }
    return candidates;
  }, [printScope, paginatedCandidates, candidates]);

  // Print Sheets Chunking (Chunked by 10 candidates per A4 sheet)
  const printSheets = useMemo(() => {
    if (!candidatesToPrint || candidatesToPrint.length === 0) return [];
    const sheets = [];
    for (let i = 0; i < candidatesToPrint.length; i += PRINT_SHEET_SIZE) {
      sheets.push(candidatesToPrint.slice(i, i + PRINT_SHEET_SIZE));
    }
    return sheets;
  }, [candidatesToPrint]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      setPageJumpInput('');
    }
  };

  const handleJumpToPage = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(pageJumpInput, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      setPageJumpInput('');
    }
  };

  // Helper to generate numbered pagination with ellipsis
  const visiblePages = useMemo(() => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) pages.push('...');
      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(totalPages - 1, safeCurrentPage + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (safeCurrentPage < totalPages - 2) pages.push('...');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  }, [totalPages, safeCurrentPage]);

  // Action: Print or Save PDF of Current Screen Sheet
  const handlePrintCurrentSheet = () => {
    setPrintScope('current');
    setTimeout(() => {
      window.print();
    }, 200);
  };

  // Action: Print or Save PDF of Whole Register (All Pages)
  const handlePrintWholeRegister = () => {
    setPrintScope('all');
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const getWingTitle = () => {
    if (selectedWing === 'boys') return 'BOYS ATTENDANCE REGISTER (ARYAKULAM NILOKHERI)';
    if (selectedWing === 'girls') return 'GIRLS ATTENDANCE REGISTER (THE GURUKUL NILOKHERI)';
    return 'CENTRAL ATTENDANCE REGISTER';
  };

  const currentSheetCentre = useMemo(() => {
    if (selectedWing === 'boys') return 'Aryakulam Nilokheri';
    if (selectedWing === 'girls') return 'The Gurukul Nilokheri';
    return officialCentre;
  }, [selectedWing, officialCentre]);

  const currentSheetAddress = useMemo(() => {
    if (selectedWing === 'boys') return 'Nigdu Road, Nilokheri, Karnal, Haryana - 132117';
    if (selectedWing === 'girls') return 'Sidhpur Minor, Nigdu Road, Nilokheri, Karnal, Haryana - 132117';
    return officialVenueAddress;
  }, [selectedWing, officialVenueAddress]);

  const currentSheetTime = useMemo(() => {
    if (selectedWing === 'boys') return '9:30 AM';
    if (selectedWing === 'girls') return '8:30 AM';
    return officialExamTime;
  }, [selectedWing, officialExamTime]);

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. SCREEN VIEW: Filters, Pagination Controls, and Interactive Table       */}
      {/* ========================================================================= */}
      <div className="space-y-6 print:hidden">
        {/* Top Header & Download / Print Action Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-portal-navy bg-slate-100 px-2.5 py-0.5 rounded">
                Examination Desk • Session 2027-28
              </span>
              <span className="portal-badge-gold text-[10px]">
                A4 Print-Ready
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Entrance Examination Attendance Registers
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Official attendance roll registers with invigilator verification &amp; candidate photographs
            </p>
          </div>

          {/* 2 Print / Download Options: Side-by-side, equal height, clean styling */}
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            {/* Option 1: Current Sheet */}
            <button
              type="button"
              onClick={handlePrintCurrentSheet}
              disabled={loading || candidates.length === 0}
              className="flex-1 md:flex-initial h-10 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
              title="Download or Print only candidates on the current active page"
            >
              <FileDown className="w-4 h-4 text-portal-navy" />
              <span>Current Sheet (Pg {safeCurrentPage})</span>
            </button>

            {/* Option 2: Whole Sheet */}
            <button
              type="button"
              onClick={handlePrintWholeRegister}
              disabled={loading || candidates.length === 0}
              className="flex-1 md:flex-initial h-10 px-4 rounded-lg bg-portal-navy hover:bg-slate-800 text-white text-xs font-semibold shadow-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
              title="Download or Print all candidates across all pages"
            >
              <Layers className="w-4 h-4 text-portal-gold" />
              <span>Whole Sheet ({candidates.length} Students)</span>
            </button>
          </div>
        </div>

        {/* Unified Control & Filter Panel */}
        <div className="portal-card p-4 space-y-3.5 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Wing Segmented Switcher */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                Wing:
              </span>
              <div className="inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setSelectedWing('all')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${selectedWing === 'all'
                      ? 'bg-portal-navy text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  All Candidates ({candidates.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedWing('boys')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${selectedWing === 'boys'
                      ? 'bg-portal-navy text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  Boys Wing
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedWing('girls')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${selectedWing === 'girls'
                      ? 'bg-portal-navy text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  Girls Wing
                </button>
              </div>
            </div>

            {/* Class Filter & Count Indicator */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Class:</span>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 outline-none font-medium text-slate-800 bg-white shadow-xs focus:border-portal-navy"
                >
                  <option value="">All Classes</option>
                  <option value="Class 6">Class 6th</option>
                  <option value="Class 7">Class 7th</option>
                  <option value="Class 8">Class 8th</option>
                  <option value="Class 9">Class 9th</option>
                  <option value="Class 11|Non Medical">Class 11th — Non Medical</option>
                  <option value="Class 11|Medical">Class 11th — Medical</option>
                  <option value="Class 11|Commerce">Class 11th — Commerce</option>
                  <option value="Class 11|Humanities">Class 11th — Humanities</option>
                  <option value="Class 11|Arts">Class 11th — Arts</option>
                </select>
              </div>

              {loading ? (
                <span className="text-xs text-slate-500 inline-flex items-center gap-1.5 font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-portal-navy" />
                  <span>Loading...</span>
                </span>
              ) : (
                <div className="flex items-center gap-2 text-xs">
                  <span className="portal-badge-navy">
                    Total: <strong>{candidates.length}</strong>
                  </span>
                  <span className="text-slate-500 font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {Math.ceil(candidates.length / PRINT_SHEET_SIZE)} A4 Sheets
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Examination Centre & Schedule Metadata Strip */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex flex-wrap items-center gap-2">
              <Building className="w-3.5 h-3.5 text-portal-navy shrink-0" />
              <span>Centre: <strong className="text-slate-800">{officialCentre}</strong></span>
              <span className="text-slate-300">|</span>
              <span>Date: <strong className="text-slate-800">{officialExamDate}</strong></span>
              <span className="text-slate-300">|</span>
              <span>Time: <strong className="text-slate-800">{officialExamTime}</strong></span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              Standard Examination Format: 10 Candidates per A4 Page
            </div>
          </div>
        </div>

        {/* Screen Attendance Table Card */}
        <div className="portal-card p-0 overflow-hidden shadow-sm">
          {/* Table Header Strip */}
          <div className="p-4 bg-slate-50/90 border-b border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-slate-900 uppercase tracking-wide">
                {getWingTitle()}
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-xs text-slate-500">
                {selectedClass ? selectedClass : 'All Classes'}
              </span>
            </div>

            {/* Rows Per Page Selector */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 text-[11px]">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-slate-300 rounded px-2 py-1 text-xs font-semibold text-slate-800 bg-white"
              >
                <option value={10}>10 rows</option>
                <option value={25}>25 rows</option>
                <option value={50}>50 rows</option>
                <option value={100}>100 rows</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-center text-[11px]">
                  <th className="p-2.5 border-r border-slate-200 w-14">Sr. No.</th>
                  <th className="p-2.5 border-r border-slate-200">Registration No.</th>
                  <th className="p-2.5 border-r border-slate-200">Roll Number</th>
                  <th className="p-2.5 border-r border-slate-200 text-left">Student Name</th>
                  <th className="p-2.5 border-r border-slate-200 text-left">Father Name</th>
                  <th className="p-2.5 border-r border-slate-200">Aadhaar No.</th>
                  <th className="p-2.5 border-r border-slate-200 w-24">Photo</th>
                  <th className="p-2.5 w-28">Signature</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-16 text-center text-slate-500 bg-slate-50/50">
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
                    <td colSpan={8} className="p-10 text-center text-slate-500 space-y-1">
                      <p className="font-semibold text-xs text-slate-700">No candidates with allotted Roll Numbers found.</p>
                      <p className="text-[11px] text-slate-400">
                        Candidates must have an active Admit Card and allotted Roll Number to appear on the attendance register.
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedCandidates.map((c, idx) => {
                    const serialNumber = startIndex + idx + 1;
                    return (
                      <tr key={c.id || idx} className="border-b border-slate-200 hover:bg-amber-50/30 transition h-16">
                        <td className="p-2.5 border-r border-slate-200 text-center font-mono font-bold text-slate-700">
                          {serialNumber}
                        </td>
                        <td className="p-2.5 border-r border-slate-200 font-mono font-bold text-center text-portal-navy">
                          {c.registrationNumber}
                        </td>
                        <td className="p-2.5 border-r border-slate-200 font-mono font-black text-center text-sm text-slate-900">
                          {c.rollNumber}
                        </td>
                        <td className="p-2.5 border-r border-slate-200 font-bold uppercase text-slate-900">
                          <div>{c.fullName}</div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            {c.classApplying} {c.stream ? `• ${c.stream}` : ''}
                          </div>
                        </td>
                        <td className="p-2.5 border-r border-slate-200 font-medium uppercase text-slate-700">
                          {c.fatherName}
                        </td>
                        <td className="p-2.5 border-r border-slate-200 font-mono font-bold text-center text-slate-600">
                          {c.aadharNo || '—'}
                        </td>
                        <td className="p-1.5 border-r border-slate-200 text-center">
                          <div className="w-10 h-12 border border-slate-300 mx-auto bg-slate-50 flex items-center justify-center overflow-hidden rounded">
                            {c.photo ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={c.photo} alt="Photo" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[7px] text-slate-400">No Photo</span>
                            )}
                          </div>
                        </td>
                        <td className="p-1.5 text-center">
                          {c.signature ? (
                            <div className="h-12 flex items-center justify-center">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={c.signature}
                                alt="Signature"
                                className="max-h-10 max-w-[90px] object-contain mx-auto"
                              />
                            </div>
                          ) : (
                            <div className="h-12 flex items-end justify-center pb-1">
                              <span className="text-[9px] text-slate-300 font-mono">Sign</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Interactive Screen Pagination Bar */}
          {!loading && candidates.length > 0 && (
            <div className="p-4 bg-slate-50/90 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <div className="text-slate-600 text-xs">
                Showing <strong className="text-slate-900">{startIndex + 1}</strong> to{' '}
                <strong className="text-slate-900">{endIndex}</strong> of{' '}
                <strong className="text-slate-900">{candidates.length}</strong> candidates
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {/* First Page */}
                <button
                  type="button"
                  onClick={() => handlePageChange(1)}
                  disabled={safeCurrentPage === 1}
                  className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition"
                  title="First Page"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>

                {/* Previous Page */}
                <button
                  type="button"
                  onClick={() => handlePageChange(safeCurrentPage - 1)}
                  disabled={safeCurrentPage === 1}
                  className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {/* Numbered Buttons */}
                {visiblePages.map((page, i) =>
                  page === '...' ? (
                    <span key={`ellipsis-${i}`} className="px-2 py-1 text-slate-400 font-mono text-xs">
                      ...
                    </span>
                  ) : (
                    <button
                      key={`page-${page}`}
                      type="button"
                      onClick={() => handlePageChange(Number(page))}
                      className={`min-w-[28px] h-7 px-2 rounded font-mono text-xs font-bold transition ${safeCurrentPage === page
                          ? 'bg-portal-navy text-portal-gold shadow-xs'
                          : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                    >
                      {page}
                    </button>
                  )
                )}

                {/* Next Page */}
                <button
                  type="button"
                  onClick={() => handlePageChange(safeCurrentPage + 1)}
                  disabled={safeCurrentPage === totalPages}
                  className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition"
                  title="Next Page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {/* Last Page */}
                <button
                  type="button"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={safeCurrentPage === totalPages}
                  className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition"
                  title="Last Page"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>

                {/* Jump to Page Form */}
                {totalPages > 5 && (
                  <form onSubmit={handleJumpToPage} className="flex items-center gap-1 ml-2">
                    <span className="text-[11px] text-slate-500">Go to:</span>
                    <input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={pageJumpInput}
                      onChange={(e) => setPageJumpInput(e.target.value)}
                      placeholder={String(safeCurrentPage)}
                      className="w-12 h-7 px-1.5 border border-slate-300 rounded text-center text-xs font-mono"
                    />
                    <button
                      type="submit"
                      className="h-7 px-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-semibold text-[11px]"
                    >
                      Go
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. PRINT / PDF VIEW: Chunked Across A4 Printable Sheets (Current or All)  */}
      {/* ========================================================================= */}
      <div id="attendance-register-print-sheets" className="hidden print:block text-black bg-white print:bg-white print:bg-none">
        {candidatesToPrint.length === 0 ? (
          <div className="p-8 text-center text-black border-2 border-black bg-white">
            <h3 className="font-bold text-sm">NO CANDIDATE ATTENDANCE DATA FOUND</h3>
          </div>
        ) : (
          printSheets.map((sheetCandidates, sheetIdx) => {
            const baseSrNo = printScope === 'current' ? startIndex : 0;
            const sheetStart = baseSrNo + sheetIdx * PRINT_SHEET_SIZE;
            const sheetEnd = sheetStart + sheetCandidates.length;

            return (
              <div
                key={`print-sheet-${sheetIdx}`}
                className="attendance-sheet-page bg-white print:bg-white print:bg-none p-3 font-sans text-black"
              >
                {/* Print Sheet Header */}
                <div className="border-2 border-black pb-1 pt-1.5 mb-2 text-center">
                  <div className="flex justify-between items-center px-3 text-[9px] font-bold tracking-wider">
                    <span>CBSE AFFILIATION NO. 530006</span>
                    <span className="font-mono uppercase">
                      {printScope === 'current'
                        ? `PAGE ${safeCurrentPage} (SHEET ${sheetIdx + 1} OF ${printSheets.length}) • CANDIDATES ${sheetStart + 1}–${sheetEnd} OF ${candidates.length}`
                        : `SHEET ${sheetIdx + 1} OF ${printSheets.length} • CANDIDATES ${sheetStart + 1}–${sheetEnd} OF ${candidates.length}`}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-black uppercase tracking-wider font-serif mt-0.5">
                    THE GURUKUL NILOKHERI
                  </h2>
                  <p className="text-xs font-black text-black uppercase tracking-wide">
                    ENTRANCE EXAMINATION 2027-28 — {getWingTitle()}
                  </p>
                  <p className="text-[11px] font-bold text-black uppercase">
                    {selectedClass ? selectedClass.toUpperCase() : 'ALL CLASSES'}
                  </p>
                  <p className="text-[10px] font-bold text-black uppercase mt-0.5">
                    EXAM CENTRE: {currentSheetCentre} {currentSheetAddress ? `(${currentSheetAddress})` : ''} • DATE: {officialExamDate} • TIME: {currentSheetTime}
                  </p>
                </div>

                {/* Printable Table */}
                <table className="w-full text-left border-collapse border-2 border-black text-[10px] leading-tight">
                  <thead>
                    <tr className="bg-slate-100 text-black font-black border-b-2 border-black text-center text-[10px]">
                      <th className="p-1 border border-black w-10">Sr.</th>
                      <th className="p-1 border border-black w-24">Registration No.</th>
                      <th className="p-1 border border-black w-20">Roll No.</th>
                      <th className="p-1 border border-black text-left">Student Name</th>
                      <th className="p-1 border border-black text-left">Father Name</th>
                      <th className="p-1 border border-black w-24">Aadhaar No.</th>
                      <th className="p-1 border border-black w-20">Student Photo</th>
                      <th className="p-1 border border-black w-24">Student Signature</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sheetCandidates.map((c, rowIdx) => {
                      const globalSrNo = sheetStart + rowIdx + 1;
                      return (
                        <tr key={c.id || rowIdx} className="border-b border-black h-[58px]">
                          <td className="p-1 border border-black text-center font-mono font-bold">
                            {globalSrNo}
                          </td>
                          <td className="p-1 border border-black font-mono font-bold text-center">
                            {c.registrationNumber}
                          </td>
                          <td className="p-1 border border-black font-mono font-black text-center text-xs">
                            {c.rollNumber}
                          </td>
                          <td className="p-1 border border-black font-bold uppercase">
                            <div>{c.fullName}</div>
                            <div className="text-[8px] font-normal text-slate-700">
                              {c.classApplying} {c.stream ? `• ${c.stream}` : ''}
                            </div>
                          </td>
                          <td className="p-1 border border-black font-medium uppercase text-[9px]">
                            {c.fatherName}
                          </td>
                          <td className="p-1 border border-black font-mono font-bold text-center">
                            {c.aadharNo || '—'}
                          </td>
                          <td className="p-0.5 border border-black text-center">
                            <div className="w-10 h-12 border border-black mx-auto bg-white flex items-center justify-center overflow-hidden">
                              {c.photo ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={c.photo} alt="Photo" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[7px] text-slate-500">Affix Photo</span>
                              )}
                            </div>
                          </td>
                          <td className="p-0.5 border border-black text-center">
                            {c.signature ? (
                              <div className="h-12 flex items-center justify-center">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={c.signature}
                                  alt="Signature"
                                  className="max-h-10 max-w-[85px] object-contain mx-auto"
                                />
                              </div>
                            ) : (
                              <div className="h-12 flex items-end justify-center pb-1">
                                <span className="text-[8px] text-slate-400 font-mono">Sign</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Printable Invigilator Certification on each sheet */}
                <div className="mt-2 pt-1.5 border-t-2 border-black flex justify-between items-center text-[9px] font-bold">
                  <div>
                    <span>Total on Sheet: <strong>{sheetCandidates.length}</strong></span>
                    <span className="ml-5">Present: __________</span>
                    <span className="ml-5">Absent: __________</span>
                  </div>
                  <div>
                    <span>Invigilator Signature: __________________</span>
                    <span className="ml-6">Centre Superintendent &amp; Seal</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
