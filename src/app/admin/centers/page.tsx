'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Settings } from 'lucide-react';

export default function AdminCentersPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to Portal Schedule & Settings where venue, date, and time are centrally configured
    router.replace('/admin/settings');
  }, [router]);

  return (
    <div className="max-w-xl mx-auto my-16 p-8 portal-card text-center space-y-4">
      <div className="w-12 h-12 rounded-xl bg-slate-100 text-portal-navy flex items-center justify-center mx-auto">
        <Settings className="w-6 h-6" />
      </div>
      <h1 className="text-xl font-bold tracking-tight text-slate-900">
        Examination Venue Management
      </h1>
      <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
        Examination centre venue details, entrance test dates, and reporting times are centrally managed under <strong>Portal Schedule &amp; Settings</strong>.
      </p>
      <div className="pt-2">
        <Link
          href="/admin/settings"
          className="btn-primary inline-flex text-xs px-5 py-2.5"
        >
          Go to Portal Schedule &amp; Settings
        </Link>
      </div>
    </div>
  );
}
