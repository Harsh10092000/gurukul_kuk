'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, Phone, Mail, ExternalLink, Activity } from 'lucide-react';

export default function AdminFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-portal-navy text-slate-300 border-t border-slate-800 no-print print:hidden mt-auto">
      {/* Upper Footer: Status & Quick Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-slate-800/80">
          {/* Identity */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 flex items-center justify-center">
                <Image
                  src="/logo-gurukul.png"
                  alt="Gurukul Logo"
                  width={36}
                  height={36}
                  className="brand-logo-sm object-contain"
                />
              </div>
              <div>
                <h4 className="text-white font-bold text-sm tracking-tight">ADMIN GURUKUL DESK</h4>
                <p className="text-portal-gold font-serif text-[11px]">तमसो मा ज्योतिर्गमय • Session 2027-28</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Official Examination &amp; Admissions Administration System. CBSE Affiliation No. 530006.
            </p>
          </div>

          {/* Quick Desk Navigation */}
          <div>
            <h5 className="text-white text-xs font-semibold uppercase tracking-wider mb-2.5">
              Quick Administrative Links
            </h5>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <Link href="/admin/dashboard" className="text-slate-400 hover:text-portal-gold transition">
                Overview &amp; Stats
              </Link>
              <Link href="/admin/applications" className="text-slate-400 hover:text-portal-gold transition">
                Applications
              </Link>
              <Link href="/admin/attendance" className="text-slate-400 hover:text-portal-gold transition">
                Attendance Sheets
              </Link>
              <Link href="/admin/results" className="text-slate-400 hover:text-portal-gold transition">
                Results &amp; Merit
              </Link>
              <Link href="/admin/notifications" className="text-slate-400 hover:text-portal-gold transition">
                Notifications
              </Link>
              <Link href="/admin/settings" className="text-slate-400 hover:text-portal-gold transition">
                Portal Settings
              </Link>
            </div>
          </div>

          {/* System Status & Helpdesk */}
          <div className="space-y-2 text-xs">
            <h5 className="text-white text-xs font-semibold uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              System Status: Active
            </h5>
            <div className="space-y-1 text-slate-400">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-portal-gold shrink-0" />
                <span>+91-1744-259114, 9896328329</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-portal-gold shrink-0" />
                <span>admissions@gurukuladmissions.org</span>
              </div>
              <div className="flex items-center gap-1.5 pt-1 text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px]">256-Bit SSL Encrypted • Access Audited</span>
              </div>
            </div>
          </div>
        </div>

        {/* Lower Footer Strip */}
        <div className="pt-4 flex flex-col sm:flex-row justify-between items-center text-[11px] text-slate-500 gap-2">
          <div>
            &copy; {currentYear} Gurukul Kurukshetra Examination &amp; Admission Board. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1 text-slate-400 hover:text-portal-gold transition"
            >
              <span>Public Candidate Portal</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
            <span>•</span>
            <span className="text-slate-500">v1.4.0 (Production Build)</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
