'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { MapPin, Phone, Mail, Shield, CheckCircle2, ExternalLink } from 'lucide-react';

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
      .catch(() => {});
  }, []);

  return (
    <footer className="bg-gurukul-navy text-slate-300 border-t-4 border-gurukul-500">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Col 1: Institutional Identity */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center">
              <Image
                src="/logo-gurukul.png"
                alt="Gurukul Kurukshetra Logo"
                width={48}
                height={48}
                className="brand-logo-sm object-contain"
              />
            </div>
            <div>
              <h3 className="text-white font-black text-lg tracking-wide">
                GURUKUL KURUKSHETRA
              </h3>
              <p className="text-amber-400 font-serif text-xs font-semibold">
                तमसो मा ज्योतिर्गमय
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Founded in 1912 by Swami Shraddhanand Ji, Gurukul Kurukshetra blends ancient Vedic values, yoga, and character building with world-class modern academic excellence and sports training.
          </p>
          <div className="pt-2 text-xs space-y-1 text-slate-400">
            <div className="flex items-center gap-1.5 text-amber-300 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> CBSE Affiliated (No. 530006)
            </div>
            <div>Residential Senior Secondary Boys School</div>
          </div>
        </div>

        {/* Col 2: Quick Admission Links */}
        <div className="space-y-3">
          <h4 className="text-white font-bold text-sm uppercase tracking-wider border-b border-slate-700 pb-2">
            Entrance 2026-27
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link href="/register" className="hover:text-amber-400 transition flex items-center gap-1">
                <span>›</span> New Online Application
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-amber-400 transition flex items-center gap-1">
                <span>›</span> Applicant Login
              </Link>
            </li>
            <li>
              <Link href="/status" className="hover:text-amber-400 transition flex items-center gap-1">
                <span>›</span> Check Application Status
              </Link>
            </li>
            <li>
              <Link href="/admit-card" className="hover:text-amber-400 transition flex items-center gap-1">
                <span>›</span> Download Hall Ticket / Admit Card
              </Link>
            </li>
            {resultsDeclared && (
              <li>
                <Link href="/result" className="hover:text-amber-400 transition flex items-center gap-1">
                  <span>›</span> Entrance Exam Result & Merit List
                </Link>
              </li>
            )}
            <li>
              <Link href="/#classes" className="hover:text-amber-400 transition flex items-center gap-1">
                <span>›</span> Class-wise Eligibility Criteria
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-amber-400 transition flex items-center gap-1 font-bold text-amber-300">
                <span>›</span> Helpdesk & Contact Enquiries
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 3: Examination & Policy Info */}
        <div className="space-y-3">
          <h4 className="text-white font-bold text-sm uppercase tracking-wider border-b border-slate-700 pb-2">
            Important Information
          </h4>
          <ul className="space-y-2 text-xs text-slate-400">
            <li className="flex items-start gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
              <span>Strictly Merit-Based Selection through Written Entrance Test & Physical Verification.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
              <span>No Capitation Fee or Donation is accepted under any circumstances.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
              <span>Specialized NDA Wing with SSB training & physical conditioning.</span>
            </li>
          </ul>
        </div>

        {/* Col 4: Contact & Campus Address */}
        <div className="space-y-3">
          <h4 className="text-white font-bold text-sm uppercase tracking-wider border-b border-slate-700 pb-2">
            Admission Helpline
          </h4>
          <div className="space-y-2.5 text-xs text-slate-300">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <span>Near 3rd Gate, Kurukshetra University, Kurukshetra, Haryana - 136119, India</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>+91-1744-259114, 259115</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>+91-9896328329 / 7015886675</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>admissions@gurukulkurukshetra.com</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Copyright Bar */}
      <div className="bg-gurukul-navyDark border-t border-slate-800 py-4 px-4 sm:px-8 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <p>© {new Date().getFullYear()} Gurukul Kurukshetra. All Rights Reserved.</p>
          <p className="flex items-center gap-2">
            <span>Official Portal for Entrance Examination & Admission Management</span>
            <span className="hidden sm:inline">|</span>
            <Link href="/admin/login" className="text-amber-400 hover:underline">
              Administrative Login
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
