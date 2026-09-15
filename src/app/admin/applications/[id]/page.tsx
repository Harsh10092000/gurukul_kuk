'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  FileText, 
  Printer, 
  Calendar, 
  Building, 
  User, 
  Users, 
  MapPin, 
  GraduationCap, 
  ExternalLink,
  ShieldCheck,
  Trash2,
  Eye,
  X,
  Check
} from 'lucide-react';
import { Application, AdmitCard } from '@/lib/types';

export default function ApplicationVerificationPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [application, setApplication] = useState<Application | null>(null);
  const [admitCard, setAdmitCard] = useState<AdmitCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDocPreview, setSelectedDocPreview] = useState<{ title: string; url: string } | null>(null);
  const [demandedDocs, setDemandedDocs] = useState<string[]>([]);
  const [notificationMsg, setNotificationMsg] = useState('');

  useEffect(() => {
    // Fetch application details
    fetch(`/api/applications/${params.id}`)
      .then((res) => res.json())
      .then(async (data) => {
        if (data.application) {
          setApplication(data.application);
          setRemarks(data.application.remarks || '');

          // Check if admit card exists
          const admitRes = await fetch(`/api/admit-card?appId=${data.application.id}`);
          const admitData = await admitRes.json();
          if (admitData.admitCard) setAdmitCard(admitData.admitCard);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  const updateStatus = async (status: Application['status'], customRemark?: string) => {
    setActionLoading(true);
    setShowCorrectionModal(false);
    setShowRejectModal(false);
    try {
      const res = await fetch(`/api/applications/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          remarks: customRemark !== undefined ? customRemark : remarks,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setApplication(data.application);
        setNotificationMsg(`Status updated to ${status.replace('_', ' ').toUpperCase()}`);
        setTimeout(() => setNotificationMsg(''), 4000);
      }
    } catch {
      alert('Failed to update status.');
    } finally {
      setActionLoading(false);
      setShowCorrectionModal(false);
      setShowRejectModal(false);
    }
  };

  const handleDeleteApplication = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/applications/${params.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        router.push('/admin/applications');
      } else {
        alert(data.error || 'Failed to delete application.');
      }
    } catch {
      alert('Failed to delete application.');
    } finally {
      setActionLoading(false);
      setShowDeleteModal(false);
    }
  };

  const handleGenerateAdmitCard = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/admit-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: application?.id,
          examCentreName: application?.examCentrePref.preferredCenter1,
          examDate: '06 December 2026',
          reportingTime: '08:30 AM',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAdmitCard(data.admitCard);
        setNotificationMsg(`Admit card issued successfully! Roll Number: ${data.admitCard.rollNumber}`);
        setTimeout(() => setNotificationMsg(''), 4000);
      }
    } catch {
      alert('Failed to issue admit card.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-xs text-slate-500">Loading candidate dossier...</div>;
  }

  if (!application) {
    return <div className="py-20 text-center text-xs text-red-500">Candidate application not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/applications"
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
          >
            <ArrowLeft className="w-4 h-4 text-slate-700" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-500">
                {application.applicationNumber}
              </span>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                  application.status === 'approved'
                    ? 'bg-emerald-100 text-emerald-800'
                    : application.status === 'correction_needed'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {application.status.replace('_', ' ')}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gurukul-navy">
              Verification Desk: {application.personalInfo.fullName}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Action Buttons */}
          <Link
            href={`/admin/applications/${application.id}/admission-form`}
            className="bg-gurukul-navy hover:bg-slate-800 text-amber-300 font-bold px-3.5 py-2 rounded-xl text-xs shadow flex items-center gap-1.5 transition border border-amber-400/40"
            title="Generate & print official physical Admission Verification & Enrolment Form"
          >
            <Printer className="w-4 h-4" />
            <span>Print Admission Form</span>
          </Link>

          <button
            onClick={() => updateStatus('approved', 'Document verification approved by Examination Committee.')}
            disabled={actionLoading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow flex items-center gap-1.5 transition"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Approve Dossier</span>
          </button>

          <button
            onClick={() => {
              setRemarks(application.remarks || '');
              setShowCorrectionModal(true);
            }}
            disabled={actionLoading}
            className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-4 py-2 rounded-xl text-xs shadow flex items-center gap-1.5 transition"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Demand Details / Correction</span>
          </button>

          <button
            onClick={() => {
              setRemarks('Application rejected: Does not meet admission eligibility criteria.');
              setShowRejectModal(true);
            }}
            disabled={actionLoading}
            className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-2 rounded-xl text-xs shadow flex items-center gap-1.5 transition"
          >
            <XCircle className="w-4 h-4" />
            <span>Reject Application</span>
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={actionLoading}
            className="bg-slate-100 hover:bg-red-50 text-red-600 hover:text-red-700 border border-red-200 font-bold px-3 py-2 rounded-xl text-xs shadow-sm flex items-center gap-1.5 transition"
            title="Permanently delete this candidate application"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Dossier</span>
          </button>
        </div>
      </div>

      {notificationMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Main Grid: Details + Document Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Comprehensive Candidate Dossier */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Personal & Guardian Particulars */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b pb-3">
              <User className="w-4 h-4 text-gurukul-600" /> 1. Personal & Guardian Particulars
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block">Candidate Name:</span>
                <span className="font-bold text-slate-900 uppercase">{application.personalInfo.fullName}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Date of Birth:</span>
                <span className="font-bold text-slate-900">{application.personalInfo.dob}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Gender / Category:</span>
                <span className="font-bold text-slate-900">{application.personalInfo.gender} ({application.personalInfo.category})</span>
              </div>
              <div>
                <span className="text-slate-400 block">Aadhaar Number:</span>
                <span className="font-mono font-bold text-slate-900">{application.personalInfo.aadhaarNumber}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Blood Group:</span>
                <span className="font-bold text-slate-900">{application.personalInfo.bloodGroup || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Applying For:</span>
                <span className="font-bold text-gurukul-700 bg-amber-100 px-2 py-0.5 rounded inline-block">
                  {application.classApplying}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block">Father&apos;s Name:</span>
                <span className="font-bold text-slate-900">{application.parentInfo.fatherName}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Father&apos;s Occupation:</span>
                <span className="text-slate-800">{application.parentInfo.fatherOccupation}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Father&apos;s Mobile:</span>
                <span className="font-mono font-bold text-slate-900">{application.parentInfo.fatherPhone}</span>
              </div>

              <div>
                <span className="text-slate-400 block">Mother&apos;s Name:</span>
                <span className="font-bold text-slate-900">{application.parentInfo.motherName}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Mother&apos;s Occupation:</span>
                <span className="text-slate-800">{application.parentInfo.motherOccupation}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Annual Income:</span>
                <span className="font-medium text-slate-800">₹{application.parentInfo.annualIncome}</span>
              </div>
            </div>
          </div>

          {/* 2. Academic History & Examination Centre */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b pb-3">
              <GraduationCap className="w-4 h-4 text-gurukul-600" /> 2. Academic & Centre Preferences
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block">Previous School:</span>
                <span className="font-semibold text-slate-900">{application.academicInfo.previousSchoolName}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Previous Board:</span>
                <span className="font-medium text-slate-800">{application.academicInfo.previousBoard}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Last Exam Marks:</span>
                <span className="font-bold text-slate-900 text-sm text-emerald-700">
                  {application.academicInfo.previousClassMarksPercentage}
                </span>
              </div>

              <div className="sm:col-span-2">
                <span className="text-slate-400 block">1st Centre Preference:</span>
                <span className="font-bold text-gurukul-navy text-xs">
                  {application.examCentrePref.preferredCenter1}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">2nd Centre Preference:</span>
                <span className="text-slate-700 text-xs">
                  {application.examCentrePref.preferredCenter2}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Admit Card Generation Box */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md space-y-4">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <h3 className="font-bold text-sm text-amber-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Examination Roll Number & Admit Card
              </h3>
              {admitCard && (
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                  Admit Card Active
                </span>
              )}
            </div>

            {admitCard ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block">Assigned Roll No:</span>
                  <span className="font-mono font-black text-amber-400 text-base">{admitCard.rollNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Exam Date:</span>
                  <span className="font-semibold text-white">{admitCard.examDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Centre:</span>
                  <span className="font-semibold text-white">{admitCard.examCentreName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Seating Room:</span>
                  <span className="font-semibold text-white">{admitCard.roomNumber}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <p className="text-xs text-slate-300">
                  Click below to assign an automated roll number and release the candidate&apos;s printable Hall Ticket.
                </p>
                <button
                  onClick={handleGenerateAdmitCard}
                  disabled={actionLoading}
                  className="bg-amber-500 hover:bg-amber-600 text-gurukul-navy font-black text-xs px-4 py-2 rounded-xl transition shadow flex-shrink-0"
                >
                  Generate & Release Admit Card
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Document Inspector Desk */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm border-b pb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gurukul-600" /> Uploaded Document Inspector
            </h3>

            {/* All 5 Uploaded Documents Inspection Cards */}
            <div className="space-y-4">
              {[
                { key: 'photo', title: '1. Candidate Photograph', defaultHeight: 'h-44' },
                { key: 'signature', title: '2. Candidate Signature', defaultHeight: 'h-24' },
                { key: 'parentSignature', title: '3. Parent / Guardian Signature', defaultHeight: 'h-24' },
                { key: 'aadhaarCard', title: '4. Candidate Aadhaar / ID Proof', defaultHeight: 'h-36' },
                { key: 'lastMarksheet', title: '5. Previous Class Marksheet', defaultHeight: 'h-36' },
              ].map((docItem) => {
                const docUrl = (application.documents as any)?.[docItem.key];
                const isPdf = docUrl && (docUrl.startsWith('data:application/pdf') || docUrl.toLowerCase().endsWith('.pdf'));

                return (
                  <div key={docItem.key} className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-800">{docItem.title}</span>
                      {docUrl ? (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" /> Uploaded
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                          Not Provided
                        </span>
                      )}
                    </div>

                    {docUrl ? (
                      <div className="space-y-2">
                        <div className={`relative w-full ${docItem.defaultHeight} bg-white border border-slate-200 rounded-lg overflow-hidden flex items-center justify-center`}>
                          {isPdf ? (
                            <div className="flex flex-col items-center justify-center p-3 text-center">
                              <FileText className="w-8 h-8 text-red-500 mb-1" />
                              <span className="text-[11px] font-bold text-slate-700">PDF Document</span>
                            </div>
                          ) : (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={docUrl}
                              alt={docItem.title}
                              className="w-full h-full object-contain p-1"
                            />
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedDocPreview({ title: docItem.title, url: docUrl })}
                            className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition"
                          >
                            <Eye className="w-3.5 h-3.5" /> Full View
                          </button>
                          <a
                            href={docUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center justify-center transition"
                            title="Open in new tab"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 text-center bg-white border border-dashed border-slate-200 rounded-lg">
                        <span className="text-[11px] text-slate-400 font-medium">No document attached</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Remarks / Verification Notes */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Officer Notes / Remarks
              </label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add verification notes or instructions for candidate..."
                className="w-full p-2.5 text-xs border rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                onClick={() => updateStatus(application.status, remarks)}
                disabled={actionLoading}
                className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition"
              >
                Save Officer Remarks
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Demand Details / Correction Modal */}
      {showCorrectionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Demand Details / Documents from Candidate
            </h3>
            <p className="text-xs text-slate-500">
              Specify what documents or clarifications are demanded. The candidate will see an interactive upload option and notification on their dashboard.
            </p>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">
                Flag Demanded Documents:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Clear Passport Photograph',
                  'Candidate Signature (Dark Ink)',
                  'Parent / Guardian Signature',
                  'Aadhaar Card Copy',
                  'Previous Class Marksheet',
                  'Date of Birth Certificate',
                ].map((docName) => (
                  <button
                    key={docName}
                    type="button"
                    onClick={() => {
                      const prefix = `Document Required: ${docName}. `;
                      setRemarks((prev) => (prev.includes(docName) ? prev : prev ? `${prev}\n${prefix}` : prefix));
                    }}
                    className="text-[11px] bg-slate-100 hover:bg-amber-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 transition"
                  >
                    + {docName}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">
                Officer Remarks & Instructions:
              </label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Type detailed instructions or select buttons above..."
                className="w-full p-2.5 text-xs border rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowCorrectionModal(false)}
                className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => updateStatus('correction_needed', remarks)}
                disabled={actionLoading}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs rounded-xl shadow"
              >
                Dispatch Demand Notification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Application Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-red-700 text-base flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Reject Application Dossier
            </h3>
            <p className="text-xs text-slate-500">
              Provide the official ground for rejection. The candidate will see this reason on their dashboard and will have the opportunity to submit revised details.
            </p>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">
                Common Rejection Reasons:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Age criteria not met for selected class',
                  'Ineligible previous academic qualification',
                  'Aadhaar or identity details mismatch',
                  'Incomplete / fraudulent documentation',
                  'Invalid category / reservation certificate',
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setRemarks(`Application rejected: ${reason}.`)}
                    className="text-[11px] bg-red-50 hover:bg-red-100 text-red-800 px-2.5 py-1 rounded-lg border border-red-200 transition"
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">
                Rejection Grounds & Remarks:
              </label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Explain reason for rejection..."
                className="w-full p-2.5 text-xs border rounded-xl outline-none focus:ring-2 focus:ring-red-500 font-medium"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false);
                  updateStatus('rejected', remarks);
                }}
                disabled={actionLoading}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow"
              >
                Confirm Rejection & Notify
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Application Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-red-700 text-base flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              Delete Candidate Dossier
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete application <strong>{application.applicationNumber}</strong> for <strong>{application.personalInfo.fullName}</strong>?
            </p>
            <p className="text-[11px] text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200">
              ⚠️ <strong>Warning:</strong> This will completely delete the candidate&apos;s application record and any issued admit card. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteApplication}
                disabled={actionLoading}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Document Viewer Modal */}
      {selectedDocPreview && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gurukul-600" />
                {selectedDocPreview.title}
              </h4>
              <button
                onClick={() => setSelectedDocPreview(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto flex items-center justify-center bg-slate-50 rounded-xl p-3 border border-slate-200">
              {selectedDocPreview.url.startsWith('data:application/pdf') || selectedDocPreview.url.toLowerCase().endsWith('.pdf') ? (
                <iframe src={selectedDocPreview.url} className="w-full h-[60vh] rounded-lg border-0" />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={selectedDocPreview.url}
                  alt={selectedDocPreview.title}
                  className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-sm"
                />
              )}
            </div>
            <div className="flex justify-between items-center pt-2">
              <a
                href={selectedDocPreview.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gurukul-600 hover:underline font-bold flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open in new browser tab
              </a>
              <button
                onClick={() => setSelectedDocPreview(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition shadow"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
