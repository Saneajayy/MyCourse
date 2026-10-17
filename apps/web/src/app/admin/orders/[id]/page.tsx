'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ConfirmModal } from '@/components/admin/ConfirmModal';
import { apiClient } from '@/lib/api-client';

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
    } catch (err: any) {
      setError(err.message || 'An error occurred');
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
    } catch (err: any) {
      setError(err.message || 'Failed to issue refund');
    } finally {
      setProcessingRefund(false);
    }
  };

  const getStatusBadge = (status: OrderDetail['status']) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="bg-[#E6F4EA] text-[#137333] border border-[#137333] px-2.5 py-0.5 text-xs font-bold">
            PAID
          </span>
        );
      case 'PENDING':
        return (
          <span className="bg-[#FEF7E0] text-[#B06000] border border-[#B06000] px-2.5 py-0.5 text-xs font-bold">
            PENDING
          </span>
        );
      case 'PARTIALLY_REFUNDED':
        return (
          <span className="bg-[#E8F0FE] text-[#1A73E8] border border-[#1A73E8] px-2.5 py-0.5 text-xs font-bold">
            PARTIALLY REFUNDED
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="bg-[#FCE8E6] text-[#C5221F] border border-[#C5221F] px-2.5 py-0.5 text-xs font-bold">
            REFUNDED
          </span>
        );
      case 'FAILED':
        return (
          <span className="bg-[#FCE8E6] text-[#C5221F] border border-[#C5221F] px-2.5 py-0.5 text-xs font-bold">
            FAILED
          </span>
        );
      default:
        return (
          <span className="bg-gray-100 text-gray-700 border border-black px-2.5 py-0.5 text-xs font-bold">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 bg-white border border-black max-w-5xl mx-auto">
        <p className="font-bold text-gray-600">Loading order records...</p>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="p-6 md:p-8 bg-white border border-black max-w-5xl mx-auto">
        <div className="bg-[#FCE8E6] border border-[#C5221F] text-[#C5221F] p-4 font-bold mb-4">
          Error: {error}
        </div>
        <Link
          href="/admin/orders"
          className="inline-block px-4 py-2 bg-black text-white font-bold border border-black hover:bg-[#E05305]"
        >
          &larr; Back to Orders Ledger
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
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-black p-4">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/orders"
              className="text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-black"
            >
              &larr; Orders
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-xs font-mono font-bold text-gray-700">{order.id}</span>
          </div>
          <h1 className="text-2xl font-black text-[#0A192F] mt-1 flex items-center gap-3">
            Order Details {getStatusBadge(order.status)}
          </h1>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {order.invoice && (
            <a
              href={`/api/v1/orders/${order.id}/invoice`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 sm:flex-none text-center px-4 py-2 bg-white text-black font-bold border border-black hover:bg-gray-100 text-sm"
            >
              Download Invoice #{order.invoice.invoiceNumber}
            </a>
          )}
          {canRefund && (
            <button
              onClick={handleOpenRefundModal}
              className="flex-1 sm:flex-none px-4 py-2 bg-[#FCE8E6] text-[#C5221F] font-bold border border-[#C5221F] hover:bg-[#C5221F] hover:text-white text-sm"
            >
              Issue Refund
            </button>
          )}
        </div>
      </div>

      {toast && (
        <div className="bg-[#E6F4EA] border border-[#137333] text-[#137333] p-4 font-bold flex justify-between items-center">
          <span>{toast}</span>
          <button
            onClick={() => setToast(null)}
            className="text-xs uppercase font-black hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="bg-[#FCE8E6] border border-[#C5221F] text-[#C5221F] p-4 font-bold">
          <div>{error}</div>
          {requestId && (
            <div className="text-xs font-mono mt-1 font-normal">
              Reference Request ID: {requestId}
            </div>
          )}
        </div>
      )}

      {/* Grid: Order Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Customer Information */}
        <div className="bg-white border border-black p-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 border-b border-gray-200 pb-2">
            Student / Buyer
          </h2>
          <div className="space-y-2">
            <div className="text-base font-black text-[#0A192F]">{order.user.name}</div>
            <div className="text-sm font-mono text-gray-700">{order.user.email}</div>
            {order.user.phone && (
              <div className="text-sm font-mono text-gray-600">Tel: {order.user.phone}</div>
            )}
            <div className="pt-2">
              <Link
                href={`/admin/students/${order.user.id}`}
                className="inline-block text-xs font-bold text-[#E05305] hover:underline"
              >
                View Student Profile & Access &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Product / Course Information */}
        <div className="bg-white border border-black p-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 border-b border-gray-200 pb-2">
            Purchased Item
          </h2>
          <div className="space-y-2">
            <div className="text-base font-black text-[#0A192F]">{order.product.title}</div>
            <div className="text-xs text-gray-500 font-mono">Slug: {order.product.slug}</div>
            <div className="text-sm text-gray-700">
              Validity:{' '}
              {order.product.validityDays
                ? `${order.product.validityDays} Days`
                : 'Lifetime Access'}
            </div>
            <div className="pt-2">
              <Link
                href={`/admin/courses/${order.product.id}/curriculum`}
                className="inline-block text-xs font-bold text-[#0A192F] hover:underline"
              >
                Inspect Course Curriculum &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Gateway & UTM Attribution */}
        <div className="bg-white border border-black p-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 border-b border-gray-200 pb-2">
            Gateway & Attribution
          </h2>
          <div className="space-y-1.5 text-xs">
            <div>
              <span className="text-gray-500 font-bold">Razorpay Order ID: </span>
              <span className="font-mono text-gray-900">
                {order.razorpayOrderId || 'N/A (Free Order)'}
              </span>
            </div>
            <div>
              <span className="text-gray-500 font-bold">UTM Source: </span>
              <span className="font-mono bg-gray-100 px-1 border border-gray-300">
                {order.utmSource || 'direct'}
              </span>
            </div>
            <div>
              <span className="text-gray-500 font-bold">UTM Medium: </span>
              <span className="font-mono bg-gray-100 px-1 border border-gray-300">
                {order.utmMedium || 'none'}
              </span>
            </div>
            <div>
              <span className="text-gray-500 font-bold">UTM Campaign: </span>
              <span className="font-mono bg-gray-100 px-1 border border-gray-300">
                {order.utmCampaign || 'none'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Breakdown Table */}
      <div className="bg-white border border-black p-5">
        <h2 className="text-base font-black text-[#0A192F] mb-4 pb-2 border-b border-black">
          Financial Breakdown (Exact Price Quote)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border border-black">
            <thead className="bg-gray-100 text-xs font-bold uppercase border-b border-black">
              <tr>
                <th className="p-3 border-r border-black">Description</th>
                <th className="p-3 border-r border-black">Rate / Calculation</th>
                <th className="p-3 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black font-medium">
              <tr>
                <td className="p-3 border-r border-black font-bold">Course Base Subtotal</td>
                <td className="p-3 border-r border-black text-gray-600">Standard Product Price</td>
                <td className="p-3 text-right font-mono">
                  ₹{(order.subtotalPaise / 100).toFixed(2)}
                </td>
              </tr>
              {order.discountPaise > 0 && (
                <tr className="bg-[#E6F4EA]/40 text-[#137333]">
                  <td className="p-3 border-r border-black font-bold">
                    Coupon Discount{' '}
                    {order.coupon && (
                      <span className="font-mono uppercase px-1 border border-[#137333] ml-2">
                        [{order.coupon.code}]
                      </span>
                    )}
                  </td>
                  <td className="p-3 border-r border-black text-xs">
                    {order.coupon?.type === 'PERCENT'
                      ? `${order.coupon.value}% Off`
                      : 'Flat Discount'}
                  </td>
                  <td className="p-3 text-right font-mono font-bold">
                    -₹{(order.discountPaise / 100).toFixed(2)}
                  </td>
                </tr>
              )}
              {order.taxPaise > 0 && (
                <tr>
                  <td className="p-3 border-r border-black">Applicable GST / Taxes</td>
                  <td className="p-3 border-r border-black text-gray-600 text-xs">
                    Based on Tax Configuration
                  </td>
                  <td className="p-3 text-right font-mono">₹{(order.taxPaise / 100).toFixed(2)}</td>
                </tr>
              )}
              <tr className="bg-gray-50 text-base font-black border-t-2 border-black">
                <td className="p-3 border-r border-black uppercase tracking-wider" colSpan={2}>
                  Total Paid by Student
                </td>
                <td className="p-3 text-right font-mono text-[#0A192F]">
                  ₹{(order.totalPaise / 100).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Gateway Payments & Refund Trail */}
      <div className="bg-white border border-black p-5 space-y-4">
        <div className="flex justify-between items-center border-b border-black pb-2">
          <h2 className="text-base font-black text-[#0A192F]">Payment Attempts & Refund Log</h2>
          {totalRefundedPaise > 0 && (
            <div className="text-xs font-bold text-[#C5221F] bg-[#FCE8E6] px-2 py-1 border border-[#C5221F]">
              Total Refunded to Date: ₹{(totalRefundedPaise / 100).toFixed(2)}
            </div>
          )}
        </div>

        {order.payments.length === 0 ? (
          <p className="text-sm text-gray-500 italic py-4">
            No payment records found (e.g. 100% discount order or abandoned cart).
          </p>
        ) : (
          <div className="space-y-4">
            {order.payments.map((pmt) => (
              <div key={pmt.id} className="border border-black p-4 space-y-3">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 border border-black bg-gray-100">
                      Payment ID
                    </span>
                    <span className="font-mono text-sm font-bold">
                      {pmt.razorpayPaymentId || pmt.id}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold px-2 py-0.5 border border-black bg-white">
                      Status: {pmt.status}
                    </span>
                    <span className="font-mono font-bold text-sm">
                      ₹{(pmt.amountPaise / 100).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-gray-600 flex flex-wrap gap-4 pt-1 border-t border-gray-200">
                  <div>
                    Method: <strong className="text-black">{pmt.method || 'Online'}</strong>
                  </div>
                  <div>
                    Captured:{' '}
                    <strong className="text-black">
                      {pmt.capturedAt ? new Date(pmt.capturedAt).toLocaleString() : 'Pending'}
                    </strong>
                  </div>
                  <div>
                    Initiated:{' '}
                    <strong className="text-black">
                      {new Date(pmt.createdAt).toLocaleString()}
                    </strong>
                  </div>
                </div>

                {/* Nested Refunds */}
                {pmt.refunds && pmt.refunds.length > 0 && (
                  <div className="mt-3 bg-gray-50 border border-black p-3 space-y-2">
                    <div className="text-xs font-black uppercase tracking-wider text-[#C5221F]">
                      Recorded Refunds for this Payment:
                    </div>
                    {pmt.refunds.map((ref) => (
                      <div
                        key={ref.id}
                        className="text-xs border border-gray-300 bg-white p-2 flex flex-col sm:flex-row justify-between gap-2"
                      >
                        <div>
                          <div className="font-mono font-bold">
                            Refund ID: {ref.razorpayRefundId || ref.id}
                          </div>
                          <div className="text-gray-600 mt-0.5">
                            Reason:{' '}
                            <span className="italic text-gray-900">
                              {ref.reason || 'None provided'}
                            </span>
                          </div>
                        </div>
                        <div className="sm:text-right">
                          <span
                            className={`inline-block px-1.5 py-0.5 font-bold uppercase text-[10px] border ${
                              ref.status === 'PROCESSED'
                                ? 'bg-[#E6F4EA] text-[#137333] border-[#137333]'
                                : 'bg-[#FEF7E0] text-[#B06000] border-[#B06000]'
                            }`}
                          >
                            {ref.status}
                          </span>
                          <div className="font-mono font-bold mt-1">
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
      <div className="bg-white border border-black p-5">
        <h2 className="text-base font-black text-[#0A192F] mb-3 pb-2 border-b border-black">
          Associated Course Access Entitlement
        </h2>
        {order.entitlements.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            No entitlement issued (Order unpaid or access manually unlinked).
          </p>
        ) : (
          <div className="space-y-2">
            {order.entitlements.map((ent) => (
              <div
                key={ent.id}
                className="flex justify-between items-center text-sm border border-black p-3"
              >
                <div>
                  <span className="font-bold text-[#0A192F]">Entitlement Status: </span>
                  <span
                    className={`font-mono font-bold px-2 py-0.5 text-xs border ${
                      ent.status === 'ACTIVE'
                        ? 'bg-[#E6F4EA] text-[#137333] border-[#137333]'
                        : 'bg-[#FCE8E6] text-[#C5221F] border-[#C5221F]'
                    }`}
                  >
                    {ent.status}
                  </span>
                  <span className="text-xs text-gray-500 ml-3">Source: {ent.source}</span>
                </div>
                <div className="text-xs font-mono">
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
          <div>
            <div className="bg-[#FEF7E0] border border-[#B06000] text-[#B06000] p-3 text-xs mb-4">
              <strong>CAUTION:</strong> Issuing a refund sends a live request to Razorpay and
              immediately writes an entry into the system audit log. The refund will display as{' '}
              <strong>PENDING</strong> until Razorpay confirms settlement via webhook.
            </div>

            <div className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold uppercase mb-1">Refund Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="refundType"
                      checked={refundType === 'FULL'}
                      onChange={() => setRefundType('FULL')}
                      className="accent-[#E05305]"
                    />
                    <span>Full Refund (₹{(order.totalPaise / 100).toFixed(2)})</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="refundType"
                      checked={refundType === 'PARTIAL'}
                      onChange={() => setRefundType('PARTIAL')}
                      className="accent-[#E05305]"
                    />
                    <span>Partial Refund</span>
                  </label>
                </div>
              </div>

              {refundType === 'PARTIAL' && (
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">
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
                    className="w-full border border-black p-2 font-mono text-sm"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Note: Partial refunds will NOT automatically revoke course access unless
                    manually revoked on the Student page.
                  </p>
                </div>
              )}

              {refundType === 'FULL' && (
                <div className="p-3 bg-[#FCE8E6] border border-[#C5221F] text-[#C5221F] text-xs font-bold">
                  Full refund effect: The student will have their course access revoked immediately
                  once the refund settles.
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase mb-1">
                  Reason for Refund (Strictly Required) *
                </label>
                <textarea
                  rows={3}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Customer accidentally bought twice, dissatisfied with course, student requested refund within 7-day guarantee..."
                  className="w-full border border-black p-2 text-sm"
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
