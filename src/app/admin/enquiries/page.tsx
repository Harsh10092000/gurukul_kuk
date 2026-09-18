'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  Mail, 
  Search, 
  CheckCircle2, 
  Clock, 
  Phone, 
  AlertCircle, 
  X, 
  ExternalLink,
  RefreshCw,
  Eye
} from 'lucide-react';
import { ContactEnquiry, ContactEnquiryStatus } from '@/lib/types';

function AdminEnquiriesContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get('id');

  const [enquiries, setEnquiries] = useState<ContactEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedEnquiry, setSelectedEnquiry] = useState<ContactEnquiry | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const fetchEnquiries = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/enquiries');
      const data = await res.json();
      if (data.success) {
        setEnquiries(data.enquiries || []);

        if (initialId && data.enquiries) {
          const matched = data.enquiries.find((e: ContactEnquiry) => e.id === initialId);
          if (matched) {
            setSelectedEnquiry(matched);
            setAdminNote(matched.adminRemarks || '');
          }
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, [initialId]);

  const handleUpdateStatus = async (enquiryId: string, newStatus: ContactEnquiryStatus, remarks?: string) => {
    setActionLoading(true);
    setErrorMessage('');
    setStatusMessage('');
    try {
      const res = await fetch(`/api/admin/enquiries/${enquiryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          remarks: remarks !== undefined ? remarks : adminNote,
        }),
      });
      const data = await res.json();
      if (data.success && data.enquiry) {
        setEnquiries((prev) =>
          prev.map((e) => (e.id === enquiryId ? data.enquiry : e))
        );
        if (selectedEnquiry?.id === enquiryId) {
          setSelectedEnquiry(data.enquiry);
        }
        setStatusMessage('Enquiry status updated successfully.');
      } else {
        setErrorMessage(data.error || 'Failed to update enquiry status.');
      }
    } catch {
      setErrorMessage('Failed to update enquiry status.');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredEnquiries = enquiries.filter((enq) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      enq.name.toLowerCase().includes(q) ||
      enq.email.toLowerCase().includes(q) ||
      enq.phone.includes(q) ||
      enq.subject.toLowerCase().includes(q) ||
      enq.message.toLowerCase().includes(q) ||
      (enq.applicationNumber || '').toLowerCase().includes(q);

    const matchesStatus = selectedStatus === 'all' || enq.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: ContactEnquiryStatus) => {
    switch (status) {
      case 'resolved':
        return (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold px-2 py-0.5 rounded">
            Resolved
          </span>
        );
      case 'in_progress':
        return (
          <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold px-2 py-0.5 rounded">
            In Progress
          </span>
        );
      case 'read':
        return (
          <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-semibold px-2 py-0.5 rounded">
            Read
          </span>
        );
      default:
        return (
          <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold px-2 py-0.5 rounded">
            New
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Contact &amp; Admission Enquiries
          </h1>
          <p className="text-xs text-slate-500">
            Review inquiries, queries, and feedback submitted by prospective candidates and parents
          </p>
        </div>

        <button
          onClick={fetchEnquiries}
          className="btn-secondary text-xs px-3 py-1.5"
          title="Refresh list"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="portal-card p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by sender name, email, mobile, subject..."
            className="form-input-field"
          />
        </div>

        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="form-input-field font-medium"
          >
            <option value="all">All Enquiries ({enquiries.length})</option>
            <option value="new">New ({enquiries.filter((e) => e.status === 'new').length})</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Enquiries Table */}
      <div className="portal-card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center text-xs">
          <span className="font-semibold text-slate-800">
            Showing {filteredEnquiries.length} Enquiries
          </span>
          <span className="text-slate-500 text-[11px]">
            {enquiries.filter((e) => e.status === 'new').length} new
          </span>
        </div>

        {loading && enquiries.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading enquiries...</div>
        ) : filteredEnquiries.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No enquiries match your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Sender</th>
                  <th className="py-2.5 px-3">Subject &amp; Message</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEnquiries.map((enq) => (
                  <tr
                    key={enq.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => {
                      setSelectedEnquiry(enq);
                      setAdminNote(enq.adminRemarks || '');
                      if (enq.status === 'new') {
                        handleUpdateStatus(enq.id, 'read');
                      }
                    }}
                  >
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{enq.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">{enq.phone}</div>
                      <div className="text-[11px] text-slate-500">{enq.email}</div>
                    </td>

                    <td className="py-3 px-3 max-w-sm">
                      <div className="font-medium text-slate-900 truncate">{enq.subject}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{enq.message}</div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-medium">
                        {enq.source === 'candidate_grievance' ? 'Grievance' : 'General'}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-500 text-[11px] whitespace-nowrap font-mono">
                      {new Date(enq.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      {getStatusBadge(enq.status)}
                    </td>

                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEnquiry(enq);
                          setAdminNote(enq.adminRemarks || '');
                          if (enq.status === 'new') {
                            handleUpdateStatus(enq.id, 'read');
                          }
                        }}
                        className="btn-secondary text-[11px] px-2.5 py-1"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Enquiry Detail Modal */}
      {selectedEnquiry && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 space-y-4 shadow-elevated border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">
                    {selectedEnquiry.source === 'candidate_grievance' ? 'Grievance' : 'Enquiry'}
                  </span>
                  {getStatusBadge(selectedEnquiry.status)}
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {selectedEnquiry.subject}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEnquiry(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Sender</span>
                <span className="font-semibold text-slate-900">{selectedEnquiry.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Phone</span>
                <span className="font-mono text-slate-900">{selectedEnquiry.phone}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Email</span>
                <span className="text-slate-800">{selectedEnquiry.email}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Date</span>
                <span className="text-slate-800">{new Date(selectedEnquiry.createdAt).toLocaleDateString()}</span>
              </div>
              {selectedEnquiry.applicationNumber && (
                <div className="col-span-2 pt-1 border-t border-slate-200">
                  <span className="text-slate-500 text-[11px]">Application: </span>
                  <span className="font-mono font-bold text-portal-navy">{selectedEnquiry.applicationNumber}</span>
                </div>
              )}
            </div>

            <div>
              <span className="text-[11px] font-semibold uppercase text-slate-500 block mb-1">
                Message Content
              </span>
              <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 leading-normal whitespace-pre-wrap">
                {selectedEnquiry.message}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="form-label">
                Resolution Notes
              </label>
              <textarea
                rows={3}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Internal action notes..."
                className="form-input-field h-auto py-2 text-xs"
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <div className="flex gap-2">
                {selectedEnquiry.status !== 'resolved' ? (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus(selectedEnquiry.id, 'resolved', adminNote)}
                    className="btn-primary text-xs px-3 py-1.5 font-medium"
                  >
                    Mark Resolved
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus(selectedEnquiry.id, 'in_progress', adminNote)}
                    className="btn-secondary text-xs px-3 py-1.5"
                  >
                    Reopen
                  </button>
                )}

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleUpdateStatus(selectedEnquiry.id, selectedEnquiry.status, adminNote)}
                  className="btn-secondary text-xs px-3 py-1.5"
                >
                  Save Notes
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedEnquiry(null)}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminEnquiriesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading enquiries desk...</div>}>
      <AdminEnquiriesContent />
    </Suspense>
  );
}
