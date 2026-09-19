'use client';

import React from 'react';
import { AdmissionPhaseInfo } from '@/lib/admissionPhases';

interface NotificationBarProps {
  phaseInfo: AdmissionPhaseInfo;
  scheduleLoaded: boolean;
}

export default function NotificationBar({ phaseInfo, scheduleLoaded }: NotificationBarProps) {
  if (!scheduleLoaded) {
    return (
      <aside aria-label="Announcements" className="relative z-20 w-full bg-gradient-to-r from-[#06111e] via-[#0c1f38] to-[#06111e] border-b border-slate-800 shadow-sm py-2 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
          <span className="w-24 h-4 bg-slate-800/80 rounded-full animate-pulse" />
          <span className="w-96 max-w-full h-3.5 bg-slate-800/80 rounded animate-pulse" />
        </div>
      </aside>
    );
  }

  const { banner, phaseId } = phaseInfo;

  // Highlight key phrases and dates cleanly without introducing spaces before punctuation
  const renderFormattedMessage = (msg: string) => {
    const dateRegex = /(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/gi;
    const parts = msg.split(dateRegex);

    return parts.map((part, idx) => {
      if (part.match(dateRegex)) {
        return (
          <span
            key={idx}
            className="font-bold text-amber-300 underline decoration-amber-400/70 underline-offset-2 whitespace-nowrap"
          >
            {part}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  // Phase-specific beacon colors
  const isEmeraldPhase = phaseId === 'RESULTS_DECLARED' || phaseId === 'ADMIT_CARD_RELEASED';
  const isRosePhase = phaseId === 'REGISTRATION_CLOSED';

  const beaconPingBg = isEmeraldPhase
    ? 'bg-emerald-400'
    : isRosePhase
    ? 'bg-rose-400'
    : 'bg-amber-400';

  return (
    <aside
      aria-label="Official Admission Notification"
      className="relative z-20 w-full bg-gradient-to-r from-[#06111e] via-[#0c1f38] to-[#06111e] text-slate-100 border-b border-slate-800 shadow-sm transition-all duration-300"
    >
      <div className="w-full px-3 sm:px-6 md:px-8 py-2 text-center text-xs sm:text-[13px] leading-relaxed">
        {/* Dynamic Centered Content: Badge and message flow together naturally without isolating the badge */}
        <div className="inline text-center">
          {/* Badge Cluster: Beacon + Session Badge + Flashing Tag */}
          <span className="inline-flex items-center align-middle gap-2 mr-2">
            {/* Live pulsing radar beacon */}
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${beaconPingBg}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${beaconPingBg}`} />
            </span>

            {/* Session / Phase Badge */}
            <span className="inline-flex items-center text-[10px] sm:text-[11px] font-bold uppercase px-2 py-0.5 rounded bg-white/10 text-amber-200 border border-white/15 flex-shrink-0 tracking-wide">
              {banner.badge}
            </span>

            {/* Pulsing NEW Tag */}
            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-600 text-white uppercase tracking-wider animate-pulse flex-shrink-0">
              NEW
            </span>
          </span>

          {/* Full Notification Message: Flows continuously alongside the badge */}
          <span className="text-slate-200 font-medium tracking-tight align-middle">
            {renderFormattedMessage(banner.message)}
          </span>
        </div>
      </div>
    </aside>
  );
}
