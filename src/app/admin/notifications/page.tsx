'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Bell, 
  Search, 
  CheckCheck, 
  RefreshCw, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Mail, 
  Clock, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';
import { AdminNotification } from '@/lib/types';

const PAGE_SIZE = 10;

export default function AdminNotificationCenterPage() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'applications' | 'rejections' | 'enquiries'>('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/notifications?limit=100');
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (e) {
      console.warn('Error fetching notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch('/api/admin/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        const newCount = typeof data.unreadCount === 'number' ? data.unreadCount : 0;
        setUnreadCount(newCount);
        window.dispatchEvent(new CustomEvent('gurukul:notif-count-update', { detail: { unreadCount: newCount } }));
      }
    } catch (e) {
      console.warn('Error marking notification as read:', e);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch('/api/admin/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
        window.dispatchEvent(new CustomEvent('gurukul:notif-count-update', { detail: { unreadCount: 0 } }));
      }
    } catch (e) {
      console.warn('Error marking all notifications as read:', e);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      n.title.toLowerCase().includes(q) ||
      n.message.toLowerCase().includes(q) ||
      (n.metadata?.candidateName || '').toLowerCase().includes(q) ||
      (n.metadata?.applicationNumber || '').toLowerCase().includes(q) ||
      (n.metadata?.rejectionReason || '').toLowerCase().includes(q);

    let matchesFilter = true;
    if (activeFilter === 'unread') matchesFilter = !n.isRead;
    else if (activeFilter === 'applications') {
      matchesFilter =
        n.type === 'APPLICATION_SUBMITTED' ||
        n.type === 'APPLICATION_APPROVED' ||
        n.type === 'CORRECTION_REQUIRED' ||
        n.type === 'APPLICATION_STATUS_CHANGED';
    } else if (activeFilter === 'rejections') {
      matchesFilter = n.type === 'APPLICATION_REJECTED';
    } else if (activeFilter === 'enquiries') {
      matchesFilter = n.type === 'CONTACT_ENQUIRY';
    }

    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.max(1, Math.ceil(filteredNotifications.length / PAGE_SIZE));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * PAGE_SIZE;
  const paginatedNotifications = filteredNotifications.slice(startIndex, startIndex + PAGE_SIZE);

  const getNotificationIcon = (type: AdminNotification['type']) => {
    switch (type) {
      case 'APPLICATION_APPROVED':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />;
      case 'APPLICATION_REJECTED':
        return <XCircle className="w-5 h-5 text-rose-600 shrink-0" />;
      case 'CORRECTION_REQUIRED':
        return <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />;
      case 'CONTACT_ENQUIRY':
        return <Mail className="w-5 h-5 text-blue-600 shrink-0" />;
      case 'APPLICATION_SUBMITTED':
        return <FileText className="w-5 h-5 text-portal-navy shrink-0" />;
      default:
        return <Bell className="w-5 h-5 text-slate-600 shrink-0" />;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Title & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Admin Notification Center
            </h1>
            {unreadCount > 0 && (
              <span className="bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time event stream of application submissions, candidate status changes, rejections, and enquiries (Max 100 queue)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchNotifications()}
            className="btn-secondary text-xs h-9"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-portal-navy' : ''}`} />
            <span>Refresh</span>
          </button>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="btn-primary text-xs h-9"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark All as Read</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="portal-card p-4 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by title, candidate name, application no, reason..."
            className="form-input-field pl-10 text-xs h-9"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              setActiveFilter('all');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-md transition whitespace-nowrap ${
              activeFilter === 'all'
                ? 'bg-portal-navy text-white shadow-xs font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveFilter('unread');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-md transition whitespace-nowrap ${
              activeFilter === 'unread'
                ? 'bg-portal-navy text-white shadow-xs font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveFilter('applications');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-md transition whitespace-nowrap ${
              activeFilter === 'applications'
                ? 'bg-portal-navy text-white shadow-xs font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Applications
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveFilter('rejections');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-md transition whitespace-nowrap ${
              activeFilter === 'rejections'
                ? 'bg-portal-navy text-white shadow-xs font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Rejections
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveFilter('enquiries');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-md transition whitespace-nowrap ${
              activeFilter === 'enquiries'
                ? 'bg-portal-navy text-white shadow-xs font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Enquiries
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading && notifications.length === 0 ? (
          <div className="portal-card p-16 text-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-3 border-portal-navy border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-medium">Loading notification feed...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="portal-card p-16 text-center text-slate-400 space-y-2">
            <CheckCheck className="w-10 h-10 mx-auto text-slate-300" />
            <h3 className="font-semibold text-slate-700 text-sm">No Notifications Found</h3>
            <p className="text-xs text-slate-500">No administrative alerts match the current filter and search query.</p>
          </div>
        ) : (
          paginatedNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`portal-card p-4 sm:p-5 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                !notif.isRead
                  ? 'border-amber-300 bg-amber-50/20'
                  : 'hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3.5 flex-1">
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 mt-0.5 shrink-0">
                  {getNotificationIcon(notif.type)}
                </div>

                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3
                      className={`text-sm ${
                        !notif.isRead ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'
                      }`}
                    >
                      {notif.title}
                    </h3>

                    {!notif.isRead && (
                      <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        NEW
                      </span>
                    )}

                    <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(notif.createdAt).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                    {notif.message}
                  </p>

                  {/* Metadata Chips */}
                  {notif.metadata && (
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                      {notif.metadata.candidateName && (
                        <span className="bg-slate-100 text-slate-800 font-medium px-2 py-0.5 rounded text-[11px]">
                          Candidate: {notif.metadata.candidateName}
                        </span>
                      )}
                      {notif.metadata.applicationNumber && (
                        <span className="font-mono bg-slate-100 text-slate-800 font-semibold px-2 py-0.5 rounded text-[11px] border border-slate-200">
                          {notif.metadata.applicationNumber}
                        </span>
                      )}
                      {notif.metadata.classApplying && (
                        <span className="bg-blue-50 text-blue-800 font-medium px-2 py-0.5 rounded text-[11px]">
                          Class {notif.metadata.classApplying}
                        </span>
                      )}
                      {notif.metadata.phone && (
                        <span className="font-mono text-slate-500 text-[11px]">
                          {notif.metadata.phone}
                        </span>
                      )}
                      {notif.metadata.rejectionReason && (
                        <span className="bg-rose-50 text-rose-800 border border-rose-200 font-medium px-2.5 py-0.5 rounded text-[11px]">
                          Reason: {notif.metadata.rejectionReason}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                {!notif.isRead && (
                  <button
                    type="button"
                    onClick={() => handleMarkAsRead(notif.id)}
                    className="btn-secondary text-xs h-8 px-3"
                  >
                    Mark Read
                  </button>
                )}

                {notif.link && (
                  <Link
                    href={notif.link}
                    onClick={() => {
                      if (!notif.isRead) handleMarkAsRead(notif.id);
                    }}
                    className="btn-primary text-xs h-8 px-3"
                  >
                    <span>View Dossier</span>
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Bar */}
      {filteredNotifications.length > 0 && totalPages > 1 && (
        <div className="portal-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-500 font-medium">
            Showing <strong className="text-slate-800">{startIndex + 1}</strong> to{' '}
            <strong className="text-slate-800">
              {Math.min(startIndex + PAGE_SIZE, filteredNotifications.length)}
            </strong>{' '}
            of <strong className="text-slate-800">{filteredNotifications.length}</strong> alerts{' '}
            <span className="text-slate-400 font-mono">(Page {validPage} of {totalPages})</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validPage === 1}
              className="btn-secondary text-xs h-8 px-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Prev</span>
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded-md font-semibold text-xs transition flex items-center justify-center ${
                    validPage === pageNum
                      ? 'bg-portal-navy text-white shadow-xs border border-portal-navy'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={validPage === totalPages}
              className="btn-secondary text-xs h-8 px-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
