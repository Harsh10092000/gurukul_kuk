'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  FileText,
  Printer,
  User,
  GraduationCap,
  ExternalLink,
  ShieldCheck,
  Trash2,
  Eye,
  X,
  Check,
  AlertCircle
} from 'lucide-react';
import { Application, AdmitCard } from '@/lib/types';
import AdmitCardView from '@/components/AdmitCardView';

export default function ApplicationVerificationPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [application, setApplication] = useState<Application | null>(null);
  const [admitCard, setAdmitCard] = useState<AdmitCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showHallTicketModal, setShowHallTicketModal] = useState(false);
  const [selectedDocPreview, setSelectedDocPreview] = useState<{ title: string; url: string } | null>(null);
  const [notificationMsg, setNotificationMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetch(`/api/applications/${params.id}`)
      .then((res) => res.json())
      .then(async (data) => {
        if (data.application) {
          setApplication(data.application);
          setRemarks('');

          const admitRes = await fetch(`/api/admit-card?appId=${data.application.id}`);
          const admitData = await admitRes.json();
          if (admitData.admitCard) setAdmitCard(admitData.admitCard);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  useEffect(() => {
    if (showHallTicketModal || showCorrectionModal || showDeleteModal || selectedDocPreview) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showHallTicketModal, showCorrectionModal, showDeleteModal, selectedDocPreview]);

  const formatDob = (dobStr?: string) => {
    if (!dobStr) return '—';
    const s = dobStr.trim();
    const match = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      return `${match[3]}-${match[2]}-${match[1]}`;
    }
    return s;
  };

  const updateStatus = async (status: Application['status'], customRemark?: string) => {
    setActionLoading(true);
    setErrorMsg('');
    setShowCorrectionModal(false);
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
        setRemarks('');
        setNotificationMsg(`Status updated to ${status.replace('_', ' ').toUpperCase()}`);
        setTimeout(() => setNotificationMsg(''), 4000);
      } else {
        setErrorMsg(data.error || 'Failed to update status.');
      }
    } catch {
      setErrorMsg('Failed to update status.');
    } finally {
      setActionLoading(false);
      setShowCorrectionModal(false);
    }
  };

  const handleDeleteApplication = async () => {
    setActionLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/applications/${params.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        router.push('/admin/applications');
      } else {
        setErrorMsg(data.error || 'Failed to delete application.');
      }
    } catch {
      setErrorMsg('Failed to delete application.');
    } finally {
      setActionLoading(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-portal-navy border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-500">Loading Candidate Dossier...</p>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-xs font-bold text-rose-600">Application record not found.</p>
        <Link
          href="/admin/applications"
          className="btn-primary text-xs px-4 py-2 inline-block"
        >
          Return to Applications
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="portal-card p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/applications"
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition border border-slate-200"
            title="Back to all applications"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-500">
                {application.applicationNumber || application.registrationNumber}
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${application.status === 'approved'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : application.status === 'correction_needed'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
              >
                {application.status.replace('_', ' ')}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              Candidate Dossier: {application.personalInfo.fullName}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/applications/${application.id}/admission-form`}
            className="btn-secondary text-xs px-3.5 py-1.5 font-bold flex items-center gap-1.5 text-slate-800"
            title="Generate and Print Official Office Admission Dossier"
          >
            <Printer className="w-3.5 h-3.5 text-portal-navy" />
            <span>Office Admission Form</span>
          </Link>

          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={actionLoading}
            className="btn-danger text-xs px-3 py-1.5"
            title="Delete Application"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {notificationMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Grid: Details + Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Dossier Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal & Parent Particulars */}
          <div className="portal-card p-5 space-y-4">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
              1. Candidate &amp; Parent Particulars
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Candidate Name</span>
                <span className="font-semibold text-slate-900 uppercase">{application.personalInfo.fullName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Date of Birth</span>
                <span className="font-medium text-slate-900">{formatDob(application.personalInfo.dob)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Gender &amp; Category</span>
                <span className="font-medium text-slate-900">{application.personalInfo.gender} • {application.personalInfo.category}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Aadhaar Number</span>
                <span className="font-mono text-slate-900">{application.personalInfo.aadhaarNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">PAN / PEN</span>
                <span className="font-mono text-slate-900">{application.personalInfo.panNumber || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Family ID</span>
                <span className="font-mono text-slate-900">{application.personalInfo.familyId || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Applying For</span>
                <span className="font-semibold text-portal-navy">
                  Class {application.classApplying}{application.stream ? ` (${application.stream})` : ''}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">Father&apos;s Name</span>
                <span className="font-semibold text-slate-900">{application.parentInfo.fatherName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Father&apos;s Occupation</span>
                <span className="text-slate-800">{application.parentInfo.fatherOccupation || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Father&apos;s Mobile</span>
                <span className="font-mono text-slate-900">{application.parentInfo.fatherPhone}</span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">Mother&apos;s Name</span>
                <span className="font-semibold text-slate-900">{application.parentInfo.motherName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Mother&apos;s Occupation</span>
                <span className="text-slate-800">{application.parentInfo.motherOccupation || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Annual Family Income</span>
                <span className="text-slate-800">{application.parentInfo.annualIncome || '—'}</span>
              </div>
            </div>
          </div>

          {/* Academic & Study Location */}
          <div className="portal-card p-5 space-y-4">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
              2. Academic &amp; Campus Preferences
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Previous School</span>
                <span className="font-medium text-slate-900">{application.personalInfo?.previousSchoolName || application.academicInfo?.previousSchoolName || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Previous Board</span>
                <span className="text-slate-800">
                  {application.personalInfo?.previousBoard || application.academicInfo?.previousBoard || '—'}
                  {application.personalInfo?.otherBoard ? ` (${application.personalInfo.otherBoard})` : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Entrance Fee Status</span>
                <span className="font-semibold text-emerald-700">
                  Paid (₹{application.amountPaid || 800})
                </span>
              </div>

              <div className="sm:col-span-2">
                <span className="text-slate-500 block text-[11px]">1st Campus Preference</span>
                <span className="font-semibold text-portal-navy">
                  {application.studyLocation?.firstPreference || 'Gurukul Nilokheri'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">2nd Campus Preference</span>
                <span className="text-slate-700 font-medium">
                  {application.studyLocation?.secondPreference || 'None'}
                </span>
              </div>
            </div>
          </div>

          {/* Examination Roll Number & Admit Card Box */}
          <div className="bg-portal-navy text-white rounded-xl p-5 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-700 pb-2.5">
              <h3 className="font-bold text-xs uppercase tracking-wider text-amber-300">
                Examination Roll Number &amp; Admit Card
              </h3>
              {admitCard ? (
                admitCard.isReleased ? (
                  <span className="bg-emerald-950 text-emerald-300 text-[10px] font-semibold px-2 py-0.5 rounded border border-emerald-800">
                    Released to Candidate
                  </span>
                ) : (
                  <span className="bg-slate-800 text-slate-300 text-[10px] font-semibold px-2 py-0.5 rounded border border-slate-700">
                    Internal (Hidden from Candidate)
                  </span>
                )
              ) : (
                <span className="bg-amber-950 text-amber-300 text-[10px] font-semibold px-2 py-0.5 rounded">
                  Pending Generation
                </span>
              )}
            </div>

            {admitCard ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Roll Number</span>
                    <span className="font-mono font-bold text-amber-300 text-sm">{admitCard.rollNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Exam Date</span>
                    <span className="text-white font-medium">{admitCard.examDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Exam Centre</span>
                    <span className="text-white font-medium">{admitCard.examCentreName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Room / Hall</span>
                    <span className="text-white font-medium">{admitCard.roomNumber || 'Assigned on Day'}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowHallTicketModal(true)}
                    className="btn-accent text-xs px-3.5 py-1.5 font-semibold"
                  >
                    View Hall Ticket
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-300">
                Roll number will be generated when Admit Cards are released from the Application Management desk.
              </p>
            )}
          </div>
        </div>

        {/* Right 1 Col: Uploaded Documents Inspector */}
        <div className="space-y-6">
          <div className="portal-card p-5 space-y-4">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
              Uploaded Documents
            </h3>

            <div className="space-y-3">
              {[
                { key: 'photo', title: '1. Candidate Photograph', defaultHeight: 'h-40' },
                { key: 'signature', title: '2. Candidate Signature', defaultHeight: 'h-20' },
                { key: 'parentSignature', title: '3. Parent Signature', defaultHeight: 'h-20' },
                { key: 'aadhaarCard', title: '4. Aadhaar / ID Proof', defaultHeight: 'h-32' },
              ].map((docItem) => {
                const docUrl = (application.documents as any)?.[docItem.key];
                const isPdf = docUrl && (docUrl.startsWith('data:application/pdf') || docUrl.toLowerCase().endsWith('.pdf'));

                return (
                  <div key={docItem.key} className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-slate-800">{docItem.title}</span>
                      {docUrl ? (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                          Uploaded
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Missing</span>
                      )}
                    </div>

                    {docUrl ? (
                      <div className="space-y-2">
                        <div className={`relative w-full ${docItem.defaultHeight} bg-white border border-slate-200 rounded overflow-hidden flex items-center justify-center`}>
                          {isPdf ? (
                            <div className="flex flex-col items-center justify-center p-2 text-center">
                              <FileText className="w-6 h-6 text-slate-500 mb-1" />
                              <span className="text-[10px] font-semibold text-slate-700">PDF Document</span>
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
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedDocPreview({ title: docItem.title, url: docUrl })}
                            className="flex-1 py-1 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold rounded border border-slate-200"
                          >
                            Preview
                          </button>
                          <a
                            href={docUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-1 px-2 bg-white hover:bg-slate-100 text-slate-700 rounded border border-slate-200 flex items-center justify-center"
                            title="Open in new tab"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="py-3 text-center bg-white border border-dashed border-slate-200 rounded text-[11px] text-slate-400">
                        No document uploaded
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Remarks / Officer Actions */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="form-label">
                Officer Notes / Remarks
              </label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Notes for verification record..."
                className="form-input-field h-auto py-2 text-xs"
              />
              <button
                onClick={() => updateStatus(application.status, remarks)}
                disabled={actionLoading}
                className="w-full btn-primary text-xs py-2 font-medium"
              >
                Save Officer Remarks
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Demand Details Modal */}
      {showCorrectionModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-elevated border border-slate-200 space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">
              Demand Corrections from Candidate
            </h3>
            <p className="text-xs text-slate-500">
              Specify what documents or corrections are required. The candidate will see these on their dashboard.
            </p>

            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Instructions for candidate..."
              className="form-input-field h-auto py-2 text-xs"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCorrectionModal(false)}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => updateStatus('correction_needed', remarks)}
                disabled={actionLoading}
                className="btn-primary text-xs px-3.5 py-1.5"
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-elevated border border-slate-200 space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">
              Delete Candidate Dossier?
            </h3>
            <p className="text-xs text-slate-600 leading-normal">
              Permanently delete application <strong>{application.applicationNumber}</strong> for <strong>{application.personalInfo.fullName}</strong>? This action cannot be reversed.
            </p>
            {errorMsg && (
              <p className="text-xs text-rose-700 bg-rose-50 p-2 rounded">
                {errorMsg}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteApplication}
                disabled={actionLoading}
                className="btn-danger text-xs px-3.5 py-1.5"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Document Viewer Modal */}
      {selectedDocPreview && (
        <div className="fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-xl w-full p-5 shadow-elevated border border-slate-200 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h4 className="font-bold text-xs text-slate-900">
                {selectedDocPreview.title}
              </h4>
              <button
                onClick={() => setSelectedDocPreview(null)}
                className="p-1 hover:bg-slate-100 rounded text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[65vh] overflow-auto flex items-center justify-center bg-slate-50 rounded p-2 border border-slate-200">
              {selectedDocPreview.url.startsWith('data:application/pdf') || selectedDocPreview.url.toLowerCase().endsWith('.pdf') ? (
                <iframe src={selectedDocPreview.url} className="w-full h-[55vh] rounded border-0" />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={selectedDocPreview.url}
                  alt={selectedDocPreview.title}
                  className="max-h-[55vh] max-w-full object-contain rounded"
                />
              )}
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <a
                href={selectedDocPreview.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-portal-navy hover:underline font-semibold flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open in tab
              </a>
              <button
                onClick={() => setSelectedDocPreview(null)}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admit Card Modal */}
      {showHallTicketModal && admitCard && (
        <div className="fixed inset-0 bg-slate-900/75 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto print:hidden">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-elevated border border-slate-200 overflow-hidden my-auto">
            <div className="p-3.5 bg-portal-navy text-white flex justify-between items-center px-5">
              <div>
                <h3 className="font-bold text-xs">
                  Hall Ticket — Roll No: {admitCard.rollNumber}
                </h3>
                <p className="text-[11px] text-slate-300">
                  {admitCard.candidateName} • {admitCard.classApplying}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowHallTicketModal(false)}
                  className="p-1 text-slate-300 hover:text-white rounded transition"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50">
              <AdmitCardView admitCard={admitCard} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
