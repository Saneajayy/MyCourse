'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api-client';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useToast } from '../../../components/ui/Toast';
import { Search, Download, ArrowRight } from 'lucide-react';

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

    // Stream download protected from formula injection
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-black">
        <div>
          <h1 className="text-2xl font-black text-course-darkBlue uppercase tracking-tight">
            Orders &amp; Transactions
          </h1>
          <p className="text-xs text-course-navySubtle mt-0.5">
            Real-time payments ledger, Razorpay gateway identifiers, and customer invoices
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setExportModalOpen(true)}
          className="text-xs font-bold uppercase tracking-wider py-2 self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Export Orders CSV
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card variant="default" padding="md" className="border border-black space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search form */}
          <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search by student email, order ID, or payment ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-black bg-white text-xs text-course-darkBlue focus:outline-none focus:ring-2 focus:ring-course-orange"
              />
              <Search className="w-4 h-4 text-course-navySubtle absolute left-2.5 top-2.5" />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="text-xs font-bold uppercase px-4"
            >
              Search
            </Button>
          </form>

          {/* Date range filters */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="p-1.5 border border-black bg-white text-xs font-mono"
              aria-label="Filter from date"
            />
            <span className="text-xs font-bold text-course-navySubtle">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="p-1.5 border border-black bg-white text-xs font-mono"
              aria-label="Filter to date"
            />
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap border border-black bg-white overflow-hidden text-xs">
          {[
            { id: 'ALL', label: 'All Orders' },
            { id: 'PAID', label: 'Paid' },
            { id: 'PENDING', label: 'Pending' },
            { id: 'CREATED', label: 'Created' },
            { id: 'FAILED', label: 'Failed' },
            { id: 'PARTIALLY_REFUNDED', label: 'Partial Refund' },
            { id: 'REFUNDED', label: 'Refunded' },
          ].map((tab, idx) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 font-bold uppercase min-h-[36px] transition-colors ${
                idx > 0 ? 'border-l border-black' : ''
              } ${
                statusFilter === tab.id
                  ? 'bg-course-darkBlue text-white'
                  : 'text-course-darkBlue hover:bg-neutral-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Orders Table */}
      <Card variant="default" padding="none" className="border border-black overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-100 border-b border-black">
                <th className="p-3 font-black text-course-darkBlue uppercase tracking-wider">
                  Order ID
                </th>
                <th className="p-3 font-black text-course-darkBlue uppercase tracking-wider">
                  Customer Email
                </th>
                <th className="p-3 font-black text-course-darkBlue uppercase tracking-wider">
                  Course Package
                </th>
                <th className="p-3 font-black text-course-darkBlue uppercase tracking-wider">
                  Amount (INR)
                </th>
                <th className="p-3 font-black text-course-darkBlue uppercase tracking-wider">
                  Order Status
                </th>
                <th className="p-3 font-black text-course-darkBlue uppercase tracking-wider">
                  Date
                </th>
                <th className="p-3 font-black text-course-darkBlue uppercase tracking-wider text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-course-navySubtle font-bold">
                    Loading order records...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-course-navySubtle">
                    No orders match your selected filters.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-course-darkBlue">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="hover:text-course-orange hover:underline font-black"
                      >
                        {order.id.slice(0, 13)}...
                      </Link>
                    </td>

                    <td className="p-3 font-mono text-course-navyMuted">{order.user.email}</td>

                    <td className="p-3 font-bold text-course-darkBlue truncate max-w-[200px]">
                      {order.product.title}
                    </td>

                    <td className="p-3 font-mono font-black text-course-darkBlue">
                      {formatRupees(order.totalPaise)}
                    </td>

                    <td className="p-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 border border-black text-[9px] font-black uppercase tracking-wider ${
                          order.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-950'
                            : order.status === 'PENDING' || order.status === 'CREATED'
                              ? 'bg-amber-100 text-amber-950'
                              : order.status === 'PARTIALLY_REFUNDED'
                                ? 'bg-sky-100 text-sky-950'
                                : order.status === 'REFUNDED'
                                  ? 'bg-neutral-200 text-neutral-800'
                                  : 'bg-rose-100 text-rose-950'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>

                    <td className="p-3 font-mono text-course-navySubtle">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>

                    <td className="p-3 text-right">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-course-orange hover:underline"
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
          <div className="p-3 border-t border-black bg-neutral-50 flex items-center justify-between text-xs">
            <span className="font-mono text-course-navySubtle">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} orders)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => fetchOrders(pagination.page - 1)}
                className="text-xs py-1"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchOrders(pagination.page + 1)}
                className="text-xs py-1"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* CSV Export Modal */}
      {exportModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-course-darkBlue/75"
        >
          <div className="w-full max-w-md bg-course-white border-2 border-black p-6 space-y-4">
            <div className="border-b border-black pb-2">
              <h2 className="text-sm font-black text-course-darkBlue uppercase tracking-wider">
                Export Orders to CSV
              </h2>
              <p className="text-xs text-course-navySubtle mt-0.5">
                Stream server-generated CSV with formula injection protection (CWE-1236)
              </p>
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

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-black">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExportModalOpen(false)}
                className="text-xs font-bold uppercase"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDownloadCsv}
                className="text-xs font-black uppercase tracking-wider"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                Download CSV
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
