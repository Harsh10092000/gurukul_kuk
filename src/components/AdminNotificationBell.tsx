'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Bell, 
  CheckCheck, 
  ExternalLink, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Mail, 
  Clock,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { AdminNotification } from '@/lib/types';

export default function AdminNotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'applications' | 'enquiries'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async (silent: boolean = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/admin/notifications?limit=40');
      const data = await res.json();
      if (data.success) {
        const notifs: AdminNotification[] = data.notifications || [];
        setNotifications(notifs);
        if (notifs.length === 0) {
          setUnreadCount(0);
        } else {
          const actualUnread = notifs.filter((n) => !n.isRead).length;
          setUnreadCount(typeof data.unreadCount === 'number' ? Math.min(data.unreadCount, actualUnread) : actualUnread);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch admin notifications:', e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Auto-poll notifications every 20 seconds for live awareness
    const interval = setInterval(() => {
      fetchNotifications(true);
    }, 20000);

    // Close on click outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    // Sync notification count when other tabs/components mark as read
    const handleNotifUpdate = (e: Event) => {
      const evt = e as CustomEvent<{ unreadCount: number }>;
      if (typeof evt.detail?.unreadCount === 'number') {
        setUnreadCount(evt.detail.unreadCount);
        if (evt.detail.unreadCount === 0) {
          setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        }
      }
    };
    window.addEventListener('gurukul:notif-count-update', handleNotifUpdate);

    return () => {
      clearInterval(interval);
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('gurukul:notif-count-update', handleNotifUpdate);
    };
  }, []);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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
        // Update local list and badge immediately
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
        // Notify other components (layout sidebar badge) synchronously
        window.dispatchEvent(new CustomEvent('gurukul:notif-count-update', { detail: { unreadCount: 0 } }));
        // Then re-fetch from server to ensure full consistency
        fetchNotifications(true);
      }
    } catch (e) {
      console.warn('Error marking all as read:', e);
    }
  };

  const handleNotificationClick = async (notif: AdminNotification) => {
    if (!notif.isRead) {
      handleMarkAsRead(notif.id);
    }
    setIsOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'unread') return !n.isRead;
    if (activeTab === 'applications') {
      return (
        n.type === 'APPLICATION_SUBMITTED' ||
        n.type === 'APPLICATION_APPROVED' ||
        n.type === 'APPLICATION_REJECTED' ||
        n.type === 'CORRECTION_REQUIRED' ||
        n.type === 'APPLICATION_STATUS_CHANGED'
      );
    }
    if (activeTab === 'enquiries') return n.type === 'CONTACT_ENQUIRY';
    return true;
  });

  const getNotificationIcon = (type: AdminNotification['type']) => {
    switch (type) {
      case 'APPLICATION_APPROVED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />;
      case 'APPLICATION_REJECTED':
        return <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />;
      case 'CORRECTION_REQUIRED':
        return <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />;
      case 'CONTACT_ENQUIRY':
        return <Mail className="w-4 h-4 text-blue-600 flex-shrink-0" />;
      case 'APPLICATION_SUBMITTED':
        return <FileText className="w-4 h-4 text-gurukul-600 flex-shrink-0" />;
      default:
        return <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0" />;
    }
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications(true);
        }}
        className={`relative p-2 rounded-xl border transition flex items-center justify-center ${
          isOpen
            ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-sm'
            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300'
        }`}
        title="Admin Notification Center"
        aria-label="Admin Notifications"
      >
        <Bell className={`w-4 h-4 transition ${unreadCount > 0 ? 'text-amber-600 animate-pulse' : 'text-slate-600'}`} />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white font-extrabold text-[10px] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center shadow-md border-2 border-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 mt-2 w-[92vw] sm:w-[420px] max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="bg-slate-900 text-white p-3.5 px-4 flex justify-between items-center border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <span className="font-black text-sm">Notification Center</span>
              {unreadCount > 0 && (
                <span className="bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} Unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchNotifications()}
                className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition"
                title="Refresh Notifications"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-[11px] font-bold text-amber-300 hover:text-white flex items-center gap-1 hover:underline px-1 py-0.5"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark All Read</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="bg-slate-50 border-b border-slate-200 px-3 py-1.5 flex gap-1 text-[11px] font-bold overflow-x-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-amber-500 text-gurukul-navy font-black shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                activeTab === 'unread'
                  ? 'bg-amber-500 text-gurukul-navy font-black shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setActiveTab('applications')}
              className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                activeTab === 'applications'
                  ? 'bg-amber-500 text-gurukul-navy font-black shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              Applications
            </button>
            <button
              onClick={() => setActiveTab('enquiries')}
              className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                activeTab === 'enquiries'
                  ? 'bg-amber-500 text-gurukul-navy font-black shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              Enquiries
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 text-xs">
            {loading && notifications.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p>Loading notifications...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-1">
                <CheckCheck className="w-8 h-8 mx-auto text-slate-300" />
                <p className="font-bold text-slate-600">No notifications in this view</p>
                <p className="text-[11px]">All administrative updates are up to date.</p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3 sm:p-3.5 hover:bg-slate-50 transition cursor-pointer flex gap-3 items-start group ${
                    !notif.isRead ? 'bg-amber-50/50' : ''
                  }`}
                >
                  <div className="mt-0.5">{getNotificationIcon(notif.type)}</div>

                  <div className="flex-1 space-y-1 overflow-hidden">
                    <div className="flex justify-between items-start gap-1">
                      <h4
                        className={`text-xs truncate ${
                          !notif.isRead ? 'font-black text-slate-900' : 'font-bold text-slate-700'
                        }`}
                      >
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {formatTimestamp(notif.createdAt)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>

                    {/* Metadata badge tags */}
                    {notif.metadata && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {notif.metadata.applicationNumber && (
                          <span className="font-mono text-[9px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                            {notif.metadata.applicationNumber}
                          </span>
                        )}
                        {notif.metadata.classApplying && (
                          <span className="text-[9px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded">
                            {notif.metadata.classApplying}
                          </span>
                        )}
                        {notif.metadata.rejectionReason && (
                          <span className="text-[9px] font-bold bg-red-100 text-red-800 px-1.5 py-0.5 rounded truncate max-w-[200px]" title={notif.metadata.rejectionReason}>
                            Reason: {notif.metadata.rejectionReason}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Unread indicator / Mark read action */}
                  <div className="flex flex-col items-center gap-1 self-center">
                    {!notif.isRead && (
                      <span
                        className="w-2 h-2 rounded-full bg-amber-500 shadow-xs"
                        title="Unread notification"
                      />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="bg-slate-50 p-2.5 px-4 border-t border-slate-200 flex justify-between items-center text-xs font-bold text-slate-600">
            <Link
              href="/admin/notifications"
              onClick={() => setIsOpen(false)}
              className="text-gurukul-navy hover:text-amber-600 flex items-center gap-1 transition"
            >
              <span>View All in Notification Center</span>
              <ExternalLink className="w-3 h-3" />
            </Link>

            <Link
              href="/admin/enquiries"
              onClick={() => setIsOpen(false)}
              className="text-slate-500 hover:text-slate-800 text-[11px] font-semibold transition"
            >
              Contact Enquiries →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
