'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Printer, ArrowLeft, Loader2, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import { AdmitCard } from '@/lib/types';
import { AdmitCardSheet } from '@/components/AdmitCardView';

function AdmitCardPrintRollContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const selectedClass = searchParams.get('class') || 'all';
  const selectedStream = searchParams.get('stream') || 'all';

  const [cards, setCards] = useState<AdmitCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCards = async (cls: string, stream: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('class', cls);
      params.set('stream', stream);

      const res = await fetch(`/api/admin/admit-card/bulk-list?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load admit cards');
      }

      setCards(data.admitCards || []);
    } catch (err: any) {
      setError(err?.message || 'Error loading admit cards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards(selectedClass, selectedStream);
  }, [selectedClass, selectedStream]);

  const handlePrint = () => {
    window.print();
  };

  const handleFilterChange = (newClass: string, newStream: string) => {
    const params = new URLSearchParams();
    params.set('class', newClass);
    params.set('stream', newStream);
    router.push(`/admin/reports/print-admit-cards?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white text-slate-900 font-sans">
      {/* Floating Top Control Bar (Hidden during print) */}
      <header className="no-print sticky top-0 z-50 bg-slate-900 text-white border-b border-slate-800 shadow-md px-4 py-3">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/reports"
              className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Reports</span>
            </Link>
            <div>
              <h1 className="text-sm font-bold flex items-center gap-2">
                <span>Bulk Admit Cards Print Roll</span>
                <span className="text-portal-gold font-mono text-xs">
                  ({cards.length} {cards.length === 1 ? 'Card' : 'Cards'})
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">
                A4 portrait per student • Color print ready
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Class Selector */}
            <select
              value={selectedClass}
              onChange={(e) => handleFilterChange(e.target.value, selectedStream)}
              className="bg-slate-800 text-white text-xs border border-slate-700 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-portal-gold"
            >
              <option value="all">All Classes</option>
              <option value="Class 5">Class 5</option>
              <option value="Class 6">Class 6</option>
              <option value="Class 7">Class 7</option>
              <option value="Class 8">Class 8</option>
              <option value="Class 9">Class 9</option>
              <option value="Class 11">Class 11</option>
            </select>

            {/* Quick Stream Selector (if Class 11) */}
            {selectedClass === 'Class 11' && (
              <select
                value={selectedStream}
                onChange={(e) => handleFilterChange(selectedClass, e.target.value)}
                className="bg-slate-800 text-white text-xs border border-slate-700 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-portal-gold"
              >
                <option value="all">All Streams</option>
                <option value="Non-Medical">Non-Medical</option>
                <option value="Medical">Medical</option>
                <option value="Commerce">Commerce</option>
                <option value="Humanities">Humanities</option>
              </select>
            )}

            {/* Print Button */}
            <button
              onClick={handlePrint}
              disabled={loading || cards.length === 0}
              className="bg-portal-gold hover:bg-amber-500 text-slate-950 font-bold text-xs px-4 py-1.5 rounded flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>Print All / Save PDF (Ctrl+P)</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Print Container */}
      <main className="max-w-5xl mx-auto py-6 print:py-0 print:max-w-full">
        {loading ? (
          <div className="py-24 text-center space-y-3 no-print">
            <Loader2 className="w-8 h-8 animate-spin text-portal-navy mx-auto" />
            <p className="text-xs font-semibold text-slate-600">
              Generating official Admit Card Print Roll for {selectedClass}...
            </p>
          </div>
        ) : error ? (
          <div className="portal-card max-w-lg mx-auto p-6 text-center space-y-3 my-12 border-rose-200 no-print">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <h3 className="font-bold text-slate-900 text-sm">Failed to Load Admit Cards</h3>
            <p className="text-xs text-rose-600">{error}</p>
            <button
              onClick={() => fetchCards(selectedClass, selectedStream)}
              className="btn-secondary text-xs px-3 py-1.5 mt-2"
            >
              Try Again
            </button>
          </div>
        ) : cards.length === 0 ? (
          <div className="portal-card max-w-lg mx-auto p-8 text-center space-y-3 my-12 no-print">
            <FileText className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="font-bold text-slate-900 text-sm">No Admit Cards Found</h3>
            <p className="text-xs text-slate-500">
              There are currently no registered candidates matching the selected class filter ({selectedClass}).
            </p>
            <button
              onClick={() => handleFilterChange('all', 'all')}
              className="btn-primary text-xs px-3 py-1.5"
            >
              View All Classes
            </button>
          </div>
        ) : (
          <div className="space-y-8 print:space-y-0">
            {cards.map((card, idx) => (
              <div
                key={card.id || card.rollNumber || idx}
                className="admit-card-break-container"
              >
                {/* Visual student divider (screen only) */}
                <div className="no-print max-w-4xl mx-auto mb-2 flex items-center justify-between text-[11px] text-slate-500 font-mono px-2">
                  <span className="font-bold text-slate-700">
                    Candidate #{idx + 1} of {cards.length}
                  </span>
                  <span>
                    Roll: <strong className="text-portal-navy">{card.rollNumber}</strong> • {card.candidateName}
                  </span>
                </div>

                <div className="print:m-0 print:p-0">
                  <AdmitCardSheet admitCard={card} />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Global CSS for seamless multi-page print */}
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 4mm 6mm 4mm 6mm;
        }
        @media print {
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .admit-card-break-container {
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .admit-card-break-container:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function BulkAdmitCardPrintPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-100">
          <div className="text-center space-y-2">
            <Loader2 className="w-8 h-8 animate-spin text-portal-navy mx-auto" />
            <p className="text-xs text-slate-500 font-semibold">Loading Print Roll...</p>
          </div>
        </div>
      }
    >
      <AdmitCardPrintRollContent />
    </Suspense>
  );
}
