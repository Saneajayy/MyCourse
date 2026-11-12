'use client';

import React, { useState, useEffect } from 'react';
import { ConfirmModal } from '@/components/admin/ConfirmModal';
import { apiClient, ApiError } from '../../../lib/api-client';
import { Tag, Plus, AlertCircle, CheckCircle2, X } from 'lucide-react';

interface CouponItem {
  id: string;
  code: string;
  type: 'PERCENT' | 'FLAT';
  value: number; // percent (1-100) or flat paise
  maxRedemptions: number | null;
  perUserLimit: number;
  validFrom: string;
  validUntil: string | null;
  isActive: boolean;
  createdAt: string;
  product: {
    id: string;
    title: string;
    slug: string;
  } | null;
  _count: {
    redemptions: number;
  };
}

interface ProductOption {
  id: string;
  title: string;
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Create Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formCode, setFormCode] = useState('');
  const [formType, setFormType] = useState<'PERCENT' | 'FLAT'>('PERCENT');
  const [formValue, setFormValue] = useState('');
  const [formMaxRedemptions, setFormMaxRedemptions] = useState('');
  const [formPerUserLimit, setFormPerUserLimit] = useState('1');
  const [formValidUntil, setFormValidUntil] = useState('');
  const [formProductId, setFormProductId] = useState('');

  // Deactivate / Toggle Modal State
  const [toggleModalOpen, setToggleModalOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<CouponItem | null>(null);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponItem | null>(null);
  const [editMaxRedemptions, setEditMaxRedemptions] = useState('');
  const [editPerUserLimit, setEditPerUserLimit] = useState('1');
  const [editValidUntil, setEditValidUntil] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);

  const handleOpenEdit = (coupon: CouponItem) => {
    setEditingCoupon(coupon);
    setEditMaxRedemptions(coupon.maxRedemptions !== null ? String(coupon.maxRedemptions) : '');
    setEditPerUserLimit(String(coupon.perUserLimit || 1));
    setEditValidUntil(coupon.validUntil ? coupon.validUntil.slice(0, 10) : '');
    setEditIsActive(coupon.isActive);
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoupon) return;
    setSubmitting(true);
    setError(null);
    setRequestId(null);

    try {
      const maxRed = editMaxRedemptions.trim() ? parseInt(editMaxRedemptions) : null;
      const perUser = parseInt(editPerUserLimit) || 1;
      const validUntil = editValidUntil ? new Date(editValidUntil).toISOString() : null;

      await apiClient(`/admin/coupons/${editingCoupon.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          maxRedemptions: maxRed,
          perUserLimit: perUser,
          validUntil,
          isActive: editIsActive,
        }),
      });

      setEditModalOpen(false);
      setToast(`Coupon ${editingCoupon.code} updated successfully.`);
      setEditingCoupon(null);
      await fetchCouponsAndProducts();
    } catch (err: unknown) {
      if (err instanceof ApiError && err.requestId) {
        setRequestId(err.requestId);
      }
      setError(err instanceof Error ? err.message : 'Failed to update coupon');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchCouponsAndProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const [couponsData, productsData] = await Promise.all([
        apiClient<CouponItem[]>('/admin/coupons'),
        apiClient<ProductOption[]>('/admin/products').catch(() => []),
      ]);

      setCoupons(couponsData || []);
      setProducts(productsData || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCouponsAndProducts();
  }, []);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setRequestId(null);

    const code = formCode.trim().toUpperCase();
    if (!code || !/^[A-Z0-9_-]+$/.test(code)) {
      alert('Code must contain only uppercase letters, numbers, hyphens, and underscores.');
      return;
    }

    const rawVal = parseFloat(formValue);
    if (isNaN(rawVal) || rawVal <= 0) {
      alert('Value must be a positive number.');
      return;
    }

    if (formType === 'PERCENT' && (rawVal < 1 || rawVal > 100)) {
      alert('Percentage discount must be between 1 and 100.');
      return;
    }

    // If flat, convert Rupees to paise
    const value = formType === 'PERCENT' ? Math.round(rawVal) : Math.round(rawVal * 100);

    const maxRedemptions = formMaxRedemptions.trim()
      ? parseInt(formMaxRedemptions.trim(), 10)
      : null;
    const perUserLimit = parseInt(formPerUserLimit.trim(), 10) || 1;
    const validUntil = formValidUntil ? new Date(formValidUntil).toISOString() : null;
    const productId = formProductId ? formProductId : null;

    try {
      setSubmitting(true);
      await apiClient('/admin/coupons', {
        method: 'POST',
        body: JSON.stringify({
          code,
          type: formType,
          value,
          maxRedemptions,
          perUserLimit,
          validUntil,
          productId,
          isActive: true,
        }),
      });

      setCreateModalOpen(false);
      setToast(`Coupon ${code} created successfully.`);
      // Reset form
      setFormCode('');
      setFormValue('');
      setFormMaxRedemptions('');
      setFormPerUserLimit('1');
      setFormValidUntil('');
      setFormProductId('');
      await fetchCouponsAndProducts();
    } catch (err: unknown) {
      if (err instanceof ApiError && err.requestId) {
        setRequestId(err.requestId);
      }
      setError(err instanceof Error ? err.message : 'Failed to create coupon');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async () => {
    if (!selectedCoupon) return;
    try {
      setError(null);
      setRequestId(null);
      const newStatus = !selectedCoupon.isActive;

      await apiClient(`/admin/coupons/${selectedCoupon.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: newStatus }),
      });

      setToggleModalOpen(false);
      setToast(
        newStatus
          ? `Coupon ${selectedCoupon.code} has been reactivated.`
          : `Coupon ${selectedCoupon.code} has been deactivated. Students can no longer apply it.`,
      );
      setSelectedCoupon(null);
      await fetchCouponsAndProducts();
    } catch (err: unknown) {
      if (err instanceof ApiError && err.requestId) {
        setRequestId(err.requestId);
      }
      setError(err instanceof Error ? err.message : 'Failed to toggle coupon');
    }
  };

  return (
    <div className="space-y-6 font-reddit">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-neutral-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-neutral-950 uppercase">
              Discount Coupons
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wider bg-neutral-100 text-neutral-600 border border-neutral-200">
              {coupons.length} Active Codes
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Manage percentage and flat discount codes for course marketing campaigns
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-neutral-900 text-white hover:bg-black text-xs font-semibold tracking-wide transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Coupon</span>
        </button>
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
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          {requestId && (
            <div className="text-[11px] font-mono text-rose-700 ml-6">Request ID: {requestId}</div>
          )}
        </div>
      )}

      {/* Coupon List Table */}
      <div className="border border-neutral-200/80 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs font-mono text-neutral-500">
            Loading promotional coupons...
          </div>
        ) : coupons.length === 0 ? (
          <div className="border border-dashed border-neutral-300 bg-white text-center py-16 px-6 space-y-4 m-4">
            <div className="w-11 h-11 border border-neutral-200 bg-neutral-50 text-neutral-700 flex items-center justify-center mx-auto">
              <Tag className="w-5 h-5" />
            </div>
            <div className="max-w-sm mx-auto space-y-1">
              <h2 className="text-sm font-bold text-neutral-950 uppercase tracking-wider">
                No Discount Coupons Created Yet
              </h2>
              <p className="text-xs text-neutral-500">
                Create your first promotional discount coupon code (e.g. <strong>WELCOME50</strong> or{' '}
                <strong>FLAT500</strong>) to share with your YouTube audience.
              </p>
            </div>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 text-white hover:bg-black text-xs font-semibold tracking-wide transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Coupon Now</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50/75 border-b border-neutral-200/80">
                  <th className="p-3.5 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">Code</th>
                  <th className="p-3.5 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">Discount</th>
                  <th className="p-3.5 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">Redemptions</th>
                  <th className="p-3.5 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">Limits</th>
                  <th className="p-3.5 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">Course Scope</th>
                  <th className="p-3.5 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">Expiry</th>
                  <th className="p-3.5 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">Status</th>
                  <th className="p-3.5 font-semibold text-neutral-600 uppercase tracking-wider text-[11px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/80">
                {coupons.map((coupon) => {
                  const isExpired = coupon.validUntil && new Date(coupon.validUntil) < new Date();
                  return (
                    <tr key={coupon.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="p-3.5">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 bg-neutral-100 text-neutral-900 border border-neutral-200">
                          {coupon.code}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-neutral-950">
                        {coupon.type === 'PERCENT'
                          ? `${coupon.value}% OFF`
                          : `₹${(coupon.value / 100).toFixed(2)} OFF`}
                      </td>
                      <td className="p-3.5 font-mono text-xs">
                        <strong className="text-neutral-950">{coupon._count?.redemptions ?? 0}</strong>
                        <span className="text-neutral-400">
                          {coupon.maxRedemptions
                            ? ` / ${coupon.maxRedemptions}`
                            : ' (Unlimited)'}
                        </span>
                      </td>
                      <td className="p-3.5 text-xs text-neutral-600">
                        {coupon.perUserLimit} per student
                      </td>
                      <td className="p-3.5 text-xs">
                        {coupon.product ? (
                          <span className="font-semibold text-neutral-900">{coupon.product.title}</span>
                        ) : (
                          <span className="text-neutral-400 italic">All Store Courses</span>
                        )}
                      </td>
                      <td className="p-3.5 text-xs font-mono">
                        {coupon.validUntil ? (
                          <span
                            className={isExpired ? 'text-rose-700 font-semibold' : 'text-neutral-600'}
                          >
                            {new Date(coupon.validUntil).toLocaleDateString()}
                            {isExpired && ' (Expired)'}
                          </span>
                        ) : (
                          <span className="text-neutral-400">Never</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        {coupon.isActive && !isExpired ? (
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                            DISABLED
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(coupon)}
                            className="px-2.5 py-1 text-xs font-semibold border border-neutral-300 hover:border-neutral-900 bg-white hover:bg-neutral-50 text-neutral-800 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCoupon(coupon);
                              setToggleModalOpen(true);
                            }}
                            className={`px-2.5 py-1 text-xs font-semibold border transition-colors ${
                              coupon.isActive
                                ? 'border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                            }`}
                          >
                            {coupon.isActive ? 'Deactivate' : 'Reactivate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Coupon Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white border border-neutral-200/90 shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-neutral-200/80 pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-950">
                Create New Discount Coupon
              </h2>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 border border-neutral-200 hover:border-neutral-900 text-neutral-500 hover:text-neutral-900 min-h-[32px] min-w-[32px] inline-flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
                  Coupon Code (e.g. YOUTUBE20) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="DIWALI50"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  className="w-full border border-neutral-300 p-2.5 font-mono font-bold uppercase bg-white text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                />
                <p className="text-[11px] text-neutral-500">
                  Letters, numbers, and hyphens only. Automatically capitalized.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor="coupon-form-type"
                    className="block text-xs font-semibold uppercase tracking-wider text-neutral-700"
                  >
                    Discount Type *
                  </label>
                  <select
                    id="coupon-form-type"
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as 'PERCENT' | 'FLAT')}
                    className="w-full border border-neutral-300 p-2.5 bg-white text-xs font-medium text-neutral-900 focus:outline-none focus:border-neutral-900"
                    aria-label="Discount Type"
                  >
                    <option value="PERCENT">Percentage (% Off)</option>
                    <option value="FLAT">Flat Rupees (₹ Off)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="coupon-form-val"
                    className="block text-xs font-semibold uppercase tracking-wider text-neutral-700"
                  >
                    {formType === 'PERCENT' ? 'Percentage (1-100) *' : 'Amount in Rupees (₹) *'}
                  </label>
                  <input
                    id="coupon-form-val"
                    type="number"
                    step={formType === 'PERCENT' ? '1' : '0.01'}
                    min="1"
                    max={formType === 'PERCENT' ? '100' : undefined}
                    required
                    placeholder={formType === 'PERCENT' ? '20' : '500'}
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    className="w-full border border-neutral-300 p-2.5 font-mono text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                    aria-label={
                      formType === 'PERCENT' ? 'Discount Percentage' : 'Discount Amount in Rupees'
                    }
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="coupon-product-scope"
                  className="block text-xs font-semibold uppercase tracking-wider text-neutral-700"
                >
                  Applicable Course Scope
                </label>
                <select
                  id="coupon-product-scope"
                  value={formProductId}
                  onChange={(e) => setFormProductId(e.target.value)}
                  className="w-full border border-neutral-300 p-2.5 bg-white text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                  aria-label="Applicable Course Scope"
                >
                  <option value="">All Courses in Academy</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-neutral-500">
                  Leave as &quot;All Courses&quot; or restrict this discount to a specific course.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
                    Total Max Redemptions
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    value={formMaxRedemptions}
                    onChange={(e) => setFormMaxRedemptions(e.target.value)}
                    className="w-full border border-neutral-300 p-2.5 font-mono text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                  />
                  <p className="text-[11px] text-neutral-500">Leave blank for unlimited.</p>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
                    Uses Per Student
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formPerUserLimit}
                    onChange={(e) => setFormPerUserLimit(e.target.value)}
                    className="w-full border border-neutral-300 p-2.5 font-mono text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                  />
                  <p className="text-[11px] text-neutral-500">Usually 1 per student.</p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
                  Expiration Date (Optional)
                </label>
                <input
                  type="date"
                  value={formValidUntil}
                  onChange={(e) => setFormValidUntil(e.target.value)}
                  className="w-full border border-neutral-300 p-2.5 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                />
                <p className="text-[11px] text-neutral-500">
                  Leave blank if this coupon should never expire automatically.
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-neutral-200/80">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 hover:border-neutral-900 text-neutral-700 hover:bg-neutral-50 text-xs font-semibold tracking-wide transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-neutral-900 text-white hover:bg-black text-xs font-semibold tracking-wide transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Coupon Modal */}
      {editModalOpen && editingCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white border border-neutral-200/90 shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-neutral-200/80 pb-3">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-950">
                  Edit Coupon
                </h2>
                <p className="text-xs text-neutral-500 font-mono mt-0.5">
                  Code: {editingCoupon.code} (Immutable)
                </p>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1 border border-neutral-200 hover:border-neutral-900 text-neutral-500 hover:text-neutral-900 min-h-[32px] min-w-[32px] inline-flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
                  Coupon Code
                </label>
                <input
                  type="text"
                  disabled
                  value={editingCoupon.code}
                  className="w-full border border-neutral-200 p-2.5 font-mono font-bold uppercase bg-neutral-100 text-neutral-500 cursor-not-allowed"
                />
                <p className="text-[11px] text-neutral-400">
                  Coupon code cannot be changed after creation.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
                    Max Uses (Total)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    value={editMaxRedemptions}
                    onChange={(e) => setEditMaxRedemptions(e.target.value)}
                    className="w-full border border-neutral-300 p-2.5 font-mono text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                  />
                  <p className="text-[11px] text-neutral-500">Leave blank for unlimited.</p>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
                    Uses Per Student *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editPerUserLimit}
                    onChange={(e) => setEditPerUserLimit(e.target.value)}
                    className="w-full border border-neutral-300 p-2.5 font-mono text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                  />
                  <p className="text-[11px] text-neutral-500">Default 1 per student.</p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
                  Expires On
                </label>
                <input
                  type="date"
                  value={editValidUntil}
                  onChange={(e) => setEditValidUntil(e.target.value)}
                  className="w-full border border-neutral-300 p-2.5 font-mono text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                />
                <p className="text-[11px] text-neutral-500">Leave blank for no expiration.</p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="w-4 h-4 accent-neutral-900"
                />
                <label htmlFor="editIsActive" className="text-xs font-medium text-neutral-900 cursor-pointer">
                  Coupon is Active (Students can apply during checkout)
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-neutral-200/80">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 hover:border-neutral-900 text-neutral-700 hover:bg-neutral-50 text-xs font-semibold tracking-wide transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-neutral-900 text-white hover:bg-black text-xs font-semibold tracking-wide transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate / Reactivate Modal */}
      {selectedCoupon && (
        <ConfirmModal
          isOpen={toggleModalOpen}
          title={
            selectedCoupon.isActive
              ? `Deactivate Coupon "${selectedCoupon.code}"?`
              : `Reactivate Coupon "${selectedCoupon.code}"?`
          }
          message={
            selectedCoupon.isActive ? (
              <p>
                Deactivating <strong>{selectedCoupon.code}</strong> will immediately prevent students from applying it during checkout. Students who already completed orders with this coupon will not be affected.
              </p>
            ) : (
              <p>
                Reactivating <strong>{selectedCoupon.code}</strong> will make it immediately valid again for checkouts (subject to expiration date and usage limits).
              </p>
            )
          }
          confirmText={selectedCoupon.isActive ? 'Deactivate Coupon' : 'Reactivate Coupon'}
          cancelText="Cancel"
          isDestructive={selectedCoupon.isActive}
          onConfirm={handleToggleActive}
          onCancel={() => {
            setToggleModalOpen(false);
            setSelectedCoupon(null);
          }}
        />
      )}
    </div>
  );
}
