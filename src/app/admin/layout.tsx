'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  CheckSquare, 
  Award, 
  Building, 
  FileSpreadsheet, 
  Settings, 
  LogOut, 
  ShieldCheck, 
  Menu, 
  X,
  ExternalLink
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);

  useEffect(() => {
    // Don't check on admin login page
    if (pathname === '/admin/login') return;

    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (!data.user || data.user.role !== 'admin') {
          router.push('/admin/login');
        } else {
          setAdminUser(data.user);
        }
      })
      .catch(() => router.push('/admin/login'));
  }, [pathname, router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  // If on login page, render children directly without sidebar
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const navItems = [
    { name: 'Analytics & Overview', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Candidate Applications', href: '/admin/applications', icon: Users },
    { name: 'Results & Merit List', href: '/admin/results', icon: Award },
    { name: 'Attendance Registers', href: '/admin/attendance', icon: CheckSquare },
    { name: 'Examination Centres', href: '/admin/centers', icon: Building },
    { name: 'Reports & Analytics', href: '/admin/reports', icon: FileSpreadsheet },
    { name: 'System Audit Logs', href: '/admin/audit-logs', icon: ShieldCheck },
    { name: 'Portal Schedule & Settings', href: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <div className="md:hidden bg-gurukul-navy text-white p-4 flex justify-between items-center sticky top-0 z-40 shadow-md">
        <Link href="/admin/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 flex items-center justify-center">
            <Image src="/logo-gurukul.png" alt="Logo" width={32} height={32} className="brand-logo-sm object-contain" />
          </div>
          <span className="font-black text-sm tracking-tight">GURUKUL ADMIN</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 text-slate-300 hover:text-white"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Admin Sidebar Navigation */}
      <aside
        className={`w-64 bg-gurukul-navy text-white flex-shrink-0 flex flex-col justify-between transition-all duration-300 z-30 fixed md:sticky top-0 md:top-[128px] h-screen md:h-[calc(100vh-128px)] overflow-y-auto ${
          sidebarOpen ? 'left-0' : '-left-64 md:left-0'
        }`}
      >
        <div className="p-5 space-y-6">
          {/* Brand Logo & Title */}
          <Link href="/admin/dashboard" className="flex items-center gap-3 border-b border-slate-700/80 pb-4 hover:opacity-90 transition group">
            <div className="w-11 h-11 flex-shrink-0 flex items-center justify-center">
              <Image
                src="/logo-gurukul.png"
                alt="Gurukul Crest"
                width={44}
                height={44}
                className="brand-logo-sm object-contain group-hover:scale-105 transition-transform"
              />
            </div>
            <div>
              <h2 className="font-black text-sm tracking-tight text-white leading-snug">
                GURUKUL KURUKSHETRA
              </h2>
              <span className="text-[10px] font-mono text-amber-400 font-bold block">
                ADMINISTRATION DESK
              </span>
            </div>
          </Link>

          {/* Navigation Items */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-amber-500 text-gurukul-navy shadow-md font-black'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-gurukul-navy' : 'text-amber-400'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Profile & Prominent Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/70 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">
                {adminUser?.name || 'Administrator'}
              </p>
              <p className="text-[10px] text-slate-400 font-mono">Super Admin</p>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <Link
              href="/"
              target="_blank"
              className="w-full py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold text-center flex items-center justify-center gap-1.5 transition"
              title="View Public Site"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View Portal Home</span>
            </Link>
            <button
              onClick={handleLogout}
              className="w-full py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold text-center flex items-center justify-center gap-2 shadow-lg transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out / Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto overflow-y-auto w-full">
        {children}
      </main>
    </div>
  );
}
