'use client';

import React, { useState, useEffect } from 'react';
import { History, Search, Clock, Loader2 } from 'lucide-react';
import { AuditLogEntry } from '@/lib/audit';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEntity, setFilterEntity] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = () => {
    setLoading(true);
    let url = `/api/admin/audit?limit=200&`;
    if (filterEntity) url += `entity=${encodeURIComponent(filterEntity)}&`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setLogs(data.logs || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    let url = `/api/admin/audit?limit=200&`;
    if (filterEntity) url += `entity=${encodeURIComponent(filterEntity)}&`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          setLogs(data.logs || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [filterEntity]);

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.userName.toLowerCase().includes(q) ||
      log.entity.toLowerCase().includes(q) ||
      JSON.stringify(log.details).toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            System Audit Trail &amp; Access Logs
          </h1>
          <p className="text-xs text-slate-500">
            Immutable tracking of administrative actions, schedule modifications, result publications, and verification updates.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-portal-navy" />
          ) : (
            <History className="w-3.5 h-3.5" />
          )}
          <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="portal-card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by admin name, action, or keyword..."
            className="form-input-field"
          />
        </div>

        <div>
          <select
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
            className="form-input-field font-medium"
          >
            <option value="">All Entities</option>
            <option value="FormSchedule">Form Schedule / Reopening</option>
            <option value="Application">Applications / Verification</option>
            <option value="Results">Results &amp; Selection</option>
            <option value="AdmitCard">Admit Cards</option>
            <option value="User">User / Authentication</option>
          </select>
        </div>

        {loading ? (
          <span className="text-xs font-mono text-slate-500 inline-flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-portal-navy" />
            <span>Loading records...</span>
          </span>
        ) : (
          <span className="text-xs font-mono text-slate-500">
            Total Logs: <strong>{filteredLogs.length}</strong>
          </span>
        )}
      </div>

      {/* Audit Log Table */}
      <div className="portal-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] border-b border-slate-200">
                <th className="p-3 w-44">Timestamp (IST)</th>
                <th className="p-3 w-40">User / Role</th>
                <th className="p-3 w-36">Action</th>
                <th className="p-3 w-32">Entity</th>
                <th className="p-3">Details / Changes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-16 text-center text-slate-500 bg-slate-50/50">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-portal-navy" />
                      <div>
                        <p className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                          Loading Audit Logs...
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Fetching secure administrative audit records
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400">
                    No audit log entries found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const date = new Date(log.timestamp);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-slate-900 block">{log.userName}</span>
                        <span className="text-[10px] text-slate-500 font-mono uppercase">
                          {log.userRole}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-mono font-semibold text-xs text-portal-navy">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                          {log.entity}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-600">
                        {typeof log.details === 'object' ? (
                          <pre className="text-[10px] bg-slate-50 p-1.5 rounded border border-slate-200 overflow-x-auto max-w-md max-h-20">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        ) : (
                          String(log.details)
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
