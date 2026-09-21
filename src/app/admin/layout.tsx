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
  FileSpreadsheet,
  Settings,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  Bell,
  MessageSquare
} from 'lucide-react';
import AdminFooter from '@/components/AdminFooter';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);

  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [unreadEnquiryCount, setUnreadEnquiryCount] = useState(0);

  useEffect(() => {
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

    const fetchCounters = () => {
      fetch('/api/admin/notifications?limit=1')
        .then((res) => res.json())
        .then((data) => {
          if (data.unreadCount !== undefined) setUnreadNotifCount(data.unreadCount);
        })
        .catch(() => {});

      fetch('/api/admin/enquiries?status=new')
        .then((res) => res.json())
        .then((data) => {
          if (data.enquiries) setUnreadEnquiryCount(data.enquiries.length);
        })
        .catch(() => {});
    };

    fetchCounters();
    const interval = setInterval(fetchCounters, 20000);

    const handleNotifCountUpdate = (e: Event) => {
      const evt = e as CustomEvent<{ unreadCount: number }>;
      if (typeof evt.detail?.unreadCount === 'number') {
        setUnreadNotifCount(evt.detail.unreadCount);
      }
    };
    window.addEventListener('gurukul:notif-count-update', handleNotifCountUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('gurukul:notif-count-update', handleNotifCountUpdate);
    };
  }, [pathname, router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const navItems = [
    { name: 'Analytics & Overview', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Candidate Applications', href: '/admin/applications', icon: Users },
    { name: 'Contact Enquiries', href: '/admin/enquiries', icon: MessageSquare, badge: unreadEnquiryCount },
    { name: 'Notification Center', href: '/admin/notifications', icon: Bell, badge: unreadNotifCount },
    { name: 'Results & Merit List', href: '/admin/results', icon: Award },
    { name: 'Attendance Registers', href: '/admin/attendance', icon: CheckSquare },
    { name: 'Reports & Demographics', href: '/admin/reports', icon: FileSpreadsheet },
    { name: 'System Audit Logs', href: '/admin/audit-logs', icon: ShieldCheck },
    { name: 'Portal Settings', href: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="flex-1 min-h-screen w-full bg-transparent flex flex-col md:flex-row font-sans">
      {/* Mobile Top Bar */}
      <div className="md:hidden print:hidden bg-portal-navy text-white p-3 flex justify-between items-center z-40 border-b border-slate-800 flex-shrink-0">
        <Link href="/admin/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 flex items-center justify-center">
            <Image src="/logo-gurukul.png" alt="Logo" width={28} height={28} className="brand-logo-sm object-contain" />
          </div>
          <span className="font-bold text-xs tracking-tight">ADMIN GURUKUL</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/notifications"
            className="relative p-1.5 text-slate-300 hover:text-white"
            title="Notifications"
          >
            <Bell className="w-5 h-5 text-portal-gold" />
            {unreadNotifCount > 0 && (
              <span className="absolute top-0 right-0 bg-rose-600 text-white font-mono text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
              </span>
            )}
          </Link>
          <button
            onClick={handleLogout}
            className="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1"
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

      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden print:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Admin Sidebar Navigation */}
      <aside
        className={`print:hidden w-64 bg-portal-navy text-white flex-shrink-0 flex flex-col justify-between transition-transform duration-200 z-20 fixed md:sticky inset-y-0 left-0 md:top-[96px] md:h-[calc(100vh-96px)] overflow-hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex-shrink-0">
          <Link href="/admin/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
              <Image
                src="/logo-gurukul.png"
                alt="Gurukul Crest"
                width={40}
                height={40}
                className="brand-logo-sm object-contain"
              />
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-tight text-white leading-snug">
                ADMIN GURUKUL
              </h2>
              <span className="text-[10px] font-mono text-portal-gold font-medium block">
                EXAMINATION DESK
              </span>
            </div>
          </Link>
        </div>

        {/* Scrollable Nav Items */}
        <div className="p-3 flex-1 overflow-y-auto min-h-0 space-y-1">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                    isActive
                      ? 'bg-portal-gold text-slate-950 font-bold shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                        isActive
                          ? 'bg-slate-950 text-portal-gold'
                          : 'bg-rose-600 text-white'
                      }`}
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Profile */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex-shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-portal-gold/20 text-portal-gold border border-portal-gold/30 flex items-center justify-center text-xs font-bold flex-shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">
                {adminUser?.name || 'Administrator'}
              </p>
              <p className="text-[10px] text-slate-400 font-mono">Examination Board</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area with Natural Scroll & Admin Footer */}
      <div className="flex-1 flex flex-col min-w-0 bg-transparent print:p-0 print:m-0">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full pb-16 print:p-0 print:m-0 print:pb-0">
          <div className="max-w-6xl mx-auto print:max-w-none print:m-0 print:p-0">
            {children}
          </div>
        </main>
        <div className="print:hidden">
          <AdminFooter />
        </div>
      </div>
    </div>
  );
}
