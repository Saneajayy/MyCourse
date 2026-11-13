'use client';

import React, { useState, useEffect } from 'react';
import { ConfirmModal } from '@/components/admin/ConfirmModal';
import { apiClient, ApiError } from '../../../lib/api-client';
import { AlertCircle, CheckCircle2, Save } from 'lucide-react';

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
      const s = await apiClient<AppSettings>('/admin/settings');
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading store settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (initialSettings) {
      const gstinChanged = gstin.trim() !== (initialSettings.gstin || '');
      const rateChanged = parseFloat(gstRatePercent) !== (initialSettings.gstRatePercent || 0);
      const inclusiveChanged = pricesTaxInclusive !== (initialSettings.pricesTaxInclusive ?? true);

      if (gstinChanged || rateChanged || inclusiveChanged) {
        setTaxConfirmModalOpen(true);
        return;
      }
    }

    saveSettings();
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setError(null);
      setRequestId(null);
      setTaxConfirmModalOpen(false);

      await apiClient<AppSettings>('/admin/settings', {
        method: 'PUT',
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

      setToast(
        'Store settings saved successfully. New orders will utilize these updated parameters.',
      );
      await fetchSettings();
    } catch (err: unknown) {
      if (err instanceof ApiError && err.requestId) {
        setRequestId(err.requestId);
      }
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-xs font-mono text-neutral-500 font-reddit">
        Loading store settings...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl font-reddit">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-neutral-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-neutral-950 uppercase">
              Store &amp; Tax Settings
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wider bg-neutral-100 text-neutral-600 border border-neutral-200">
              Configuration
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Configure business identity, Indian GST tax rules, invoice sequences, and stream limits
          </p>
        </div>
        {initialSettings?.lastUpdatedAt && (
          <div className="text-[11px] text-neutral-400 font-mono">
            Last saved: {new Date(initialSettings.lastUpdatedAt).toLocaleString()}
          </div>
        )}
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
            <div className="text-[11px] font-mono text-rose-700 ml-6">
              Reference ID: {requestId}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleFormSubmit} className="space-y-5">
        {/* Section 1: Business Profile */}
        <div className="border border-neutral-200/80 bg-white p-6 shadow-xs space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-950 pb-3 border-b border-neutral-200/80">
            1. Business Profile &amp; Contact Info
          </h2>

          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
              Legal Business / Trade Name *
            </label>
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Hydro Basics"
              className="w-full border border-neutral-300 p-2.5 text-xs text-neutral-900 bg-white focus:outline-none focus:border-neutral-900"
            />
            <p className="text-[11px] text-neutral-500">
              This name appears on student tax invoices, checkout receipts, and header branding.
            </p>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
              Registered Business Address
            </label>
            <textarea
              rows={2}
              value={businessAddress}
              onChange={(e) => setBusinessAddress(e.target.value)}
              placeholder="e.g. 102 Industrial Estate, Phase 1, New Delhi, India"
              className="w-full border border-neutral-300 p-2.5 text-xs text-neutral-900 bg-white focus:outline-none focus:border-neutral-900"
            />
            <p className="text-[11px] text-neutral-500">
              Printed on the GST invoice as the registered seller address.
            </p>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
              Customer Support Email Address *
            </label>
            <input
              type="email"
              required
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              placeholder="support@hydrobasics.com"
              className="w-full border border-neutral-300 p-2.5 text-xs font-mono text-neutral-900 bg-white focus:outline-none focus:border-neutral-900"
            />
            <p className="text-[11px] text-neutral-500">
              Contact email given to students on transactional emails, receipts, and footer.
            </p>
          </div>
        </div>

        {/* Section 2: Tax & Indian GST Configuration */}
        <div className="border border-neutral-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="border-b border-neutral-200/80 pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-950">
              2. Indian GST &amp; Tax Configuration
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Tax rules strictly affect NEW orders. Past orders and existing generated invoices will
              not be altered.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
                GSTIN (Goods and Services Tax Number)
              </label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="07AAAAA0000A1Z5 (or leave blank if unregistered)"
                className="w-full border border-neutral-300 p-2.5 text-xs font-mono uppercase bg-white text-neutral-900 focus:outline-none focus:border-neutral-900"
              />
              <p className="text-[11px] text-neutral-500">
                Leave blank if below GST threshold. If empty, tax lines will NOT be displayed at
                checkout.
              </p>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
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
                className="w-full border border-neutral-300 p-2.5 text-xs font-mono bg-white text-neutral-900 focus:outline-none focus:border-neutral-900"
              />
              <p className="text-[11px] text-neutral-500">
                Standard education rate is 18%. Enter 0 if exempt or not collecting GST.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={pricesTaxInclusive}
                onChange={(e) => setPricesTaxInclusive(e.target.checked)}
                className="w-4 h-4 accent-neutral-900"
              />
              <span className="text-xs font-semibold text-neutral-900">
                Display course prices as Tax-Inclusive (Standard in India B2C)
              </span>
            </label>
            <p className="text-[11px] text-neutral-500 mt-1 pl-6">
              When checked, a ₹4,999 course already includes GST in the ₹4,999 price (subtotal will
              be calculated backwards on invoice). When unchecked, GST is added on top at checkout.
            </p>
          </div>
        </div>

        {/* Section 3: Invoice Prefix & Accounting */}
        <div className="border border-neutral-200/80 bg-white p-6 shadow-xs space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-950 pb-3 border-b border-neutral-200/80">
            3. Tax Invoice Sequencing
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
                Invoice Prefix (Max 4 chars) *
              </label>
              <input
                type="text"
                maxLength={4}
                required
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase())}
                placeholder="INV"
                className="w-full border border-neutral-300 p-2.5 text-xs font-mono uppercase bg-white text-neutral-900 focus:outline-none focus:border-neutral-900"
              />
              <p className="text-[11px] text-neutral-500">
                1-4 letters/numbers (e.g. <code>INV</code>, <code>HYD</code>). Formats as{' '}
                <code>INV/26-27/00001</code> to comply with Indian GST 16-character limit.
              </p>
            </div>

            <div className="flex items-center pt-4">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeZeroValueInvoices}
                  onChange={(e) => setIncludeZeroValueInvoices(e.target.checked)}
                  className="w-4 h-4 accent-neutral-900"
                />
                <span className="text-xs font-semibold text-neutral-900">
                  Generate Invoices for ₹0 (100% Free / Coupon) Orders
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Section 4: Video Streaming Security */}
        <div className="border border-neutral-200/80 bg-white p-6 shadow-xs space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-950 pb-3 border-b border-neutral-200/80">
            4. Video Playback &amp; Device Limits
          </h2>

          <div className="max-w-xs space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
              Max Concurrent Streams Per Student
            </label>
            <input
              type="number"
              min="1"
              max="5"
              required
              value={maxConcurrentStreams}
              onChange={(e) => setMaxConcurrentStreams(e.target.value)}
              className="w-full border border-neutral-300 p-2.5 text-xs font-mono bg-white text-neutral-900 focus:outline-none focus:border-neutral-900"
            />
            <p className="text-[11px] text-neutral-500">
              Prevents unauthorized credential sharing. Default is 2 concurrent devices.
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-neutral-900 text-white hover:bg-black font-semibold text-xs tracking-wide transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving Settings...' : 'Save All Settings'}</span>
          </button>
        </div>
      </form>

      {/* Confirmation Modal for Tax Changes */}
      <ConfirmModal
        isOpen={taxConfirmModalOpen}
        title="Confirm Tax & GST Changes"
        message={
          <div className="space-y-3">
            <p>You are updating the GST tax rate or tax-inclusivity settings.</p>
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 text-xs leading-relaxed">
              <strong>Important:</strong> This change will affect NEW orders placed after this
              moment only. Past orders, captured payments, and existing issued tax invoices will
              remain strictly unchanged.
            </div>
            <p className="text-xs text-neutral-600">
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
