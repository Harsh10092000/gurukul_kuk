'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          if (data.user.role === 'admin') {
            router.replace('/admin/dashboard');
          } else {
            router.replace('/dashboard');
          }
        }
      })
      .catch(() => {});
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Authentication failed.');
        setLoading(false);
        return;
      }

      if (data.user.role !== 'admin') {
        setError('Access denied. This portal is restricted to authorized Gurukul staff only.');
        setLoading(false);
        return;
      }

      router.push('/admin/dashboard');
    } catch (err) {
      setError('An error occurred during authentication.');
      setLoading(false);
    }
  };

  const fillDemoAdmin = () => {
    setEmail('admin@gurukulkurukshetra.com');
    setPassword('Admin@Gurukul2026');
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8 bg-slate-100 font-sans">
      <div className="w-full max-w-3xl flex rounded-2xl overflow-hidden shadow-sm border border-slate-200 self-center">

        {/* Left Panel — Navy Institution Branding */}
        <div className="hidden md:flex flex-col justify-between w-2/5 portal-card-navy px-8 py-10">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Image
                src="/logo-gurukul.png"
                alt="Gurukul Logo"
                width={40}
                height={40}
                className="object-contain opacity-90"
              />
              <div>
                <div className="text-white font-black text-lg tracking-tight leading-tight">GURUKUL</div>
                <div className="text-slate-300 text-[10px] font-semibold uppercase tracking-widest">Kurukshetra</div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <span className="portal-badge-gold text-[10px] uppercase">Administrative Console</span>
              <h2 className="text-white font-bold text-lg leading-snug">
                Examination &amp; Admissions Management Portal
              </h2>
              <p className="text-slate-300 text-xs leading-relaxed">
                Restricted access for authorized Gurukul Examination Board officers and administrative staff only.
              </p>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 space-y-1.5">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Gurukul Kurukshetra</div>
            <p className="text-slate-400 text-[11px]">Session 2027-28 · CBSE Affiliated</p>
            <p className="text-slate-500 text-[11px]">01744-259114 · 9896328329</p>
          </div>
        </div>

        {/* Right Panel — Login Form */}
        <div className="flex-1 bg-white px-8 py-10 flex flex-col justify-center space-y-6">

          {/* Mobile header (hidden on md+) */}
          <div className="flex md:hidden items-center gap-2 mb-1">
            <Image src="/logo-gurukul.png" alt="Gurukul Logo" width={28} height={28} className="object-contain" />
            <span className="font-black text-portal-navy text-sm tracking-tight">GURUKUL Admin</span>
          </div>

          <div className="space-y-1">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Sign in to Admin Console</h1>
            <p className="text-xs text-slate-500">Enter your authorized staff credentials to continue.</p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700 font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="form-label">
                Staff Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@gurukulkurukshetra.com"
                className="form-input-field"
              />
            </div>

            <div>
              <label className="form-label">
                Admin Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="form-input-field"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2"
            >
              {loading ? 'Verifying Authorization...' : 'Sign In to Admin Console'}
            </button>
          </form>

          <div className="pt-3 border-t border-slate-100 text-center space-y-2">
            <button
              type="button"
              onClick={fillDemoAdmin}
              className="text-xs text-portal-navy hover:underline font-medium"
            >
              Fill Demo Administrator Credentials
            </button>
            <div>
              <Link href="/" className="text-xs text-slate-500 hover:text-slate-800 transition">
                Return to Public Portal
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
