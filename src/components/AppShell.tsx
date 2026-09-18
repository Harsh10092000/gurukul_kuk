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
      <div className="min-h-screen w-full flex flex-col bg-slate-50 text-slate-900">
        <Header />
        <div className="flex-1 flex flex-col w-full">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header />
      <main className="flex-grow">{children}</main>
      <Footer />
    </div>
  );
}
