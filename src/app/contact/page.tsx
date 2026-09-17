'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  HelpCircle,
  FileText
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
      setErrorMsg('Please enter a valid 10-digit Indian contact mobile number (starting with 6, 7, 8, or 9).');
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
      setErrorMsg('Please describe your enquiry or query in detail (minimum 10 characters).');
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
      setErrorMsg('Network connection error. Please try submitting again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-8">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Header Title */}
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
            Admissions & Examination Helpdesk
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-gurukul-navy tracking-tight">
            Contact Admissions Cell
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Have questions regarding Entrance Examination 2027-28, eligibility, syllabus, or admit cards? Send us a message or contact our helpdesk directly.
          </p>
        </div>

        {/* Grid: Campus Info + Online Contact Form */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          {/* Left 2 Cols: Campus Info & Helplines */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gurukul-navy text-white rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl border border-slate-800">
              <div className="space-y-2">
                <h3 className="text-lg font-black text-white">
                  Gurukul Kurukshetra Campus
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Founded in 1912 by Swami Shraddhanand Ji. CBSE Affiliated (No. 530006). Residential Senior Secondary School with specialized NDA Wing.
                </p>
              </div>

              <div className="space-y-4 text-xs text-slate-200">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">Campus Location</span>
                    <span className="text-slate-300 leading-relaxed">
                      Near 3rd Gate, Kurukshetra University, Kurukshetra, Haryana - 136119, India
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">Helpline Numbers</span>
                    <div className="font-mono text-amber-300 text-xs space-y-0.5">
                      <div>+91-1744-259114, 259115</div>
                      <div>+91-9896328329 / 7015886675</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">Official Email</span>
                    <span className="text-slate-300">admissions@gurukulkurukshetra.com</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">Office Hours</span>
                    <span className="text-slate-300">Monday to Saturday: 08:30 AM - 04:30 PM (IST)</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-700/80 space-y-2">
                <span className="text-[11px] font-bold text-amber-400 block uppercase tracking-wider">
                  Important Regulatory Notice
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Merit-based admission strictly through written entrance examination. No donations or capitation fees are accepted under any circumstances.
                </p>
              </div>
            </div>

            {/* Quick Candidate Links Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3 text-xs">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Existing Candidates
              </h4>
              <p className="text-slate-600 leading-relaxed">
                Already registered or submitted an application? You can track scrutiny status or retrieve your registration number directly.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Link
                  href="/status"
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-1.5 rounded-xl transition inline-flex items-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-600" /> Check Status
                </Link>
                <Link
                  href="/login"
                  className="bg-gurukul-navy hover:bg-slate-800 text-white font-bold px-3.5 py-1.5 rounded-xl transition shadow-xs"
                >
                  Candidate Login
                </Link>
              </div>
            </div>
          </div>

          {/* Right 3 Cols: Online Enquiry Form */}
          <div className="lg:col-span-3 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-6">
            <div>
              <h3 className="text-xl font-black text-gurukul-navy">
                Submit an Online Admission Enquiry
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Fill in your particulars below. The Examination Controller and Admissions Helpdesk will review and respond directly to your contact number or email.
              </p>
            </div>

            {successMsg ? (
              <div className="p-6 bg-emerald-50 border-2 border-emerald-300 rounded-3xl text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h4 className="text-base font-black text-emerald-950">
                  Enquiry Submitted Successfully!
                </h4>
                <p className="text-xs text-emerald-800 leading-relaxed max-w-md mx-auto">
                  {successMsg}
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setSuccessMsg(null)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition shadow"
                  >
                    Submit Another Query
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                {errorMsg && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Rajesh Sharma"
                      className="w-full border rounded-xl p-2.5 font-medium text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="name@example.com"
                      className="w-full border rounded-xl p-2.5 font-medium text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block font-bold text-slate-700">
                        Contact Mobile Number <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[10px] font-mono text-slate-400">
                        {formData.phone.length}/10 digits
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 font-bold text-slate-400 select-none text-xs">
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
                        className="w-full border rounded-xl pl-12 pr-3 py-2.5 font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500 font-mono tracking-wider"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Application No. <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.applicationNumber}
                      onChange={(e) => setFormData({ ...formData, applicationNumber: e.target.value })}
                      placeholder="e.g. GK26-10001"
                      className="w-full border rounded-xl p-2.5 font-mono text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Enquiry Subject / Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full border rounded-xl p-2.5 font-medium text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Admission Process & Eligibility">Admission Process & Eligibility</option>
                    <option value="Document Verification Query">Document Verification Query</option>
                    <option value="Entrance Syllabus & Examination Pattern">Entrance Syllabus & Examination Pattern</option>
                    <option value="Exam Centre Allotment & Hall Ticket">Exam Centre Allotment & Hall Ticket</option>
                    <option value="Application Fee Payment & Verification">Application Fee Payment & Verification</option>
                    <option value="Hostel & Residential Facilities">Hostel & Residential Facilities</option>
                    <option value="NDA Wing Specialized Training">NDA Wing Specialized Training</option>
                    <option value="Other General Enquiry">Other General Enquiry</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Detailed Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={5}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Please provide complete details regarding your enquiry so that the admission committee can provide an accurate clarification..."
                    className="w-full border rounded-2xl p-3 text-slate-800 font-medium outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-amber-500 to-gurukul-600 hover:from-amber-600 hover:to-gurukul-700 text-white font-extrabold text-sm py-3.5 rounded-2xl shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Transmitting Enquiry to Admission Cell...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Enquiry to Helpdesk</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

