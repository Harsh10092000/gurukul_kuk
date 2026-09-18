'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminArea = pathname.startsWith('/admin') && pathname !== '/admin/login';

  if (isAdminArea) {
    return (
      <div className="min-h-screen w-full flex flex-col text-slate-900">
        <Header />
        <div className="flex-1 flex flex-col w-full bg-gradient-to-br from-[#dbeafe] via-[#fffdf8] via-45% to-[#fde1be]">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col text-slate-900">
      <Header />
      <main className="flex-grow bg-gradient-to-br from-[#dbeafe] via-[#fffdf8] via-45% to-[#fde1be] flex flex-col">{children}</main>
      <Footer />
    </div>
  );
}
