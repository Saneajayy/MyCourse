'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api-client';
import { Input } from '../../../components/ui/Input';
import { useToast } from '../../../components/ui/Toast';
import { Search, Download, ArrowRight, RefreshCw, X } from 'lucide-react';

interface OrderListItem {
  id: string;
  status: 'CREATED' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
  totalPaise: number;
  currency: string;
  razorpayOrderId: string | null;
  utmSource: string | null;
  utmCampaign: string | null;
  paidAt: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
  product: {
    id: string;
    title: string;
    slug: string;
  };
  payments: Array<{
    id: string;
    status: string;
    razorpayPaymentId: string | null;
  }>;
}

interface OrdersResponse {
  items: OrderListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // CSV Export Modal state
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');

  const { error: toastError } = useToast();

  const fetchOrders = useCallback(
    async (
      page = 1,
      query = searchQuery,
      status = statusFilter,
      start = startDate,
      end = endDate,
    ) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: '20',
        });
        if (query.trim()) params.set('search', query.trim());
        if (status !== 'ALL') params.set('status', status);
        if (start) params.set('startDate', start);
        if (end) params.set('endDate', end);

        const res = await apiClient<OrdersResponse>(`/admin/orders?${params.toString()}`);
        setOrders(res.items);
        setPagination(res.pagination);
      } catch (err: unknown) {
        toastError('Failed to Load Orders', err instanceof Error ? err.message : 'Error');
      } finally {
        setIsLoading(false);
      }
    },
    [searchQuery, statusFilter, startDate, endDate, toastError],
  );

  useEffect(() => {
    fetchOrders(1, searchQuery, statusFilter, startDate, endDate);
  }, [statusFilter, startDate, endDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders(1, searchQuery, statusFilter, startDate, endDate);
  };

  const handleDownloadCsv = () => {
    const params = new URLSearchParams();
    if (exportStartDate) params.set('startDate', exportStartDate);
    if (exportEndDate) params.set('endDate', exportEndDate);

    window.open(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/admin/export/orders.csv?${params.toString()}`,
      '_blank',
    );
    setExportModalOpen(false);
  };

  const formatRupees = (paise: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(paise / 100);
  };

  return (
    <div className="space-y-6 font-reddit">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-neutral-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-neutral-950 uppercase">
              Orders &amp; Transactions
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wider bg-neutral-100 text-neutral-600 border border-neutral-200">
              {pagination.total} Total
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Real-time payments ledger, Razorpay gateway identifiers, and customer invoices
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => fetchOrders(pagination.page)}
            title="Refresh orders"
            className="p-2 border border-neutral-200/90 hover:border-neutral-900 text-neutral-600 hover:text-neutral-950 bg-white hover:bg-neutral-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setExportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-neutral-300 hover:border-neutral-900 bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-semibold tracking-wide transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Orders CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="border border-neutral-200/80 bg-white p-4 space-y-3.5 shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search form */}
          <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search by student email, order ID, or payment ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-neutral-300 bg-white text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 transition-colors"
              />
              <Search className="w-4 h-4 text-neutral-400 absolute left-2.5 top-2.5" />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-neutral-900 text-white hover:bg-black text-xs font-semibold tracking-wide transition-colors"
            >
              Search
            </button>
          </form>

          {/* Date range filters */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="p-2 border border-neutral-300 bg-white text-xs font-mono text-neutral-800 focus:outline-none focus:border-neutral-900"
              aria-label="Filter from date"
            />
            <span className="text-xs text-neutral-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="p-2 border border-neutral-300 bg-white text-xs font-mono text-neutral-800 focus:outline-none focus:border-neutral-900"
              aria-label="Filter to date"
            />
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap p-0.5 border border-neutral-200/90 bg-neutral-100 text-xs gap-0.5">
          {[
            { id: 'ALL', label: 'All Orders' },
            { id: 'PAID', label: 'Paid' },
            { id: 'PENDING', label: 'Pending' },
            { id: 'CREATED', label: 'Created' },
            { id: 'FAILED', label: 'Failed' },
            { id: 'PARTIALLY_REFUNDED', label: 'Partial Refund' },
            { id: 'REFUNDED', label: 'Refunded' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors ${
                statusFilter === tab.id
                  ? 'bg-white text-neutral-950 shadow-xs border border-neutral-200/60'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="border border-neutral-200/80 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50/75 border-b border-neutral-200/80">
                <th className="p-3.5 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">
                  Order ID
                </th>
                <th className="p-3.5 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">
                  Customer Email
                </th>
                <th className="p-3.5 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">
                  Course Package
                </th>
                <th className="p-3.5 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">
                  Amount (INR)
                </th>
                <th className="p-3.5 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">
                  Status
                </th>
                <th className="p-3.5 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">
                  Date
                </th>
                <th className="p-3.5 font-semibold text-neutral-600 uppercase tracking-wider text-[11px] text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/80">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-neutral-500 font-mono">
                    Loading order records...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-neutral-500">
                    No orders match your selected filters.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="p-3.5 font-mono font-medium text-neutral-900">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="hover:underline font-semibold text-neutral-950"
                      >
                        {order.id.slice(0, 13)}...
                      </Link>
                    </td>

                    <td className="p-3.5 font-mono text-neutral-600">{order.user.email}</td>

                    <td className="p-3.5 font-medium text-neutral-900 truncate max-w-[200px]">
                      {order.product.title}
                    </td>

                    <td className="p-3.5 font-mono font-semibold text-neutral-950">
                      {formatRupees(order.totalPaise)}
                    </td>

                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 border text-[10px] font-semibold tracking-wide uppercase ${
                          order.status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : order.status === 'PENDING' || order.status === 'CREATED'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : order.status === 'PARTIALLY_REFUNDED'
                                ? 'bg-sky-50 text-sky-800 border-sky-200'
                                : order.status === 'REFUNDED'
                                  ? 'bg-neutral-100 text-neutral-700 border-neutral-200'
                                  : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>

                    <td className="p-3.5 font-mono text-neutral-500 text-[11px]">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>

                    <td className="p-3.5 text-right">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-900 hover:underline"
                      >
                        <span>Inspect</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-3.5 border-t border-neutral-200/80 bg-neutral-50/60 flex items-center justify-between text-xs">
            <span className="font-mono text-neutral-500">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} orders)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => fetchOrders(pagination.page - 1)}
                className="px-3 py-1.5 border border-neutral-300 hover:border-neutral-900 disabled:opacity-40 bg-white text-neutral-800 text-xs font-semibold tracking-wide transition-colors"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchOrders(pagination.page + 1)}
                className="px-3 py-1.5 border border-neutral-300 hover:border-neutral-900 disabled:opacity-40 bg-white text-neutral-800 text-xs font-semibold tracking-wide transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CSV Export Modal */}
      {exportModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
        >
          <div className="w-full max-w-md bg-white border border-neutral-200/90 shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200/80">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-950">
                  Export Orders to CSV
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Stream server-generated CSV with formula injection protection (CWE-1236)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="p-1 border border-neutral-200 hover:border-neutral-900 text-neutral-500 hover:text-neutral-900 min-h-[32px] min-w-[32px] inline-flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <Input
                label="Orders After (Optional)"
                type="date"
                value={exportStartDate}
                onChange={(e) => setExportStartDate(e.target.value)}
              />
              <Input
                label="Orders Before (Optional)"
                type="date"
                value={exportEndDate}
                onChange={(e) => setExportEndDate(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-200/80">
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="px-4 py-2 border border-neutral-300 hover:border-neutral-900 text-neutral-700 hover:bg-neutral-50 text-xs font-semibold tracking-wide transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDownloadCsv}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-neutral-900 text-white hover:bg-black text-xs font-semibold tracking-wide transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download CSV</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
