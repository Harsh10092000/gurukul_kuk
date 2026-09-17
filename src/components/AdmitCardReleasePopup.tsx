'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Award, Bell, Download, X, CheckCircle } from 'lucide-react';

export default function AdmitCardReleasePopup() {
  const [released, setReleased] = useState(false);
  const [releasedAt, setReleasedAt] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data?.settings?.admitCardsReleased) {
          setReleased(true);
          setReleasedAt(data.settings.admitCardsReleasedAt || null);

          // Check if dismissed in this browser session
          try {
            const isDismissed = sessionStorage.getItem('admit_card_notice_dismissed');
            if (!isDismissed) {
              setDismissed(false);
            }
          } catch {
            setDismissed(false);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('admit_card_notice_dismissed', 'true');
    } catch {}
  };

  if (!released || dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-amber-600 via-gurukul-600 to-emerald-700 text-white shadow-md border-b border-amber-400/40 relative z-50 animate-fadeIn">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 text-center sm:text-left">
          <span className="p-1 bg-white/20 rounded-full flex-shrink-0 animate-pulse">
            <Bell className="w-4 h-4 text-amber-200" />
          </span>
          <div>
            <span className="font-extrabold tracking-wide uppercase bg-amber-400/30 text-amber-100 px-2 py-0.5 rounded text-[10px] mr-2">
              Official Notice
            </span>
            <span className="font-bold">
              Admit Cards for Entrance Examination 2027-28 have been Officially Released!
            </span>
            <span className="hidden md:inline text-amber-100/90 ml-1.5">
              All registered candidates can now access and print their Hall Ticket.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href="/admit-card"
            className="bg-white text-gurukul-navy hover:bg-amber-100 px-3 py-1 rounded-lg font-black text-xs shadow-sm flex items-center gap-1 transition"
          >
            <Download className="w-3.5 h-3.5 text-amber-600" />
            <span>Download Admit Card</span>
          </Link>

          <Link
            href="/login"
            className="bg-slate-900/40 hover:bg-slate-900/60 border border-white/30 text-white px-3 py-1 rounded-lg font-bold text-xs transition"
          >
            <span>Candidate Login</span>
          </Link>

          <button
            onClick={handleDismiss}
            aria-label="Close Notice"
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

