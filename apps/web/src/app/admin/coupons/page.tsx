'use client';

import React, { useState, useEffect } from 'react';
import { ConfirmModal } from '@/components/admin/ConfirmModal';

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

      const res = await fetch(`/api/v1/admin/coupons/${editingCoupon.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxRedemptions: maxRed,
          perUserLimit: perUser,
          validUntil,
          isActive: editIsActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setRequestId(res.headers.get('x-request-id') || null);
        throw new Error(data.message || 'Failed to update coupon');
      }

      setEditModalOpen(false);
      setToast(`Coupon ${editingCoupon.code} updated successfully.`);
      setEditingCoupon(null);
      await fetchCouponsAndProducts();
    } catch (err: any) {
      setError(err.message || 'Failed to update coupon');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchCouponsAndProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const [couponsRes, productsRes] = await Promise.all([
        fetch('/api/v1/admin/coupons'),
        fetch('/api/v1/admin/products'),
      ]);

      const couponsData = await couponsRes.json();
      if (!couponsRes.ok) {
        throw new Error(couponsData.message || 'Failed to fetch coupons');
      }
      setCoupons(couponsData.data || []);

      if (productsRes.ok) {
        const pData = await productsRes.json();
        setProducts(pData.data || []);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading coupons');
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
      const res = await fetch('/api/v1/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      const data = await res.json();
      if (!res.ok) {
        setRequestId(res.headers.get('x-request-id') || null);
        throw new Error(data.message || 'Failed to create coupon');
      }

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
    } catch (err: any) {
      setError(err.message || 'Failed to create coupon');
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

      const res = await fetch(`/api/v1/admin/coupons/${selectedCoupon.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        setRequestId(res.headers.get('x-request-id') || null);
        throw new Error(data.message || 'Failed to update coupon status');
      }

      setToggleModalOpen(false);
      setToast(
        newStatus
          ? `Coupon ${selectedCoupon.code} has been reactivated.`
          : `Coupon ${selectedCoupon.code} has been deactivated. Students can no longer apply it.`,
      );
      setSelectedCoupon(null);
      await fetchCouponsAndProducts();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle coupon');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-black p-4">
        <div>
          <h1 className="text-2xl font-black text-[#0A192F]">Discount Coupons</h1>
          <p className="text-xs text-gray-600 mt-1">
            Manage percentage and flat discount codes for course marketing campaigns.
          </p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2 bg-course-darkBlue text-white font-bold border border-black hover:bg-black transition-colors text-sm"
        >
          + Create New Coupon
        </button>
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
            <div className="text-xs font-mono mt-1 font-normal">Request ID: {requestId}</div>
          )}
        </div>
      )}

      {/* Coupon List Table */}
      <div className="bg-white border border-black overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 font-bold">
            Loading promotional coupons...
          </div>
        ) : coupons.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="text-4xl">🏷️</div>
            <h2 className="text-lg font-black text-[#0A192F]">No Discount Coupons Created Yet</h2>
            <p className="text-sm text-gray-600 max-w-md mx-auto">
              Create your first promotional discount coupon code (e.g. <strong>WELCOME50</strong> or{' '}
              <strong>FLAT500</strong>) to share with your YouTube audience.
            </p>
            <div>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="px-4 py-2 bg-course-darkBlue text-white font-bold border border-black hover:bg-black text-sm"
              >
                Create Coupon Now
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100 text-xs font-bold uppercase border-b border-black">
                <tr>
                  <th className="p-3 border-r border-black">Code</th>
                  <th className="p-3 border-r border-black">Discount</th>
                  <th className="p-3 border-r border-black">Redemptions</th>
                  <th className="p-3 border-r border-black">Limits</th>
                  <th className="p-3 border-r border-black">Course Scope</th>
                  <th className="p-3 border-r border-black">Expiry</th>
                  <th className="p-3 border-r border-black">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black font-medium">
                {coupons.map((coupon) => {
                  const isExpired = coupon.validUntil && new Date(coupon.validUntil) < new Date();
                  return (
                    <tr key={coupon.id} className="hover:bg-gray-50">
                      <td className="p-3 border-r border-black">
                        <span className="font-mono font-black text-base px-2 py-0.5 bg-gray-100 border border-black">
                          {coupon.code}
                        </span>
                      </td>
                      <td className="p-3 border-r border-black font-bold">
                        {coupon.type === 'PERCENT'
                          ? `${coupon.value}% OFF`
                          : `₹${(coupon.value / 100).toFixed(2)} OFF`}
                      </td>
                      <td className="p-3 border-r border-black font-mono">
                        <strong className="text-black">{coupon._count?.redemptions ?? 0}</strong>
                        <span className="text-gray-500">
                          {coupon.maxRedemptions
                            ? ` / ${coupon.maxRedemptions} max`
                            : ' (Unlimited)'}
                        </span>
                      </td>
                      <td className="p-3 border-r border-black text-xs text-gray-600">
                        {coupon.perUserLimit} per student
                      </td>
                      <td className="p-3 border-r border-black text-xs">
                        {coupon.product ? (
                          <span className="font-bold text-[#0A192F]">{coupon.product.title}</span>
                        ) : (
                          <span className="text-gray-500 italic">All Store Courses</span>
                        )}
                      </td>
                      <td className="p-3 border-r border-black text-xs font-mono">
                        {coupon.validUntil ? (
                          <span
                            className={isExpired ? 'text-[#C5221F] font-bold' : 'text-gray-700'}
                          >
                            {new Date(coupon.validUntil).toLocaleDateString()}
                            {isExpired && ' (Expired)'}
                          </span>
                        ) : (
                          <span className="text-gray-400">Never</span>
                        )}
                      </td>
                      <td className="p-3 border-r border-black">
                        {coupon.isActive && !isExpired ? (
                          <span className="bg-[#E6F4EA] text-[#137333] border border-[#137333] px-2 py-0.5 text-xs font-bold">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="bg-[#FCE8E6] text-[#C5221F] border border-[#C5221F] px-2 py-0.5 text-xs font-bold">
                            DISABLED
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(coupon)}
                            className="px-3 py-1 text-xs font-bold border border-black bg-white hover:bg-gray-100 text-[#0A192F]"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCoupon(coupon);
                              setToggleModalOpen(true);
                            }}
                            className={`px-3 py-1 text-xs font-bold border border-black ${
                              coupon.isActive
                                ? 'bg-[#FCE8E6] text-[#C5221F] hover:bg-[#C5221F] hover:text-white'
                                : 'bg-[#E6F4EA] text-[#137333] hover:bg-[#137333] hover:text-white'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white border-2 border-black max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-black pb-3">
              <h2 className="text-lg font-black text-[#0A192F]">Create New Discount Coupon</h2>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-gray-500 hover:text-black font-black text-lg"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold uppercase mb-1">
                  Coupon Code (e.g. YOUTUBE20) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="DIWALI50"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  className="w-full border border-black p-2 font-mono font-bold uppercase"
                />
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Letters, numbers, and hyphens only. Automatically capitalized.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="coupon-form-type"
                    className="block text-xs font-bold uppercase mb-1"
                  >
                    Discount Type *
                  </label>
                  <select
                    id="coupon-form-type"
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full border border-black p-2 bg-white"
                    aria-label="Discount Type"
                  >
                    <option value="PERCENT">Percentage (% Off)</option>
                    <option value="FLAT">Flat Rupees (₹ Off)</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="coupon-form-val"
                    className="block text-xs font-bold uppercase mb-1"
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
                    className="w-full border border-black p-2 font-mono"
                    aria-label={
                      formType === 'PERCENT' ? 'Discount Percentage' : 'Discount Amount in Rupees'
                    }
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="coupon-product-scope"
                  className="block text-xs font-bold uppercase mb-1"
                >
                  Applicable Course Scope
                </label>
                <select
                  id="coupon-product-scope"
                  value={formProductId}
                  onChange={(e) => setFormProductId(e.target.value)}
                  className="w-full border border-black p-2 bg-white"
                  aria-label="Applicable Course Scope"
                >
                  <option value="">All Courses in Academy</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Leave as "All Courses" or restrict this discount to a specific course.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">
                    Total Max Redemptions
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    value={formMaxRedemptions}
                    onChange={(e) => setFormMaxRedemptions(e.target.value)}
                    className="w-full border border-black p-2 font-mono"
                  />
                  <p className="text-[11px] text-gray-500 mt-0.5">Leave blank for unlimited.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Uses Per Student</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formPerUserLimit}
                    onChange={(e) => setFormPerUserLimit(e.target.value)}
                    className="w-full border border-black p-2 font-mono"
                  />
                  <p className="text-[11px] text-gray-500 mt-0.5">Usually 1 per student.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-1">
                  Expiration Date (Optional)
                </label>
                <input
                  type="date"
                  value={formValidUntil}
                  onChange={(e) => setFormValidUntil(e.target.value)}
                  className="w-full border border-black p-2"
                />
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Leave blank if this coupon should never expire automatically.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-black">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 border border-black font-bold hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-course-darkBlue text-white font-bold border border-black hover:bg-black disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white border-2 border-black max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-black pb-3">
              <div>
                <h2 className="text-lg font-black text-[#0A192F]">Edit Coupon</h2>
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                  Code: {editingCoupon.code} (Fixed)
                </p>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-gray-500 hover:text-black font-black text-lg"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold uppercase mb-1">Coupon Code</label>
                <input
                  type="text"
                  disabled
                  value={editingCoupon.code}
                  className="w-full border border-black p-2 font-mono font-bold uppercase bg-gray-100 text-gray-600 cursor-not-allowed"
                />
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Coupon code cannot be changed after creation.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Max Uses (Total)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    value={editMaxRedemptions}
                    onChange={(e) => setEditMaxRedemptions(e.target.value)}
                    className="w-full border border-black p-2 font-mono"
                  />
                  <p className="text-[11px] text-gray-500 mt-0.5">Leave blank for unlimited.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase mb-1">
                    Uses Per Student *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editPerUserLimit}
                    onChange={(e) => setEditPerUserLimit(e.target.value)}
                    className="w-full border border-black p-2 font-mono"
                  />
                  <p className="text-[11px] text-gray-500 mt-0.5">Default 1.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-1">Expires On</label>
                <input
                  type="date"
                  value={editValidUntil}
                  onChange={(e) => setEditValidUntil(e.target.value)}
                  className="w-full border border-black p-2 font-mono"
                />
                <p className="text-[11px] text-gray-500 mt-0.5">Leave blank for no expiration.</p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="w-4 h-4 border border-black accent-course-darkBlue"
                />
                <label htmlFor="editIsActive" className="text-xs font-bold text-[#0A192F]">
                  Coupon is Active (Students can apply during checkout)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-black">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 border border-black font-bold text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-course-darkBlue text-white font-bold border border-black hover:bg-black disabled:opacity-50"
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
                Deactivating <strong>{selectedCoupon.code}</strong> will immediately prevent
                students from applying it during checkout. Students who already completed orders
                with this coupon will not be affected.
              </p>
            ) : (
              <p>
                Reactivating <strong>{selectedCoupon.code}</strong> will make it immediately valid
                again for checkouts (subject to expiration date and limits).
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
