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
  ExternalLink,
  Bell,
  MessageSquare
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);

  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [unreadEnquiryCount, setUnreadEnquiryCount] = useState(0);

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

    // Fetch unread counters
    const fetchCounters = () => {
      fetch('/api/admin/notifications?limit=1')
        .then((res) => res.json())
        .then((data) => {
          if (data.unreadCount !== undefined) setUnreadNotifCount(data.unreadCount);
        })
        .catch(() => { });

      fetch('/api/admin/enquiries?status=new')
        .then((res) => res.json())
        .then((data) => {
          if (data.enquiries) setUnreadEnquiryCount(data.enquiries.length);
        })
        .catch(() => { });
    };

    fetchCounters();
    const interval = setInterval(fetchCounters, 20000);

    // Immediately sync the sidebar badge when the bell marks notifications as read
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

  // If on login page, render children directly without sidebar
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
          <Link
            href="/admin/notifications"
            className="relative p-1.5 text-slate-300 hover:text-white"
            title="Notifications"
          >
            <Bell className="w-5 h-5 text-amber-400" />
            {unreadNotifCount > 0 && (
              <span className="absolute top-0 right-0 bg-red-600 text-white font-mono text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
              </span>
            )}
          </Link>
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
        className={`w-64 bg-gurukul-navy text-white flex-shrink-0 flex flex-col justify-between transition-all duration-300 z-30 fixed md:sticky top-0 md:top-[128px] h-screen md:h-[calc(100vh-128px)] overflow-y-auto ${sidebarOpen ? 'left-0' : '-left-64 md:left-0'
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
                GURUKUL
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
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${isActive
                      ? 'bg-amber-500 text-gurukul-navy shadow-md font-black'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-gurukul-navy' : 'text-amber-400'}`} />
                    <span>{item.name}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`text-[10px] font-mono font-extrabold px-1.5 py-0.2 rounded-full ${isActive
                          ? 'bg-gurukul-navy text-amber-400'
                          : 'bg-red-600 text-white'
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
        <div className="p-4 border-t border-slate-800 bg-slate-900/70">
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
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto overflow-y-auto w-full">
        {children}
      </main>
    </div>
  );
}
