'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../../lib/api-client';
import { Input } from '../../../../components/ui/Input';
import { useToast } from '../../../../components/ui/Toast';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';

export default function NewCoursePage() {
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [priceRupees, setPriceRupees] = useState('4999');
  const [compareAtPriceRupees, setCompareAtPriceRupees] = useState('9999');
  const [accessType, setAccessType] = useState<'lifetime' | 'limited'>('lifetime');
  const [validityDays, setValidityDays] = useState('365');
  const [allowRenewals, setAllowRenewals] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-generate URL-safe slug from title if not manually customized
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!isSlugManuallyEdited) {
      const generated = val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      setSlug(generated);
    }
  };

  const handleSlugChange = (val: string) => {
    setIsSlugManuallyEdited(true);
    const cleaned = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '');
    setSlug(cleaned);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const price = Math.round(Number(priceRupees) * 100);
    if (isNaN(price) || price < 0) {
      setErrorMessage('Please enter a valid price in Rupees.');
      return;
    }

    const compareAt = compareAtPriceRupees ? Math.round(Number(compareAtPriceRupees) * 100) : null;

    if (!slug || slug.length < 2) {
      setErrorMessage('Please provide a URL-safe course slug.');
      return;
    }

    setIsLoading(true);
    try {
      const created = await apiClient<{ id: string; slug: string }>('/admin/products', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim(),
          description: description.trim(),
          pricePaise: price,
          compareAtPricePaise: compareAt,
          currency: 'INR',
          validityDays: accessType === 'lifetime' ? null : Number(validityDays) || 365,
          allowRenewals,
          renewalWindowDays: 30,
        }),
      });

      toastSuccess('Course Created', `Course "${title}" created successfully.`);
      router.push(`/admin/courses/${created.id}/curriculum`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create course';
      setErrorMessage(msg);
      toastError('Creation Failed', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6 font-reddit">
      {/* Back button & Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-neutral-200/80">
        <Link
          href="/admin/courses"
          className="p-2 border border-neutral-200/90 hover:border-neutral-900 bg-white hover:bg-neutral-50 text-neutral-700 min-h-[36px] min-w-[36px] inline-flex items-center justify-center transition-colors"
          aria-label="Back to courses list"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-950 uppercase">
            Create New Course Package
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Step 1 of 2: Define course pricing, details, and access duration
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 border border-rose-200 bg-rose-50 text-rose-950 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General Info Card */}
        <div className="border border-neutral-200/80 bg-white p-6 space-y-5 shadow-xs">
          <div className="border-b border-neutral-200/80 pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-950">
              1. General Course Information
            </h2>
          </div>

          <Input
            label="Course Title"
            type="text"
            required
            placeholder="e.g. Proportional Hydraulics & Electrohydraulic Valves Masterclass"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            helperText="The public title displayed on the sales page and in student certificates."
          />

          <div>
            <Input
              label="Web Address Slug (URL)"
              type="text"
              required
              placeholder="proportional-hydraulics-masterclass"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              helperText={`Your course will be accessible at: https://hydrobasics.com/courses/${slug || 'slug-preview'}`}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
              Course Description &amp; Syllabus Overview
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain who this course is for, key engineering principles covered, industrial equipment practiced on, and student takeaways."
              className="w-full p-3 border border-neutral-300 bg-white text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 transition-colors"
            />
            <p className="text-[11px] text-neutral-500">
              Shown to prospective students before they purchase.
            </p>
          </div>
        </div>

        {/* Pricing Card */}
        <div className="border border-neutral-200/80 bg-white p-6 space-y-5 shadow-xs">
          <div className="border-b border-neutral-200/80 pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-950">
              2. Pricing &amp; Discounts (INR ₹)
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Selling Price (₹ Rupees)"
              type="number"
              min="0"
              step="1"
              required
              value={priceRupees}
              onChange={(e) => setPriceRupees(e.target.value)}
              helperText="The actual amount charged to the student at checkout (e.g. 4999)."
            />

            <Input
              label="Compare-At / Strikethrough Price (₹ Optional)"
              type="number"
              min="0"
              step="1"
              value={compareAtPriceRupees}
              onChange={(e) => setCompareAtPriceRupees(e.target.value)}
              helperText="Original price shown with strikethrough (e.g. 9999 for 50% discount)."
            />
          </div>
        </div>

        {/* Access Duration & Renewals */}
        <div className="border border-neutral-200/80 bg-white p-6 space-y-5 shadow-xs">
          <div className="border-b border-neutral-200/80 pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-950">
              3. Student Access Duration &amp; Renewals
            </h2>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
              Access Validity
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <label
                className={`flex-1 p-4 border cursor-pointer text-xs transition-colors ${
                  accessType === 'lifetime'
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                    : 'bg-white text-neutral-800 hover:bg-neutral-50 border-neutral-200'
                }`}
              >
                <input
                  type="radio"
                  name="accessType"
                  className="sr-only"
                  checked={accessType === 'lifetime'}
                  onChange={() => setAccessType('lifetime')}
                />
                <div className="text-xs font-bold uppercase tracking-wider">Lifetime Access</div>
                <div
                  className={`text-[11px] mt-1 ${accessType === 'lifetime' ? 'text-neutral-300' : 'text-neutral-500'}`}
                >
                  Students retain access to all modules indefinitely
                </div>
              </label>

              <label
                className={`flex-1 p-4 border cursor-pointer text-xs transition-colors ${
                  accessType === 'limited'
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                    : 'bg-white text-neutral-800 hover:bg-neutral-50 border-neutral-200'
                }`}
              >
                <input
                  type="radio"
                  name="accessType"
                  className="sr-only"
                  checked={accessType === 'limited'}
                  onChange={() => setAccessType('limited')}
                />
                <div className="text-xs font-bold uppercase tracking-wider">Limited Validity</div>
                <div
                  className={`text-[11px] mt-1 ${accessType === 'limited' ? 'text-neutral-300' : 'text-neutral-500'}`}
                >
                  Access expires after a fixed number of calendar days
                </div>
              </label>
            </div>
          </div>

          {accessType === 'limited' && (
            <div className="p-4 border border-neutral-200/80 bg-neutral-50 space-y-4">
              <Input
                label="Access Validity Window (Days)"
                type="number"
                min="1"
                required
                value={validityDays}
                onChange={(e) => setValidityDays(e.target.value)}
                helperText="Common durations: 365 (1 year), 180 (6 months), 90 (3 months)."
              />

              <label className="flex items-center gap-2 text-xs font-medium text-neutral-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowRenewals}
                  onChange={(e) => setAllowRenewals(e.target.checked)}
                  className="w-4 h-4 accent-neutral-900"
                />
                <span>Allow existing enrolled students to renew before expiry</span>
              </label>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-neutral-200/80">
          <Link
            href="/admin/courses"
            className="px-4 py-2 border border-neutral-300 hover:border-neutral-900 text-neutral-700 hover:bg-neutral-50 text-xs font-semibold tracking-wide transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-neutral-900 text-white hover:bg-black text-xs font-semibold tracking-wide transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isLoading ? 'Saving...' : 'Save & Continue to Curriculum'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
