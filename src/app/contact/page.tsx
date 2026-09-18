'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  CheckCircle2, 
  AlertCircle
} from 'lucide-react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    applicationNumber: '',
    subject: 'Admission Process & Eligibility',
    message: '',
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanPhone = formData.phone.replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9).');
      return;
    }

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (!formData.message.trim() || formData.message.trim().length < 10) {
      setErrorMsg('Please describe your enquiry in detail (minimum 10 characters).');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: cleanPhone,
          applicationNumber: formData.applicationNumber.trim() || undefined,
          subject: formData.subject,
          message: formData.message.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || 'Your enquiry has been received successfully.');
        setFormData({
          name: '',
          email: '',
          phone: '',
          applicationNumber: '',
          subject: 'Admission Process & Eligibility',
          message: '',
        });
      } else {
        setErrorMsg(data.error || 'Failed to submit enquiry. Please try again.');
      }
    } catch {
      setErrorMsg('Network error. Please try submitting again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-portal-navy bg-white border border-slate-200 px-3 py-1 rounded">
            Helpdesk &amp; Support
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Contact Admissions Cell
          </h1>
          <p className="text-xs text-slate-500">
            Have questions regarding Entrance Examination 2027-28, eligibility, syllabus, or admit cards? Reach out to our admissions team.
          </p>
        </div>

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          {/* Left Column: Campus Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-portal-navy text-white rounded-xl p-6 space-y-5">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">
                  Gurukul Kurukshetra Campus
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Founded in 1912 by Swami Shraddhanand Ji. CBSE Affiliated (No. 530006). Residential Senior Secondary School with specialized NDA Wing.
                </p>
              </div>

              <div className="space-y-3.5 text-xs text-slate-200">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white block">Location</span>
                    <span className="text-slate-300 leading-normal">
                      Near 3rd Gate, Kurukshetra University, Kurukshetra, Haryana - 136119, India
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Phone className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white block">Helpline Numbers</span>
                    <div className="font-mono text-slate-300 text-xs space-y-0.5">
                      <div>01744-259114, 259115</div>
                      <div>+91-9896328329 / 7015886675</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Mail className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white block">Official Email</span>
                    <span className="text-slate-300">admissions@gurukulkurukshetra.com</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white block">Working Hours</span>
                    <span className="text-slate-300">Monday to Saturday: 08:30 AM - 04:30 PM</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-700 space-y-1">
                <span className="text-[11px] font-semibold text-amber-300 block uppercase tracking-wider">
                  Notice
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Admissions are purely merit-based through written entrance examination. No donations or capitation fees are accepted under any circumstances.
                </p>
              </div>
            </div>

            {/* Existing Candidates Quick Card */}
            <div className="portal-card p-5 space-y-2.5 text-xs">
              <h4 className="font-bold text-slate-900">
                Registered Candidates
              </h4>
              <p className="text-slate-600 leading-normal">
                Already submitted an entrance application? You can track scrutiny status or retrieve your registration number directly.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Link
                  href="/status"
                  className="btn-secondary text-xs px-3 py-1.5"
                >
                  Check Status
                </Link>
                <Link
                  href="/login"
                  className="btn-primary text-xs px-3 py-1.5"
                >
                  Candidate Login
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column: Enquiry Form */}
          <div className="lg:col-span-3 portal-card p-6 sm:p-8 space-y-5">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Submit an Admission Enquiry
              </h3>
              <p className="text-xs text-slate-500">
                Fill in your particulars below and our admissions team will respond via phone or email.
              </p>
            </div>

            {successMsg ? (
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-lg text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="text-sm font-bold text-emerald-950">
                  Enquiry Submitted Successfully
                </h4>
                <p className="text-xs text-emerald-800 leading-relaxed max-w-sm mx-auto">
                  {successMsg}
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setSuccessMsg(null)}
                    className="btn-primary text-xs px-4 py-2"
                  >
                    Submit Another Query
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Rajesh Sharma"
                      className="form-input-field"
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="name@example.com"
                      className="form-input-field"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">
                      Mobile Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 font-semibold text-slate-400 select-none text-xs">
                        +91
                      </span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        pattern="[6-9][0-9]{9}"
                        maxLength={10}
                        required
                        value={formData.phone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setFormData({ ...formData, phone: val });
                        }}
                        placeholder="9876543210"
                        className="form-input-field pl-10 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label">
                      Application No. <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.applicationNumber}
                      onChange={(e) => setFormData({ ...formData, applicationNumber: e.target.value })}
                      placeholder="e.g. NILB-00001"
                      className="form-input-field font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">
                    Enquiry Subject <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="form-input-field"
                  >
                    <option value="Admission Process & Eligibility">Admission Process &amp; Eligibility</option>
                    <option value="Document Verification Query">Document Verification Query</option>
                    <option value="Entrance Syllabus & Examination Pattern">Entrance Syllabus &amp; Examination Pattern</option>
                    <option value="Exam Centre Allotment & Hall Ticket">Exam Centre Allotment &amp; Hall Ticket</option>
                    <option value="Application Fee Payment & Verification">Application Fee Payment &amp; Verification</option>
                    <option value="Hostel & Residential Facilities">Hostel &amp; Residential Facilities</option>
                    <option value="NDA Wing Specialized Training">NDA Wing Specialized Training</option>
                    <option value="Other General Enquiry">Other General Enquiry</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">
                    Message <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Provide details regarding your enquiry..."
                    className="form-input-field h-auto py-2.5"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary text-xs py-2.5 font-bold"
                >
                  {loading ? 'Submitting Enquiry...' : 'Submit Enquiry'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
