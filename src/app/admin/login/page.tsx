'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Mail, Lock, AlertCircle, ArrowLeft } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If already logged in as admin, redirect directly to dashboard
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
    <div className="min-h-[calc(100vh-250px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-900">
      <div className="max-w-md w-full space-y-6 bg-slate-800/90 p-8 sm:p-10 rounded-2xl shadow-2xl border border-slate-700 text-white">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto flex items-center justify-center">
            <Image
              src="/logo-gurukul.png"
              alt="Gurukul Logo"
              width={64}
              height={64}
              className="brand-logo-img object-contain"
            />
          </div>
          <div className="inline-flex items-center gap-1.5 bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full text-xs font-bold border border-amber-500/30">
            <ShieldCheck className="w-4 h-4" /> Official Examination Cell
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white uppercase">
            ADMIN GURUKUL
          </h2>
          <p className="text-xs text-slate-400">
            Admissions &amp; Verification Panel
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-lg bg-red-900/50 border border-red-700 flex items-center gap-2.5 text-xs text-red-200">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
              Staff Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@gurukulkurukshetra.com"
                className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
              Admin Security Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-gurukul-600 hover:from-amber-600 hover:to-gurukul-700 transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Verifying Admin Authorization...</span>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Enter Administration Console</span>
              </>
            )}
          </button>
        </form>

        {/* Demo fill button for reviewer convenience */}
        <div className="pt-4 border-t border-slate-700 text-center">
          <button
            type="button"
            onClick={fillDemoAdmin}
            className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-lg hover:bg-amber-500/20 transition inline-flex items-center gap-1.5"
          >
            <span>💡 Fill Super-Admin Demo Credentials</span>
          </button>
        </div>

        <div className="pt-2 text-center text-xs text-slate-400">
          <Link href="/" className="hover:text-amber-400 transition inline-flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Public Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
