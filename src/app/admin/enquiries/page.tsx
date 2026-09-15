'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  Mail, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  Phone, 
  User, 
  AlertCircle, 
  MessageSquare, 
  X, 
  Check, 
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Eye
} from 'lucide-react';
import { ContactEnquiry, ContactEnquiryStatus } from '@/lib/types';

export default function AdminEnquiriesPage() {
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

        // If an initial ID was requested via query param (from notification link), open it
        if (initialId && data.enquiries) {
          const matched = data.enquiries.find((e: ContactEnquiry) => e.id === initialId);
          if (matched) {
            setSelectedEnquiry(matched);
            setAdminNote(matched.adminRemarks || '');
          }
        }
      }
    } catch (e) {
      console.warn('Error fetching enquiries:', e);
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
    } catch (e) {
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
          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Resolved
          </span>
        );
      case 'in_progress':
        return (
          <span className="bg-blue-100 text-blue-800 border border-blue-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <Clock className="w-3 h-3" /> In Progress
          </span>
        );
      case 'read':
        return (
          <span className="bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <Eye className="w-3 h-3" /> Read
          </span>
        );
      default:
        return (
          <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-amber-600" /> New / Unread
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Title & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gurukul-navy">
            Contact & Admission Enquiries
          </h1>
          <p className="text-xs text-slate-500">
            Manage inquiries, queries, and grievances submitted by prospective candidates and parents
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchEnquiries}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold px-3.5 py-2 rounded-xl text-xs shadow-sm flex items-center gap-1.5 transition"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-500' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Sender Name, Email, Mobile, Subject, App No..."
            className="w-full pl-10 pr-3 py-2 text-xs border rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Filter by Status */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 text-xs border rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-medium"
          >
            <option value="all">All Enquiries ({enquiries.length})</option>
            <option value="new">New / Unread ({enquiries.filter((e) => e.status === 'new').length})</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Enquiries Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center text-xs">
          <span className="font-bold text-slate-700">
            Showing {filteredEnquiries.length} Enquiries
          </span>
          <span className="text-slate-400">
            {enquiries.filter((e) => e.status === 'new').length} requiring response
          </span>
        </div>

        {loading && enquiries.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">Loading enquiries...</div>
        ) : filteredEnquiries.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            No contact enquiries match the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Sender Details</th>
                  <th className="py-3 px-4">Subject & Preview</th>
                  <th className="py-3 px-4">Source & Ref</th>
                  <th className="py-3 px-4">Date Submitted</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEnquiries.map((enq) => (
                  <tr
                    key={enq.id}
                    className={`hover:bg-slate-50 cursor-pointer transition ${
                      enq.status === 'new' ? 'bg-amber-50/30' : ''
                    }`}
                    onClick={() => {
                      setSelectedEnquiry(enq);
                      setAdminNote(enq.adminRemarks || '');
                      if (enq.status === 'new') {
                        handleUpdateStatus(enq.id, 'read');
                      }
                    }}
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{enq.name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{enq.email}</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{enq.phone}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 max-w-sm">
                      <div className="font-bold text-slate-800 line-clamp-1">
                        {enq.subject}
                      </div>
                      <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                        {enq.message}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-mono font-bold block w-fit">
                        {enq.source === 'candidate_grievance' ? 'Grievance Redressal' : 'Public Enquiry'}
                      </span>
                      {enq.applicationNumber && (
                        <span className="font-mono text-[10px] text-gurukul-700 font-bold block mt-1">
                          App: {enq.applicationNumber}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(enq.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(enq.status)}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
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
                        className="bg-gurukul-navy hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition shadow-sm inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Details</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Enquiry Detail Modal / Drawer */}
      {selectedEnquiry && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gurukul-600 bg-amber-50 px-2.5 py-0.5 rounded-full">
                    {selectedEnquiry.source === 'candidate_grievance'
                      ? 'Candidate Grievance Dossier'
                      : 'Public Admission Enquiry'}
                  </span>
                  {getStatusBadge(selectedEnquiry.status)}
                </div>
                <h3 className="text-lg font-black text-gurukul-navy mt-1">
                  {selectedEnquiry.subject}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEnquiry(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sender Particulars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Sender Name</span>
                <span className="font-bold text-slate-900 text-sm">{selectedEnquiry.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Contact Mobile</span>
                <span className="font-mono font-bold text-slate-900">{selectedEnquiry.phone}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Email Address</span>
                <span className="font-medium text-slate-800">{selectedEnquiry.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Submitted Date & Time</span>
                <span className="font-mono text-slate-700">
                  {new Date(selectedEnquiry.createdAt).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
              {selectedEnquiry.applicationNumber && (
                <div className="sm:col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Application Dossier</span>
                    <span className="font-mono font-bold text-gurukul-navy">{selectedEnquiry.applicationNumber}</span>
                  </div>
                  <Link
                    href={`/admin/applications?search=${encodeURIComponent(selectedEnquiry.applicationNumber)}`}
                    className="text-xs font-bold text-amber-700 hover:text-amber-800 underline flex items-center gap-1"
                  >
                    <span>View Candidate Application</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>

            {/* Message Body */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Enquiry Description / Message
              </h4>
              <div className="p-4 bg-white border border-slate-200 rounded-2xl text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                {selectedEnquiry.message}
              </div>
            </div>

            {/* Admin Remarks & Resolution Box */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Administrative Notes / Action Remarks
              </label>
              <textarea
                rows={3}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Enter internal resolution notes, remarks, or phone consultation summary..."
                className="w-full border rounded-2xl p-3 text-xs outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                {selectedEnquiry.status !== 'resolved' ? (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus(selectedEnquiry.id, 'resolved', adminNote)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow flex items-center gap-1.5 transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Mark as Resolved</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus(selectedEnquiry.id, 'in_progress', adminNote)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2 rounded-xl transition"
                  >
                    Re-open Enquiry
                  </button>
                )}

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleUpdateStatus(selectedEnquiry.id, selectedEnquiry.status, adminNote)}
                  className="bg-gurukul-navy hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl shadow transition"
                >
                  Save Notes
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedEnquiry(null)}
                className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
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
