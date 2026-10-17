'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api-client';

interface AuditLogItem {
  id: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  beforeState: any;
  afterState: any;
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
    } catch (err: any) {
      setError(err.message || 'Error loading audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs(1);
  }, [actionFilter, startDate, endDate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-black p-4">
        <h1 className="text-2xl font-black text-[#0A192F]">System Audit Log</h1>
        <p className="text-xs text-gray-600 mt-1">
          Read-only, tamper-evident security audit trail of every administrative and financial
          action taken in the academy.
        </p>
      </div>

      {error && (
        <div className="bg-[#FCE8E6] border border-[#C5221F] text-[#C5221F] p-4 font-bold text-sm">
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white border border-black p-4 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end text-sm">
        <div>
          <label htmlFor="filter-action" className="block text-xs font-bold uppercase mb-1">
            Filter by Action
          </label>
          <select
            id="filter-action"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full border border-black p-2 bg-white text-xs"
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

        <div>
          <label htmlFor="filter-start-date" className="block text-xs font-bold uppercase mb-1">
            From Date
          </label>
          <input
            id="filter-start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full border border-black p-2 text-xs"
            aria-label="From Date"
          />
        </div>

        <div>
          <label htmlFor="filter-end-date" className="block text-xs font-bold uppercase mb-1">
            To Date
          </label>
          <input
            id="filter-end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full border border-black p-2 text-xs"
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
            className="w-full py-2 bg-gray-100 text-black font-bold border border-black hover:bg-gray-200 text-xs uppercase"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-black overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 font-bold">Querying audit trail...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <h2 className="text-base font-bold text-gray-700">No matching audit events found</h2>
            <p className="text-xs text-gray-500">
              Try broadening your date filter or clearing the action selection.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100 text-xs font-bold uppercase border-b border-black">
                <tr>
                  <th className="p-3 border-r border-black">Timestamp</th>
                  <th className="p-3 border-r border-black">Action</th>
                  <th className="p-3 border-r border-black">Actor / Operator</th>
                  <th className="p-3 border-r border-black">Target Entity</th>
                  <th className="p-3 border-r border-black">IP / Client</th>
                  <th className="p-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black font-medium">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="p-3 border-r border-black font-mono text-xs whitespace-nowrap text-gray-700">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3 border-r border-black">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 border border-black bg-gray-100">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 border-r border-black text-xs">
                      {log.actor ? (
                        <div>
                          <div className="font-bold text-[#0A192F]">{log.actor.name}</div>
                          <div className="text-gray-500 font-mono">{log.actor.email}</div>
                        </div>
                      ) : (
                        <span className="text-gray-500 italic">System Automation</span>
                      )}
                    </td>
                    <td className="p-3 border-r border-black text-xs">
                      <div className="font-bold">{log.entityType}</div>
                      {log.entityId && (
                        <div className="text-[11px] font-mono text-gray-500 truncate max-w-[140px]">
                          {log.entityId}
                        </div>
                      )}
                    </td>
                    <td className="p-3 border-r border-black text-xs font-mono text-gray-600">
                      <div>{log.ipAddress || '—'}</div>
                    </td>
                    <td className="p-3 text-right">
                      {log.beforeState || log.afterState ? (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2 py-1 text-xs font-bold border border-black hover:bg-[#0A192F] hover:text-white"
                        >
                          View Diff
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-4 bg-gray-50 border-t border-black flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
          <div className="text-gray-600">
            Showing <strong className="text-black">{logs.length}</strong> of{' '}
            <strong className="text-black">{totalCount}</strong> total events recorded
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchAuditLogs(page - 1)}
              disabled={page <= 1 || loading}
              className="px-3 py-1 border border-black font-bold disabled:opacity-30 hover:bg-white"
            >
              &larr; Prev
            </button>
            <span className="font-bold font-mono px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => fetchAuditLogs(page + 1)}
              disabled={page >= totalPages || loading}
              className="px-3 py-1 border border-black font-bold disabled:opacity-30 hover:bg-white"
            >
              Next &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* State Diff Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white border-2 border-black max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-black pb-2">
              <div>
                <h3 className="text-base font-black text-[#0A192F]">Audit Event Details</h3>
                <div className="text-xs font-mono text-gray-600 mt-0.5">
                  Action: <strong className="text-black">{selectedLog.action}</strong> | Entity:{' '}
                  {selectedLog.entityType} ({selectedLog.entityId})
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-500 hover:text-black font-black text-xl"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {selectedLog.beforeState && (
                <div>
                  <h4 className="font-bold uppercase text-gray-600 mb-1">State Before Action</h4>
                  <pre className="p-3 bg-gray-50 border border-gray-300 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(selectedLog.beforeState, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.afterState && (
                <div>
                  <h4 className="font-bold uppercase text-[#137333] mb-1">State After Action</h4>
                  <pre className="p-3 bg-[#E6F4EA]/30 border border-[#137333]/40 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(selectedLog.afterState, null, 2)}
                  </pre>
                </div>
              )}

              <div className="pt-2 text-gray-500 font-mono text-[11px] border-t border-gray-200">
                User Agent: {selectedLog.userAgent || 'N/A'}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-black">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 border border-black font-bold hover:bg-gray-100 text-xs"
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
