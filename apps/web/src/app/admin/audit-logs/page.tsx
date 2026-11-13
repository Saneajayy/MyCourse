'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api-client';
import { AlertCircle, X } from 'lucide-react';

interface AuditLogItem {
  id: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  beforeState: unknown;
  afterState: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface AuditLogsResponse {
  items: AuditLogItem[];
  pagination: {
    total: number;
    totalPages: number;
    page: number;
    limit: number;
  };
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // State Diff Modal
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchAuditLogs = async (targetPage = page) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('page', String(targetPage));
      params.set('limit', '25');
      if (actionFilter) params.set('action', actionFilter);
      if (startDate) params.set('startDate', new Date(startDate).toISOString());
      if (endDate) params.set('endDate', new Date(endDate).toISOString());

      const data = await apiClient<AuditLogsResponse>(`/admin/audit-logs?${params.toString()}`);

      setLogs(data.items || []);
      setTotalPages(data.pagination.totalPages || 1);
      setTotalCount(data.pagination.total || 0);
      setPage(targetPage);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs(1);
  }, [actionFilter, startDate, endDate]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6 font-reddit">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-neutral-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-neutral-950 uppercase">
              Security Audit Log
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wider bg-neutral-100 text-neutral-600 border border-neutral-200">
              Immutable Trail
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Read-only, tamper-evident security audit log of administrative, pricing, and financial
            events
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-950 p-3.5 text-xs flex items-center gap-2 font-semibold">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="border border-neutral-200/80 bg-white p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end text-xs shadow-xs">
        <div className="space-y-1">
          <label
            htmlFor="filter-action"
            className="block text-xs font-semibold uppercase tracking-wider text-neutral-700"
          >
            Filter by Action
          </label>
          <select
            id="filter-action"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full border border-neutral-300 p-2 bg-white text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
            aria-label="Filter by Action"
          >
            <option value="">All Recorded Actions</option>
            <option value="USER_LOGIN">User Login</option>
            <option value="USER_LOGIN_FAILED">Login Failed</option>
            <option value="USER_BANNED">Student Banned</option>
            <option value="USER_UNBANNED">Student Unbanned</option>
            <option value="USER_LOGOUT_FORCED">Force Logout</option>
            <option value="ENTITLEMENT_GRANTED">Access Granted</option>
            <option value="ENTITLEMENT_REVOKED">Access Revoked</option>
            <option value="ORDER_PAID">Order Paid</option>
            <option value="REFUND_INITIATED">Refund Initiated</option>
            <option value="REFUND_PROCESSED">Refund Processed</option>
            <option value="PRODUCT_CREATED">Course Created</option>
            <option value="PRODUCT_UPDATED">Course Updated</option>
            <option value="PRODUCT_PUBLISHED">Course Published</option>
            <option value="PRODUCT_UNPUBLISHED">Course Unpublished</option>
            <option value="COUPON_CREATED">Coupon Created</option>
            <option value="COUPON_UPDATED">Coupon Updated</option>
            <option value="SETTING_UPDATED">Setting Updated</option>
          </select>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="filter-start-date"
            className="block text-xs font-semibold uppercase tracking-wider text-neutral-700"
          >
            From Date
          </label>
          <input
            id="filter-start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full border border-neutral-300 p-2 text-xs font-mono bg-white text-neutral-900 focus:outline-none focus:border-neutral-900"
            aria-label="From Date"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="filter-end-date"
            className="block text-xs font-semibold uppercase tracking-wider text-neutral-700"
          >
            To Date
          </label>
          <input
            id="filter-end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full border border-neutral-300 p-2 text-xs font-mono bg-white text-neutral-900 focus:outline-none focus:border-neutral-900"
            aria-label="To Date"
          />
        </div>

        <div>
          <button
            onClick={() => {
              setActionFilter('');
              setStartDate('');
              setEndDate('');
            }}
            className="w-full py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold border border-neutral-300 text-xs tracking-wide transition-colors"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="border border-neutral-200/80 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs font-mono text-neutral-500">
            Querying audit trail...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <h2 className="text-sm font-bold text-neutral-950 uppercase tracking-wider">
              No matching audit events found
            </h2>
            <p className="text-xs text-neutral-500">
              Try broadening your date filter or clearing the action selection.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50/75 border-b border-neutral-200/80">
                  <th className="p-3.5 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">
                    Timestamp
                  </th>
                  <th className="p-3.5 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">
                    Action
                  </th>
                  <th className="p-3.5 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">
                    Actor / Operator
                  </th>
                  <th className="p-3.5 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">
                    Target Entity
                  </th>
                  <th className="p-3.5 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">
                    IP / Client
                  </th>
                  <th className="p-3.5 font-semibold text-neutral-600 uppercase tracking-wider text-[11px] text-right">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/80">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="p-3.5 font-mono text-[11px] whitespace-nowrap text-neutral-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3.5">
                      <span className="font-mono font-semibold text-[10px] px-2 py-0.5 border border-neutral-200 bg-neutral-100 text-neutral-900 uppercase">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3.5 text-xs">
                      {log.actor ? (
                        <div>
                          <div className="font-semibold text-neutral-950">{log.actor.name}</div>
                          <div className="text-neutral-500 font-mono text-[11px]">
                            {log.actor.email}
                          </div>
                        </div>
                      ) : (
                        <span className="text-neutral-400 italic">System Automation</span>
                      )}
                    </td>
                    <td className="p-3.5 text-xs">
                      <div className="font-semibold text-neutral-900">{log.entityType}</div>
                      {log.entityId && (
                        <div className="text-[11px] font-mono text-neutral-400 truncate max-w-[140px]">
                          {log.entityId}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 text-xs font-mono text-neutral-500">
                      <div>{log.ipAddress || '—'}</div>
                    </td>
                    <td className="p-3.5 text-right">
                      {log.beforeState || log.afterState ? (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1 text-xs font-semibold border border-neutral-300 hover:border-neutral-900 bg-white hover:bg-neutral-50 text-neutral-800 transition-colors"
                        >
                          View Diff
                        </button>
                      ) : (
                        <span className="text-neutral-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-3.5 bg-neutral-50/60 border-t border-neutral-200/80 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
          <div className="text-neutral-500 font-mono">
            Showing <strong className="text-neutral-950">{logs.length}</strong> of{' '}
            <strong className="text-neutral-950">{totalCount}</strong> total events recorded
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchAuditLogs(page - 1)}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 border border-neutral-300 hover:border-neutral-900 disabled:opacity-40 bg-white text-neutral-800 text-xs font-semibold tracking-wide transition-colors"
            >
              Previous
            </button>
            <span className="font-semibold font-mono px-2 text-neutral-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => fetchAuditLogs(page + 1)}
              disabled={page >= totalPages || loading}
              className="px-3 py-1.5 border border-neutral-300 hover:border-neutral-900 disabled:opacity-40 bg-white text-neutral-800 text-xs font-semibold tracking-wide transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* State Diff Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white border border-neutral-200/90 shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-neutral-200/80 pb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-950">
                  Audit Event Details
                </h3>
                <div className="text-xs font-mono text-neutral-500 mt-0.5">
                  Action: <strong className="text-neutral-900">{selectedLog.action}</strong> •
                  Entity: {selectedLog.entityType} ({selectedLog.entityId})
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 border border-neutral-200 hover:border-neutral-900 text-neutral-500 hover:text-neutral-900 min-h-[32px] min-w-[32px] inline-flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {Boolean(selectedLog.beforeState) && (
                <div className="space-y-1">
                  <h4 className="font-semibold uppercase tracking-wider text-neutral-600 text-[10px]">
                    State Before Action
                  </h4>
                  <pre className="p-3 bg-neutral-50 border border-neutral-200 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap text-neutral-800">
                    {JSON.stringify(selectedLog.beforeState, null, 2)}
                  </pre>
                </div>
              )}

              {Boolean(selectedLog.afterState) && (
                <div className="space-y-1">
                  <h4 className="font-semibold uppercase tracking-wider text-emerald-800 text-[10px]">
                    State After Action
                  </h4>
                  <pre className="p-3 bg-emerald-50/40 border border-emerald-200 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap text-emerald-950">
                    {JSON.stringify(selectedLog.afterState, null, 2)}
                  </pre>
                </div>
              )}

              <div className="pt-2 text-neutral-400 font-mono text-[11px] border-t border-neutral-100">
                User Agent: {selectedLog.userAgent || 'N/A'}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-neutral-200/80">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 border border-neutral-300 hover:border-neutral-900 text-neutral-800 hover:bg-neutral-50 text-xs font-semibold tracking-wide transition-colors"
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
