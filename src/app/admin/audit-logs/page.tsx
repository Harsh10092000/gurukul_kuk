'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, History, Filter, Search, Clock, User, FileText, CheckCircle2 } from 'lucide-react';
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
    fetchLogs();
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
    <div className="space-y-6 font-sans">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-gurukul-600 bg-amber-100 px-3 py-1 rounded-full font-bold">
            Compliance & Security Module
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-gurukul-navy mt-1">
            System Audit Trail & Access Logs
          </h1>
          <p className="text-xs text-slate-500">
            Immutable tracking of administrative operations, schedule changes, result imports, and verification actions.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-300 transition flex items-center gap-1.5"
        >
          <History className="w-4 h-4" />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by admin name, action, or keyword..."
            className="w-full pl-9 pr-3 py-2 text-xs border rounded-lg outline-none focus:ring-2 focus:ring-amber-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
            className="text-xs border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500 font-semibold text-slate-700"
          >
            <option value="">All Entities</option>
            <option value="FormSchedule">Form Schedule / Reopening</option>
            <option value="Application">Applications / Verification</option>
            <option value="Results">Results & Selection</option>
            <option value="AdmitCard">Admit Cards</option>
            <option value="User">User / Authentication</option>
          </select>
        </div>

        <span className="text-xs font-mono text-slate-500">
          Total Logs: <strong>{filteredLogs.length}</strong>
        </span>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b">
                <th className="p-3 w-44">Timestamp (IST)</th>
                <th className="p-3 w-40">User / Role</th>
                <th className="p-3 w-36">Action</th>
                <th className="p-3 w-32">Entity</th>
                <th className="p-3">Details / Changes</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No audit log entries found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const date = new Date(log.timestamp);
                  return (
                    <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-slate-900 block">{log.userName}</span>
                        <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-mono uppercase">
                          {log.userRole}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-mono font-bold text-xs text-gurukul-navy">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold">
                          {log.entity}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-600">
                        {typeof log.details === 'object' ? (
                          <pre className="text-[10px] bg-slate-50 p-1.5 rounded border border-slate-200 overflow-x-auto max-w-md max-h-24">
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
