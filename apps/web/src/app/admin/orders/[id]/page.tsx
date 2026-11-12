'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ConfirmModal } from '@/components/admin/ConfirmModal';
import { apiClient } from '@/lib/api-client';
import { ArrowLeft, Download, RefreshCcw, ExternalLink, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface PaymentRefund {
  id: string;
  razorpayRefundId: string | null;
  amountPaise: number;
  status: string;
  reason: string | null;
  createdAt: string;
  processedAt: string | null;
}

interface Payment {
  id: string;
  razorpayPaymentId: string | null;
  razorpayOrderId: string | null;
  status: string;
  amountPaise: number;
  currency: string;
  method: string | null;
  capturedAt: string | null;
  createdAt: string;
  refunds: PaymentRefund[];
}

interface OrderDetail {
  id: string;
  razorpayOrderId: string | null;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'CANCELLED';
  subtotalPaise: number;
  discountPaise: number;
  taxPaise: number;
  totalPaise: number;
  currency: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  product: {
    id: string;
    title: string;
    slug: string;
    pricePaise: number;
    validityDays: number | null;
  };
  coupon: {
    id: string;
    code: string;
    type: string;
    value: number;
  } | null;
  payments: Payment[];
  invoice: {
    id: string;
    invoiceNumber: string;
    pdfStorageKey: string | null;
    createdAt: string;
  } | null;
  entitlements: Array<{
    id: string;
    status: string;
    validUntil: string | null;
    source: string;
  }>;
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Refund Modal State
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundType, setRefundType] = useState<'FULL' | 'PARTIAL'>('FULL');
  const [partialAmountRupees, setPartialAmountRupees] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [processingRefund, setProcessingRefund] = useState(false);

  const fetchOrderDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient<OrderDetail>(`/admin/orders/${id}`);
      setOrder(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetail();
  }, [id]);

  const handleOpenRefundModal = () => {
    setRefundReason('');
    setRefundType('FULL');
    setPartialAmountRupees('');
    setRefundModalOpen(true);
  };

  const handleExecuteRefund = async () => {
    if (!order) return;
    if (!refundReason.trim()) {
      alert('Please enter a clear reason for issuing this refund.');
      return;
    }

    let amountPaise: number | undefined;
    if (refundType === 'PARTIAL') {
      const rupees = parseFloat(partialAmountRupees);
      if (isNaN(rupees) || rupees <= 0) {
        alert('Please enter a valid positive partial refund amount.');
        return;
      }
      amountPaise = Math.round(rupees * 100);
      if (amountPaise > order.totalPaise) {
        alert(`Partial refund cannot exceed total order amount (₹${order.totalPaise / 100}).`);
        return;
      }
    }

    try {
      setProcessingRefund(true);
      setError(null);
      setRequestId(null);

      await apiClient(`/admin/orders/${id}/refund`, {
        method: 'POST',
        body: JSON.stringify({
          amountPaise,
          reason: refundReason.trim(),
        }),
      });

      setRefundModalOpen(false);
      setToast('Refund initiated. Status is PENDING until confirmed by Razorpay webhook.');
      await fetchOrderDetail();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to issue refund');
    } finally {
      setProcessingRefund(false);
    }
  };

  const getStatusBadge = (status: OrderDetail['status']) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
            PAID
          </span>
        );
      case 'PENDING':
        return (
          <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
            PENDING
          </span>
        );
      case 'PARTIALLY_REFUNDED':
        return (
          <span className="bg-sky-50 text-sky-800 border border-sky-200 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
            PARTIALLY REFUNDED
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="bg-neutral-100 text-neutral-700 border border-neutral-200 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
            REFUNDED
          </span>
        );
      case 'FAILED':
        return (
          <span className="bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
            FAILED
          </span>
        );
      default:
        return (
          <span className="bg-neutral-100 text-neutral-700 border border-neutral-200 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-xs font-mono text-neutral-500 font-reddit">
        Loading order records...
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="p-6 bg-white border border-rose-200 text-xs font-reddit max-w-3xl space-y-4">
        <div className="flex items-center gap-2 text-rose-800 font-medium">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>Error loading order: {error}</span>
        </div>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-neutral-900 text-white hover:bg-black text-xs font-semibold tracking-wide transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Orders Ledger</span>
        </Link>
      </div>
    );
  }

  if (!order) return null;

  const capturedPayment = order.payments.find((p) => p.status === 'CAPTURED');
  const canRefund =
    (order.status === 'PAID' || order.status === 'PARTIALLY_REFUNDED') && Boolean(capturedPayment);

  // Compute total already refunded
  const allRefunds = order.payments.flatMap((p) => p.refunds || []);
  const totalRefundedPaise = allRefunds
    .filter((r) => r.status === 'PROCESSED' || r.status === 'PENDING')
    .reduce((sum, r) => sum + r.amountPaise, 0);

  return (
    <div className="space-y-6 font-reddit">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-neutral-200/80">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/orders"
            className="p-2 border border-neutral-200/90 hover:border-neutral-900 bg-white hover:bg-neutral-50 text-neutral-700 min-h-[36px] min-w-[36px] inline-flex items-center justify-center transition-colors"
            aria-label="Back to orders ledger"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-neutral-400">Order ID: {order.id}</span>
              {getStatusBadge(order.status)}
            </div>
            <h1 className="text-lg font-bold text-neutral-950 mt-1">
              Order Details
              <span className="text-neutral-400 font-normal font-mono text-xs ml-2">
                • {new Date(order.createdAt).toLocaleString()}
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {order.invoice && (
            <a
              href={`/api/v1/orders/${order.id}/invoice`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-neutral-300 hover:border-neutral-900 bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-semibold tracking-wide transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Invoice #{order.invoice.invoiceNumber}</span>
            </a>
          )}
          {canRefund && (
            <button
              onClick={handleOpenRefundModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-rose-300 hover:bg-rose-50 text-rose-800 text-xs font-semibold tracking-wide transition-colors"
            >
              <RefreshCcw className="w-3.5 h-3.5 text-rose-600" />
              <span>Issue Refund</span>
            </button>
          )}
        </div>
      </div>

      {toast && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3.5 text-xs font-medium flex justify-between items-center">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toast}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-xs uppercase font-semibold text-emerald-800 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-950 p-3.5 text-xs space-y-1">
          <div className="font-semibold">{error}</div>
          {requestId && (
            <div className="text-[11px] font-mono text-rose-700">
              Reference Request ID: {requestId}
            </div>
          )}
        </div>
      )}

      {/* Grid: 3 Order Metadata Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Customer Information */}
        <div className="border border-neutral-200/80 bg-white p-5 shadow-xs space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 border-b border-neutral-100 pb-2">
            Student / Buyer
          </h2>
          <div className="space-y-1.5 text-xs">
            <div className="text-sm font-bold text-neutral-950">{order.user.name}</div>
            <div className="font-mono text-neutral-600">{order.user.email}</div>
            {order.user.phone && (
              <div className="font-mono text-neutral-500">Tel: {order.user.phone}</div>
            )}
            <div className="pt-2">
              <Link
                href={`/admin/students/${order.user.id}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-900 hover:underline"
              >
                <span>View Student Profile &amp; Access</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Product / Course Information */}
        <div className="border border-neutral-200/80 bg-white p-5 shadow-xs space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 border-b border-neutral-100 pb-2">
            Purchased Item
          </h2>
          <div className="space-y-1.5 text-xs">
            <div className="text-sm font-bold text-neutral-950">{order.product.title}</div>
            <div className="text-[11px] text-neutral-500 font-mono">Slug: {order.product.slug}</div>
            <div className="text-neutral-600">
              Validity:{' '}
              {order.product.validityDays
                ? `${order.product.validityDays} Days`
                : 'Lifetime Access'}
            </div>
            <div className="pt-2">
              <Link
                href={`/admin/courses/${order.product.id}/curriculum`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-900 hover:underline"
              >
                <span>Inspect Course Curriculum</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Gateway & UTM Attribution */}
        <div className="border border-neutral-200/80 bg-white p-5 shadow-xs space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 border-b border-neutral-100 pb-2">
            Gateway &amp; Attribution
          </h2>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-neutral-500 text-[11px]">Razorpay Order ID: </span>
              <span className="font-mono text-neutral-950 font-medium ml-1">
                {order.razorpayOrderId || 'N/A (Free Order)'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-200 font-mono text-[10px] text-neutral-700">
                src: {order.utmSource || 'direct'}
              </span>
              <span className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-200 font-mono text-[10px] text-neutral-700">
                camp: {order.utmCampaign || 'none'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Breakdown Table */}
      <div className="border border-neutral-200/80 bg-white p-6 shadow-xs space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-950 pb-3 border-b border-neutral-200/80">
          Financial Breakdown (Exact Price Quote)
        </h2>
        <div className="overflow-x-auto border border-neutral-200/80">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-neutral-50/75 border-b border-neutral-200/80">
              <tr>
                <th className="p-3 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">
                  Description
                </th>
                <th className="p-3 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">
                  Rate / Calculation
                </th>
                <th className="p-3 font-semibold text-neutral-600 uppercase tracking-wider text-[11px] text-right">
                  Amount (₹)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/80">
              <tr>
                <td className="p-3 font-medium text-neutral-900">Course Base Subtotal</td>
                <td className="p-3 text-neutral-500">Standard Product Price</td>
                <td className="p-3 text-right font-mono font-medium text-neutral-900">
                  ₹{(order.subtotalPaise / 100).toFixed(2)}
                </td>
              </tr>
              {order.discountPaise > 0 && (
                <tr className="bg-emerald-50/50 text-emerald-900">
                  <td className="p-3 font-medium">
                    Coupon Discount{' '}
                    {order.coupon && (
                      <span className="font-mono uppercase px-1.5 py-0.2 bg-white border border-emerald-300 ml-1.5 text-[10px]">
                        [{order.coupon.code}]
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-xs text-emerald-800">
                    {order.coupon?.type === 'PERCENT'
                      ? `${order.coupon.value}% Off`
                      : 'Flat Discount'}
                  </td>
                  <td className="p-3 text-right font-mono font-semibold text-emerald-900">
                    -₹{(order.discountPaise / 100).toFixed(2)}
                  </td>
                </tr>
              )}
              {order.taxPaise > 0 && (
                <tr>
                  <td className="p-3 text-neutral-800">Applicable GST / Taxes</td>
                  <td className="p-3 text-neutral-500 text-[11px]">
                    Included in Tax Rate Configuration
                  </td>
                  <td className="p-3 text-right font-mono text-neutral-900">
                    ₹{(order.taxPaise / 100).toFixed(2)}
                  </td>
                </tr>
              )}
              <tr className="bg-neutral-50/80 font-bold border-t border-neutral-300">
                <td className="p-3 uppercase tracking-wider text-neutral-950 text-xs" colSpan={2}>
                  Total Paid by Student
                </td>
                <td className="p-3 text-right font-mono text-neutral-950 text-sm">
                  ₹{(order.totalPaise / 100).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Gateway Payments & Refund Trail */}
      <div className="border border-neutral-200/80 bg-white p-6 shadow-xs space-y-4">
        <div className="flex justify-between items-center border-b border-neutral-200/80 pb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-950">
            Payment Attempts &amp; Refund Log
          </h2>
          {totalRefundedPaise > 0 && (
            <div className="text-xs font-semibold text-rose-800 bg-rose-50 px-2.5 py-1 border border-rose-200">
              Total Refunded: ₹{(totalRefundedPaise / 100).toFixed(2)}
            </div>
          )}
        </div>

        {order.payments.length === 0 ? (
          <p className="text-xs text-neutral-500 italic py-4">
            No gateway payment records found (e.g. 100% coupon order or pending checkout).
          </p>
        ) : (
          <div className="space-y-4">
            {order.payments.map((pmt) => (
              <div key={pmt.id} className="border border-neutral-200/80 p-4 space-y-3 bg-neutral-50/30">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 border border-neutral-200 bg-white text-neutral-600">
                      Payment ID
                    </span>
                    <span className="font-mono text-xs font-bold text-neutral-950">
                      {pmt.razorpayPaymentId || pmt.id}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold px-2 py-0.5 border border-neutral-200 bg-white text-neutral-700">
                      Status: {pmt.status}
                    </span>
                    <span className="font-mono font-bold text-xs text-neutral-950">
                      ₹{(pmt.amountPaise / 100).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-neutral-500 flex flex-wrap gap-4 pt-2 border-t border-neutral-200/60 font-mono text-[11px]">
                  <div>
                    Method: <strong className="text-neutral-900">{pmt.method || 'Online'}</strong>
                  </div>
                  <div>
                    Captured:{' '}
                    <strong className="text-neutral-900">
                      {pmt.capturedAt ? new Date(pmt.capturedAt).toLocaleString() : 'Pending'}
                    </strong>
                  </div>
                  <div>
                    Initiated:{' '}
                    <strong className="text-neutral-900">
                      {new Date(pmt.createdAt).toLocaleString()}
                    </strong>
                  </div>
                </div>

                {/* Nested Refunds */}
                {pmt.refunds && pmt.refunds.length > 0 && (
                  <div className="mt-3 bg-white border border-rose-200/80 p-3 space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-rose-800">
                      Recorded Refunds for this Payment:
                    </div>
                    {pmt.refunds.map((ref) => (
                      <div
                        key={ref.id}
                        className="text-xs border border-neutral-200/80 bg-neutral-50/50 p-2.5 flex flex-col sm:flex-row justify-between gap-2"
                      >
                        <div>
                          <div className="font-mono font-semibold text-neutral-900">
                            Refund ID: {ref.razorpayRefundId || ref.id}
                          </div>
                          <div className="text-neutral-500 text-[11px] mt-0.5">
                            Reason:{' '}
                            <span className="italic text-neutral-800">
                              {ref.reason || 'None provided'}
                            </span>
                          </div>
                        </div>
                        <div className="sm:text-right">
                          <span
                            className={`inline-block px-1.5 py-0.5 font-semibold uppercase text-[9px] border ${
                              ref.status === 'PROCESSED'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {ref.status}
                          </span>
                          <div className="font-mono font-bold text-xs mt-1 text-neutral-950">
                            ₹{(ref.amountPaise / 100).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Course Access / Entitlement Card */}
      <div className="border border-neutral-200/80 bg-white p-5 shadow-xs space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-950 pb-2 border-b border-neutral-200/80">
          Associated Course Access Entitlement
        </h2>
        {order.entitlements.length === 0 ? (
          <p className="text-xs text-neutral-500 italic py-2">
            No entitlement issued (Order unpaid or access manually unlinked).
          </p>
        ) : (
          <div className="space-y-2">
            {order.entitlements.map((ent) => (
              <div
                key={ent.id}
                className="flex justify-between items-center text-xs border border-neutral-200/80 bg-neutral-50/40 p-3"
              >
                <div>
                  <span className="font-medium text-neutral-700">Entitlement Status: </span>
                  <span
                    className={`font-mono font-semibold px-2 py-0.5 text-[10px] border ml-1 ${
                      ent.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                  >
                    {ent.status}
                  </span>
                  <span className="text-neutral-400 font-mono text-[11px] ml-3">
                    Source: {ent.source}
                  </span>
                </div>
                <div className="font-mono text-neutral-600">
                  {ent.validUntil
                    ? `Expires: ${new Date(ent.validUntil).toLocaleDateString()}`
                    : 'Lifetime Access'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation & Refund Action Modal */}
      <ConfirmModal
        isOpen={refundModalOpen}
        title="Issue Refund for Order"
        message={
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 text-xs leading-relaxed">
              <strong>Caution:</strong> Issuing a refund communicates live with Razorpay and records an immutable entry in the audit log. The refund will display as <strong>PENDING</strong> until confirmed by Razorpay webhook.
            </div>

            <div className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-2">
                  Refund Type
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs cursor-pointer font-medium text-neutral-900">
                    <input
                      type="radio"
                      name="refundType"
                      checked={refundType === 'FULL'}
                      onChange={() => setRefundType('FULL')}
                      className="accent-neutral-900"
                    />
                    <span>Full Refund (₹{(order.totalPaise / 100).toFixed(2)})</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer font-medium text-neutral-900">
                    <input
                      type="radio"
                      name="refundType"
                      checked={refundType === 'PARTIAL'}
                      onChange={() => setRefundType('PARTIAL')}
                      className="accent-neutral-900"
                    />
                    <span>Partial Refund</span>
                  </label>
                </div>
              </div>

              {refundType === 'PARTIAL' && (
                <div className="space-y-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
                    Partial Amount in Rupees (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={order.totalPaise / 100}
                    value={partialAmountRupees}
                    onChange={(e) => setPartialAmountRupees(e.target.value)}
                    placeholder={`Max ₹${order.totalPaise / 100}`}
                    className="w-full border border-neutral-300 p-2 font-mono text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                  />
                  <p className="text-[11px] text-neutral-500">
                    Note: Partial refunds will not automatically revoke course access unless manually revoked on the Student page.
                  </p>
                </div>
              )}

              {refundType === 'FULL' && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 text-xs">
                  Full refund effect: Student course access will be automatically revoked once the refund settles.
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
                  Reason for Refund (Strictly Required) *
                </label>
                <textarea
                  rows={3}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Accidental duplicate purchase, student requested refund within guarantee..."
                  className="w-full border border-neutral-300 p-2 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                  required
                />
              </div>
            </div>
          </div>
        }
        confirmText={processingRefund ? 'Processing Live...' : 'Confirm and Issue Refund'}
        cancelText="Cancel"
        isDestructive={true}
        onConfirm={handleExecuteRefund}
        onCancel={() => setRefundModalOpen(false)}
      />
    </div>
  );
}
