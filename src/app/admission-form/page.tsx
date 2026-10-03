'use client';

import React, { useEffect } from 'react';

export default function CandidateAdmissionFormPage() {
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data?.user?.role === 'admin') {
          window.location.replace('/admin/dashboard');
        } else {
          window.location.replace('/dashboard');
        }
      })
      .catch(() => {
        window.location.replace('/dashboard');
      });
  }, []);

  return (
    <div className="min-h-[70vh] flex items-center justify-center font-sans">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-portal-navy border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-bold text-slate-600">Redirecting to Dashboard...</p>
      </div>
    </div>
  );
}

