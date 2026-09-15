'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { 
  Phone, 
  Mail, 
  Calendar, 
  User, 
  ShieldCheck, 
  FileText, 
  Menu, 
  X, 
  Award,
  LogOut
} from 'lucide-react';

export default function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const isAdminRoute = pathname.startsWith('/admin');
  const isAdminLogin = pathname === '/admin/login';
  const isCandidateDashboard = pathname.startsWith('/dashboard') || pathname.startsWith('/apply');
  const isAdmin = currentUser?.role === 'admin' || isAdminRoute;
  const isPortalArea = isCandidateDashboard || isAdmin;

  useEffect(() => {
    // Check auth status
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setCurrentUser(data.user);
      })
      .catch(() => {});
  }, [pathname]);

  const handleLogout = async () => {
    try {
      localStorage.removeItem('gurukul_application_draft');
    } catch (e) {}
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  };

  const brandRedirectHref = currentUser
    ? currentUser.role === 'admin'
      ? '/admin/dashboard'
      : '/dashboard'
    : '/';

  return (
    <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      {/* Top Banner Notice Strip */}
      <div className="bg-gurukul-navy text-slate-200 text-xs py-1.5 px-4 sm:px-8 border-b border-slate-700">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5 text-amber-400 font-medium">
              <Award className="w-3.5 h-3.5" /> CBSE Affiliation No. 530006
            </span>
            <span className="hidden sm:inline text-slate-400">|</span>
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3 text-amber-400" /> Helpline: +91-1744-259114, 9896328329
            </span>
            <span className="hidden md:inline text-slate-400">|</span>
            <span className="hidden md:flex items-center gap-1">
              <Mail className="w-3 h-3 text-amber-400" /> admissions@gurukulkurukshetra.com
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Entrance Session: 2026-27
            </span>
            {currentUser?.role === 'admin' && (
              <Link 
                href="/admin/dashboard" 
                className="text-amber-300 hover:text-white text-[11px] font-bold flex items-center gap-1 bg-amber-500/20 px-2.5 py-0.5 rounded transition border border-amber-400/30"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Admin Dashboard
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Brand Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex justify-between items-center">
        <Link href={brandRedirectHref} className="flex items-center gap-3.5 group">
          <div className="w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 flex items-center justify-center">
            <Image
              src="/logo-gurukul.png"
              alt="Gurukul Kurukshetra Emblem"
              width={64}
              height={64}
              priority
              className="brand-logo-img object-contain drop-shadow-sm group-hover:scale-105 transition-transform"
            />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-gurukul-navy tracking-tight group-hover:text-gurukul-600 transition flex items-center gap-2">
              <span>GURUKUL KURUKSHETRA</span>
            </div>
            <p className="text-xs text-amber-700 font-semibold tracking-wide flex items-center gap-2">
              <span>तमसो मा ज्योतिर्गमय</span>
              <span className="text-[10px] text-slate-500 font-normal">(Established 1912)</span>
            </p>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Entrance Examination & Management Portal (Session 2026-27)
            </p>
          </div>
        </Link>

        {/* Desktop Quick Nav & Auth Actions */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-700">
          {isAdminLogin && !currentUser ? (
            <div className="flex items-center gap-3">
              <span className="bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-600" /> Administrative Examination Cell
              </span>
              <Link
                href="/"
                className="text-xs font-bold text-slate-600 hover:text-gurukul-navy transition border border-slate-300 hover:border-slate-400 px-3 py-1.5 rounded-xl"
              >
                ← Return to Portal
              </Link>
            </div>
          ) : !isAdmin ? (
            <>
              <Link href="/status" className="hover:text-gurukul-600 transition flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-500" /> Check Status
              </Link>
              <Link href="/admit-card" className="hover:text-gurukul-600 transition">
                Admit Card
              </Link>
              <Link href="/result" className="hover:text-gurukul-600 transition">
                Results
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-700">
              <Link 
                href="/admin/dashboard" 
                className={`hover:text-gurukul-600 transition ${pathname === '/admin/dashboard' ? 'text-amber-600 font-bold' : ''}`}
              >
                Dashboard
              </Link>
              <Link 
                href="/admin/applications" 
                className={`hover:text-gurukul-600 transition ${pathname.startsWith('/admin/applications') ? 'text-amber-600 font-bold' : ''}`}
              >
                Applications
              </Link>
              <Link 
                href="/admin/settings" 
                className={`hover:text-gurukul-600 transition ${pathname.startsWith('/admin/settings') ? 'text-amber-600 font-bold' : ''}`}
              >
                Settings
              </Link>
            </div>
          )}

          {currentUser ? (
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
              <Link
                href={currentUser?.role === 'admin' ? '/admin/dashboard' : '/dashboard'}
                className="flex items-center gap-2 bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-100 transition"
              >
                <User className="w-4 h-4 text-amber-600" />
                <span>{currentUser?.name || (currentUser?.role === 'admin' ? 'Admin' : 'Candidate')}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition shadow-sm"
                title="Sign Out from Gurukul Portal"
              >
                <LogOut className="w-3.5 h-3.5 text-white" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : !isAdminLogin ? (
            <div className="flex items-center gap-2.5">
              <Link
                href="/login"
                className={`border px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition flex items-center gap-1 ${
                  pathname === '/login'
                    ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-sm'
                    : 'text-gurukul-navy hover:text-gurukul-600 border-slate-300 hover:border-gurukul-600'
                }`}
              >
                <User className="w-3.5 h-3.5 text-gurukul-600" />
                <span>Candidate Login</span>
              </Link>
              <Link
                href="/register"
                className="bg-gradient-to-r from-amber-500 to-gurukul-600 hover:from-amber-600 hover:to-gurukul-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md transition flex items-center gap-1.5"
              >
                <span>New Registration</span>
                <span className="bg-white/20 text-[10px] px-1.5 py-0.5 rounded font-mono">2026-27</span>
              </Link>
            </div>
          ) : null}
        </nav>

        {/* Mobile menu toggle */}
        <div className="lg:hidden flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-700 hover:text-gurukul-600"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-slate-200 px-4 py-4 space-y-3 shadow-lg">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-slate-800 font-semibold"
          >
            Home
          </Link>
          <Link
            href="/#schedule"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-slate-800 font-semibold"
          >
            Exam Schedule
          </Link>
          <Link
            href="/#classes"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-slate-800 font-semibold"
          >
            Classes Offered
          </Link>
          {!isAdmin ? (
            <>
              <Link
                href="/status"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-slate-800 font-semibold"
              >
                Application Status
              </Link>
              <Link
                href="/admit-card"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-slate-800 font-semibold"
              >
                Download Admit Card
              </Link>
              <Link
                href="/result"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-slate-800 font-semibold"
              >
                Entrance Results
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/admin/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-amber-800 font-semibold"
              >
                Admin Dashboard
              </Link>
              <Link
                href="/admin/applications"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-slate-800 font-semibold"
              >
                Manage Applications
              </Link>
              <Link
                href="/admin/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-slate-800 font-semibold"
              >
                Exam & Portal Settings
              </Link>
            </>
          )}

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            {currentUser ? (
              <>
                <Link
                  href={currentUser.role === 'admin' ? '/admin/dashboard' : '/dashboard'}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center bg-amber-100 text-amber-900 font-bold py-2.5 rounded-lg"
                >
                  Go to {currentUser.role === 'admin' ? 'Admin Panel' : 'My Dashboard'}
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-center bg-slate-100 text-slate-700 font-bold py-2 rounded-lg"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 rounded-lg"
                >
                  Applicant Login
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center bg-gurukul-600 text-white font-bold py-2.5 rounded-lg shadow"
                >
                  Apply Online 2026-27
                </Link>
                <Link
                  href="/admin/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center text-xs text-slate-500 py-1"
                >
                  Administrative Staff Login
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
