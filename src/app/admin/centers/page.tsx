'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Settings, ArrowRight } from 'lucide-react';

export default function AdminCentersPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to Portal Schedule & Settings where venue, date, and time are centrally configured
    router.replace('/admin/settings');
  }, [router]);

  return (
    <div className="max-w-2xl mx-auto my-12 p-8 bg-white border border-slate-200 rounded-2xl shadow-sm text-center space-y-4">
      <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
        <Settings className="w-6 h-6" />
      </div>
      <h1 className="text-xl font-black text-gurukul-navy">
        Examination Venue Management Moved
      </h1>
      <p className="text-xs text-slate-500 max-w-md mx-auto">
        Examination centre venue details, entrance test dates, and reporting times are now centrally managed under <strong>Portal Schedule &amp; Settings</strong>.
      </p>
      <div className="pt-2">
        <Link
          href="/admin/settings"
          className="inline-flex items-center gap-2 bg-gurukul-navy hover:bg-slate-800 text-amber-300 font-bold text-xs px-5 py-2.5 rounded-xl shadow transition"
        >
          <span>Go to Portal Schedule &amp; Settings</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
