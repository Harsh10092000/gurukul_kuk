'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();
  const [resultsDeclared, setResultsDeclared] = useState(false);

  useEffect(() => {
    fetch('/api/results/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.resultsDeclared === true) {
          setResultsDeclared(true);
        }
      })
      .catch(() => { });
  }, []);

  if (pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="bg-portal-navy text-slate-300 border-t border-slate-800 no-print">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Col 1: Institutional Identity */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center">
              <Image
                src="/logo-gurukul.png"
                alt="The Gurukul Nilokheri Logo"
                width={48}
                height={48}
                className="brand-logo-sm object-contain"
              />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg tracking-tight">
                THE GURUKUL NILOKHERI
              </h3>
              <p className="text-portal-gold font-serif text-xs">
                मा प्रगाम पथो वयम्
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Integrating ancient Vedic values and character building with modern academic discipline, state-of-the-art facilities, and comprehensive student mentoring.
          </p>
          <div className="pt-2 text-xs space-y-1 text-slate-400">
            <div className="text-portal-gold font-medium">
              CBSE Affiliated Institutional Network
            </div>
            <div>Nilokheri • Jyotisar • Aryakulam Campuses</div>
          </div>
        </div>

        {/* Col 2: Quick Admission Links (No arrows) */}
        <div className="space-y-3">
          <h4 className="text-white font-semibold text-xs uppercase tracking-wider border-b border-slate-800 pb-2">
            Entrance 2027-28
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link href="/register" className="hover:text-portal-gold transition">
                New Candidate Registration
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-portal-gold transition">
                Candidate Login
              </Link>
            </li>
            <li>
              <Link href="/status" className="hover:text-portal-gold transition">
                Check Application Status
              </Link>
            </li>
            <li>
              <Link href="/admit-card" className="hover:text-portal-gold transition">
                Download Hall Ticket / Admit Card
              </Link>
            </li>
            {resultsDeclared && (
              <li>
                <Link href="/result" className="hover:text-portal-gold transition">
                  Entrance Exam Result &amp; Merit List
                </Link>
              </li>
            )}
            <li>
              <Link href="/contact" className="hover:text-portal-gold transition text-portal-gold font-medium">
                Helpdesk &amp; Contact Enquiries
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 3: Academic Programs */}
        <div className="space-y-3">
          <h4 className="text-white font-semibold text-xs uppercase tracking-wider border-b border-slate-800 pb-2">
            Programs Offered
          </h4>
          <ul className="space-y-2 text-xs text-slate-400">
            <li>Class 5th &amp; 6th</li>
            <li>Class 7th &amp; 8th</li>
            <li>Class 9th</li>
            <li>Class 11th Science (Medical &amp; Non-Medical)</li>
            <li>Class 11th Commerce &amp; Humanities</li>
          </ul>
        </div>

        {/* Col 4: Official Helpline & Helpdesk */}
        <div className="space-y-3">
          <h4 className="text-white font-semibold text-xs uppercase tracking-wider border-b border-slate-800 pb-2">
            Admissions Office
          </h4>
          <div className="text-xs space-y-2 text-slate-400 leading-relaxed">
            <p className="text-white font-medium uppercase">
              SIDHPUR MINOR, NIGDU ROAD, NILOKHERI 132117
            </p>
            <p>
              Helpline: +91 7027849858 / 59
            </p>
            <p>
              Email: admissions@thegurukulnilokheri.com
            </p>
            <p className="text-[11px] text-slate-500 pt-1">
              Office Hours: 9:00 AM – 4:00 PM (Monday to Saturday)
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Legal Strip */}
      <div className="border-t border-slate-800 py-4 px-4 sm:px-8 text-[11px] text-slate-500 text-center flex flex-col sm:flex-row justify-between items-center max-w-7xl mx-auto gap-2">
        <div>
          &copy; {new Date().getFullYear()} The Gurukul Nilokheri Examination &amp; Admission Board. All rights reserved.
        </div>
        <div className="flex items-center gap-4">
          <Link href="/admin/login" className="hover:text-slate-400 transition">
            Staff Portal
          </Link>
          <span>•</span>
          <Link href="/contact" className="hover:text-slate-400 transition">
            Support Desk
          </Link>
        </div>
      </div>
    </footer>
  );
}
