'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X, LogOut, ShieldCheck } from 'lucide-react';
import AdminNotificationBell from '@/components/AdminNotificationBell';

export default function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [resultsDeclared, setResultsDeclared] = useState(false);

  const isAdminRoute = pathname.startsWith('/admin');
  const isAdminLogin = pathname === '/admin/login';
  const isCandidateDashboard = pathname.startsWith('/dashboard') || pathname.startsWith('/apply');
  const isAdmin = currentUser?.role === 'admin' || isAdminRoute;

  useEffect(() => {
    let isMounted = true;
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data?.user) setCurrentUser(data.user);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setAuthLoading(false);
      });

    fetch('/api/results/status')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data?.resultsDeclared) setResultsDeclared(true);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
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
    : isAdminRoute
      ? '/admin/dashboard'
      : '/';

  return (
    <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-30 shadow-subtle no-print flex-shrink-0">
      {/* Top Institutional Contact Strip */}
      <div className="bg-portal-navy text-slate-300 text-xs py-1.5 px-4 sm:px-8 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-4 flex-wrap text-[11px]">
            <span className="text-portal-gold font-medium">
              CBSE Affiliated Institutional Network
            </span>
            <span className="hidden sm:inline text-slate-600">|</span>
            <span>Helpline: +91-1744-259114, 9896328329</span>
            <span className="hidden md:inline text-slate-600">|</span>
            <span className="hidden md:inline">admissions@gurukuladmissions.org</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-portal-gold/20 text-portal-gold px-2 py-0.5 rounded text-[11px] font-semibold font-mono">
              Entrance Session 2027-28
            </span>
            {currentUser?.role === 'admin' && (
              <Link 
                href="/admin/dashboard" 
                className="text-portal-gold hover:text-white text-[11px] font-semibold bg-portal-gold/10 px-2 py-0.5 rounded border border-portal-gold/30 transition"
              >
                Admin Desk
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Brand Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex justify-between items-center">
        <Link href={brandRedirectHref} className="flex items-center gap-3.5 group">
          <div className="w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 flex items-center justify-center">
            <Image
              src="/logo-gurukul.png"
              alt="Gurukul Emblem"
              width={56}
              height={56}
              priority
              className="brand-logo-img object-contain"
            />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-portal-navy tracking-tight leading-none">
              GURUKUL
            </div>
            <p className="text-xs text-amber-700 font-semibold tracking-wide mt-1">
              तमसो मा ज्योतिर्गमय
            </p>
            <p className="text-[11px] text-slate-500 hidden sm:block mt-0.5">
              Entrance Examination &amp; Admission Portal
            </p>
          </div>
        </Link>

        {/* Desktop Quick Nav & Auth Actions */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-700">
          {isAdminLogin && !currentUser ? (
            <div className="flex items-center gap-3">
              <span className="bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold px-3 py-1 rounded-full">
                Administrative Examination Cell
              </span>
              <Link
                href="/"
                className="text-xs font-semibold text-slate-600 hover:text-portal-navy transition border border-slate-300 hover:border-slate-400 px-3 py-1.5 rounded-lg"
              >
                Return to Portal
              </Link>
            </div>
          ) : !isAdmin ? (
            <>
              <Link href="/status" className="hover:text-portal-navy transition">
                Check Status
              </Link>
              <Link href="/admit-card" className="hover:text-portal-navy transition">
                Admit Card
              </Link>
              {(resultsDeclared || isAdmin) && (
                <Link href="/result" className="hover:text-portal-navy transition">
                  Results
                </Link>
              )}
              <Link href="/contact" className="hover:text-portal-navy transition">
                Contact &amp; Helpdesk
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-700">
              <Link 
                href="/admin/dashboard" 
                className={`hover:text-portal-navy transition ${pathname === '/admin/dashboard' ? 'text-portal-navy font-bold' : ''}`}
              >
                Dashboard
              </Link>
              <Link 
                href="/admin/applications" 
                className={`hover:text-portal-navy transition ${pathname.startsWith('/admin/applications') ? 'text-portal-navy font-bold' : ''}`}
              >
                Applications
              </Link>
              <Link 
                href="/admin/enquiries" 
                className={`hover:text-portal-navy transition ${pathname.startsWith('/admin/enquiries') ? 'text-portal-navy font-bold' : ''}`}
              >
                Enquiries
              </Link>
              <Link 
                href="/admin/settings" 
                className={`hover:text-portal-navy transition ${pathname.startsWith('/admin/settings') ? 'text-portal-navy font-bold' : ''}`}
              >
                Settings
              </Link>
            </div>
          )}

          {currentUser && !currentUser.isTemporary ? (
            <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
              {currentUser?.role === 'admin' && <AdminNotificationBell />}
              <Link
                href={currentUser?.role === 'admin' ? '/admin/dashboard' : '/dashboard'}
                className="flex items-center gap-1.5 bg-slate-100 text-slate-800 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-200 transition"
              >
                <span>{currentUser?.name || (currentUser?.role === 'admin' ? 'Admin' : 'Candidate')}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : isAdminRoute ? (
            /* On ANY admin route, NEVER show candidate login or registration buttons */
            isAdminLogin ? null : (
              <div className="h-8 w-28 bg-slate-100/70 rounded-lg animate-pulse" />
            )
          ) : authLoading ? (
            <div className="h-8 w-32 bg-slate-100/70 rounded-lg animate-pulse" />
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition border ${
                  pathname === '/login'
                    ? 'border-portal-navy bg-slate-100 text-portal-navy'
                    : 'text-slate-700 hover:text-portal-navy border-slate-300 hover:border-slate-400'
                }`}
              >
                Candidate Login
              </Link>
              <Link
                href="/register"
                className="bg-portal-navy hover:bg-slate-900 text-white font-semibold px-4 py-1.5 rounded-lg text-xs shadow-xs transition"
              >
                New Registration
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile menu toggle */}
        <div className="lg:hidden flex items-center gap-2">
          {currentUser?.role === 'admin' && <AdminNotificationBell />}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-700 hover:text-portal-navy"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-slate-200 px-4 py-4 space-y-3 shadow-elevated">
          {!isAdmin ? (
            <div className="flex flex-col space-y-2 text-sm font-semibold text-slate-700">
              <Link
                href="/status"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 rounded-lg hover:bg-slate-100 transition"
              >
                Check Application Status
              </Link>
              <Link
                href="/admit-card"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 rounded-lg hover:bg-slate-100 transition"
              >
                Admit Card Portal
              </Link>
              {(resultsDeclared || isAdmin) && (
                <Link
                  href="/result"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 px-3 rounded-lg hover:bg-slate-100 transition"
                >
                  Entrance Examination Results
                </Link>
              )}
              <Link
                href="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 rounded-lg hover:bg-slate-100 transition"
              >
                Contact &amp; Helpdesk
              </Link>
            </div>
          ) : (
            <div className="flex flex-col space-y-2 text-sm font-semibold text-slate-700">
              <Link
                href="/admin/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 rounded-lg hover:bg-slate-100 transition"
              >
                Admin Dashboard
              </Link>
              <Link
                href="/admin/applications"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 rounded-lg hover:bg-slate-100 transition"
              >
                Manage Applications
              </Link>
              <Link
                href="/admin/enquiries"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 rounded-lg hover:bg-slate-100 transition"
              >
                Enquiry Inbox
              </Link>
              <Link
                href="/admin/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 rounded-lg hover:bg-slate-100 transition"
              >
                Portal Settings &amp; Schedule
              </Link>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100">
            {currentUser && !currentUser.isTemporary ? (
              <div className="space-y-2">
                <div className="text-xs text-slate-500 font-medium px-1">
                  Signed in as <strong>{currentUser?.name || currentUser?.email}</strong>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full py-2.5 px-3 bg-rose-50 text-rose-700 font-semibold text-xs rounded-lg text-center"
                >
                  Sign Out
                </button>
              </div>
            ) : isAdminRoute ? (
              /* On admin routes, never show candidate buttons */
              null
            ) : !authLoading ? (
              <div className="flex flex-col gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 px-4 border border-slate-300 text-slate-800 font-semibold text-xs rounded-lg"
                >
                  Candidate Login
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 px-4 bg-portal-navy text-white font-semibold text-xs rounded-lg shadow-xs"
                >
                  New Registration (2027-28)
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </header>
  );
}
