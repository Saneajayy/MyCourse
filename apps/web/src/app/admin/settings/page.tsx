'use client';

import React, { useState, useEffect } from 'react';
import { ConfirmModal } from '@/components/admin/ConfirmModal';

interface AppSettings {
  businessName: string;
  businessAddress: string;
  supportEmail: string;
  gstin: string;
  gstRatePercent: number;
  pricesTaxInclusive: boolean;
  invoicePrefix: string;
  includeZeroValueInvoices: boolean;
  maxConcurrentStreams: number;
  lastUpdatedAt: string;
}

export default function AdminSettingsPage() {
  const [initialSettings, setInitialSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Form Fields
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [gstin, setGstin] = useState('');
  const [gstRatePercent, setGstRatePercent] = useState('0');
  const [pricesTaxInclusive, setPricesTaxInclusive] = useState(true);
  const [invoicePrefix, setInvoicePrefix] = useState('INV');
  const [includeZeroValueInvoices, setIncludeZeroValueInvoices] = useState(true);
  const [maxConcurrentStreams, setMaxConcurrentStreams] = useState('2');

  // Confirmation Modal for Tax Changes
  const [taxConfirmModalOpen, setTaxConfirmModalOpen] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/v1/admin/settings');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to fetch settings');
      }
      const s: AppSettings = data.data;
      setInitialSettings(s);
      setBusinessName(s.businessName || '');
      setBusinessAddress(s.businessAddress || '');
      setSupportEmail(s.supportEmail || '');
      setGstin(s.gstin || '');
      setGstRatePercent(String(s.gstRatePercent ?? 0));
      setPricesTaxInclusive(s.pricesTaxInclusive ?? true);
      setInvoicePrefix(s.invoicePrefix || 'INV');
      setIncludeZeroValueInvoices(s.includeZeroValueInvoices ?? true);
      setMaxConcurrentStreams(String(s.maxConcurrentStreams ?? 2));
    } catch (err: any) {
      setError(err.message || 'Error loading store settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check if tax settings changed compared to initial
    if (initialSettings) {
      const gstinChanged = gstin.trim() !== (initialSettings.gstin || '');
      const rateChanged = parseFloat(gstRatePercent) !== (initialSettings.gstRatePercent || 0);
      const inclusiveChanged = pricesTaxInclusive !== (initialSettings.pricesTaxInclusive ?? true);

      if (gstinChanged || rateChanged || inclusiveChanged) {
        setTaxConfirmModalOpen(true);
        return;
      }
    }

    // Otherwise, save immediately
    saveSettings();
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setError(null);
      setRequestId(null);
      setTaxConfirmModalOpen(false);

      const res = await fetch('/api/v1/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: businessName.trim(),
          businessAddress: businessAddress.trim(),
          supportEmail: supportEmail.trim(),
          gstin: gstin.trim().toUpperCase(),
          gstRatePercent: parseFloat(gstRatePercent) || 0,
          pricesTaxInclusive,
          invoicePrefix: invoicePrefix.trim().toUpperCase(),
          includeZeroValueInvoices,
          maxConcurrentStreams: parseInt(maxConcurrentStreams, 10) || 2,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setRequestId(res.headers.get('x-request-id') || null);
        throw new Error(data.message || 'Failed to update store settings');
      }

      setToast('Store settings saved successfully. New orders will use these updated parameters.');
      await fetchSettings();
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 bg-white border border-black max-w-4xl mx-auto">
        <p className="font-bold text-gray-600">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-black p-4">
        <div>
          <h1 className="text-2xl font-black text-[#0A192F]">Store & Tax Settings</h1>
          <p className="text-xs text-gray-600 mt-1">
            Configure business identity, Indian GST tax rules, invoice sequences, and stream limits.
          </p>
        </div>
        {initialSettings?.lastUpdatedAt && (
          <div className="text-xs text-gray-500 font-mono">
            Last saved: {new Date(initialSettings.lastUpdatedAt).toLocaleString()}
          </div>
        )}
      </div>

      {toast && (
        <div className="bg-[#E6F4EA] border border-[#137333] text-[#137333] p-4 font-bold flex justify-between items-center">
          <span>{toast}</span>
          <button onClick={() => setToast(null)} className="text-xs uppercase font-black hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="bg-[#FCE8E6] border border-[#C5221F] text-[#C5221F] p-4 font-bold">
          <div>{error}</div>
          {requestId && <div className="text-xs font-mono mt-1 font-normal">Reference ID: {requestId}</div>}
        </div>
      )}

      <form onSubmit={handleFormSubmit} className="space-y-6">
        {/* Section 1: Business Profile */}
        <div className="bg-white border border-black p-5 space-y-4">
          <h2 className="text-base font-black text-[#0A192F] pb-2 border-b border-black">
            1. Business Profile & Contact Info
          </h2>

          <div>
            <label className="block text-xs font-bold uppercase mb-1">
              Legal Business / Trade Name *
            </label>
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Hydraulic Engineering Academy"
              className="w-full border border-black p-2 text-sm"
            />
            <p className="text-[11px] text-gray-500 mt-0.5">
              This name appears on student tax invoices, checkout receipts, and header branding.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase mb-1">
              Registered Business Address
            </label>
            <textarea
              rows={2}
              value={businessAddress}
              onChange={(e) => setBusinessAddress(e.target.value)}
              placeholder="e.g. 102 Industrial Estate, Phase 1, New Delhi, India"
              className="w-full border border-black p-2 text-sm"
            />
            <p className="text-[11px] text-gray-500 mt-0.5">
              Printed on the GST invoice as seller address.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase mb-1">
              Customer Support Email Address *
            </label>
            <input
              type="email"
              required
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              placeholder="support@hydrauliccourse.com"
              className="w-full border border-black p-2 text-sm font-mono"
            />
            <p className="text-[11px] text-gray-500 mt-0.5">
              Contact email given to students on error messages, receipts, and footer.
            </p>
          </div>
        </div>

        {/* Section 2: Tax & Indian GST Configuration */}
        <div className="bg-white border border-black p-5 space-y-4">
          <div className="border-b border-black pb-2">
            <h2 className="text-base font-black text-[#0A192F]">
              2. Indian GST & Tax Configuration
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Tax rules strictly affect NEW orders. Past orders and existing generated invoices will not be altered.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase mb-1">
                GSTIN (Goods and Services Tax Number)
              </label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="07AAAAA0000A1Z5 (or leave blank if unregistered)"
                className="w-full border border-black p-2 text-sm font-mono uppercase"
              />
              <p className="text-[11px] text-gray-500 mt-0.5">
                Leave blank if below GST threshold. If empty, tax lines will NOT be displayed at checkout.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-1">
                GST Rate Percentage (%)
              </label>
              <input
                type="number"
                min="0"
                max="28"
                step="0.01"
                value={gstRatePercent}
                onChange={(e) => setGstRatePercent(e.target.value)}
                placeholder="18"
                className="w-full border border-black p-2 text-sm font-mono"
              />
              <p className="text-[11px] text-gray-500 mt-0.5">
                Standard education rate is 18%. Enter 0 if exempt or not collecting GST.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={pricesTaxInclusive}
                onChange={(e) => setPricesTaxInclusive(e.target.checked)}
                className="w-4 h-4 accent-[#E05305]"
              />
              <span className="text-sm font-bold text-[#0A192F]">
                Display course prices as Tax-Inclusive (Standard in India B2C)
              </span>
            </label>
            <p className="text-[11px] text-gray-500 mt-1 pl-7">
              When checked, a ₹2,999 course already includes GST in the ₹2,999 price (subtotal will be backed out on invoice).
              When unchecked, GST is added on top at checkout.
            </p>
          </div>
        </div>

        {/* Section 3: Invoice Prefix & Accounting */}
        <div className="bg-white border border-black p-5 space-y-4">
          <h2 className="text-base font-black text-[#0A192F] pb-2 border-b border-black">
            3. Tax Invoice Sequencing
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase mb-1">
                Invoice Prefix (Max 4 chars) *
              </label>
              <input
                type="text"
                maxLength={4}
                required
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase())}
                placeholder="INV"
                className="w-full border border-black p-2 text-sm font-mono uppercase"
              />
              <p className="text-[11px] text-gray-500 mt-0.5">
                1-4 letters/numbers (e.g. <code>INV</code>, <code>HEA</code>). Formats as <code>INV/26-27/00001</code> to comply with Indian GST 16-character limit.
              </p>
            </div>

            <div className="flex items-center pt-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeZeroValueInvoices}
                  onChange={(e) => setIncludeZeroValueInvoices(e.target.checked)}
                  className="w-4 h-4 accent-[#E05305]"
                />
                <span className="text-sm font-bold text-[#0A192F]">
                  Generate Invoices for ₹0 (100% Free / Coupon) Orders
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Section 4: Video Streaming Security */}
        <div className="bg-white border border-black p-5 space-y-4">
          <h2 className="text-base font-black text-[#0A192F] pb-2 border-b border-black">
            4. Video Playback & Device Limits
          </h2>

          <div className="max-w-xs">
            <label className="block text-xs font-bold uppercase mb-1">
              Max Concurrent Streams Per Student
            </label>
            <input
              type="number"
              min="1"
              max="5"
              required
              value={maxConcurrentStreams}
              onChange={(e) => setMaxConcurrentStreams(e.target.value)}
              className="w-full border border-black p-2 text-sm font-mono"
            />
            <p className="text-[11px] text-gray-500 mt-0.5">
              Limits account sharing. Default is 2 (e.g. laptop + mobile). Higher values increase piracy risk.
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-course-darkBlue text-white font-bold border border-black hover:bg-black disabled:opacity-50 text-sm tracking-wider uppercase transition-colors"
          >
            {saving ? 'Saving Settings...' : 'Save All Settings'}
          </button>
        </div>
      </form>

      {/* Confirmation Modal for Tax Changes */}
      <ConfirmModal
        isOpen={taxConfirmModalOpen}
        title="Confirm Tax & GST Changes"
        message={
          <div className="space-y-3">
            <p>
              You are updating the GST tax rate or tax-inclusivity settings.
            </p>
            <div className="bg-[#FEF7E0] border border-[#B06000] text-[#B06000] p-3 text-xs font-bold">
              IMPORTANT: This change will affect NEW orders placed after this moment only.
              Past orders, captured payments, and existing issued tax invoices will remain strictly unchanged.
            </div>
            <p className="text-xs text-gray-600">
              Are you sure you want to apply these tax configuration changes?
            </p>
          </div>
        }
        confirmText="Yes, Apply Changes"
        cancelText="Review Settings"
        isDestructive={false}
        onConfirm={saveSettings}
        onCancel={() => setTaxConfirmModalOpen(false)}
      />
    </div>
  );
}
