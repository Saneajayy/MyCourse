'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../../lib/api-client';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
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
    <div className="max-w-3xl space-y-6">
      {/* Back button */}
      <div className="flex items-center gap-3 pb-2 border-b border-black">
        <Link
          href="/admin/courses"
          className="p-1.5 border border-black hover:bg-neutral-100 min-h-[36px] min-w-[36px] inline-flex items-center justify-center transition-colors"
          aria-label="Back to courses list"
        >
          <ArrowLeft className="w-4 h-4 text-course-darkBlue" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-course-darkBlue uppercase tracking-tight">
            Create New Course Package
          </h1>
          <p className="text-xs text-course-navySubtle mt-0.5">
            Step 1 of 2: Define course pricing, details, and access duration
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 border border-black bg-rose-50 text-rose-950 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
          <span className="font-bold">{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card variant="default" padding="lg" className="border border-black space-y-5">
          <div className="border-b border-black pb-2">
            <h2 className="text-sm font-black text-course-darkBlue uppercase tracking-wider">
              1. General Course Information
            </h2>
          </div>

          <Input
            label="Course Title"
            type="text"
            required
            placeholder="e.g. Proportional Hydraulics &amp; Electrohydraulic Valves Masterclass"
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
              helperText={`Your course will be accessible at: https://yoursite.com/courses/${slug || 'slug-preview'}`}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-black uppercase tracking-wider text-course-darkBlue">
              Course Description &amp; Syllabus Overview
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain who this course is for, key engineering principles covered, industrial equipment practiced on, and student takeaways."
              className="w-full p-3 border border-black bg-course-white text-xs text-course-darkBlue focus:outline-none focus:ring-2 focus:ring-course-orange"
            />
            <p className="text-[11px] text-course-navySubtle">
              Shown to prospective students before they purchase.
            </p>
          </div>
        </Card>

        {/* Pricing Card */}
        <Card variant="default" padding="lg" className="border border-black space-y-5">
          <div className="border-b border-black pb-2">
            <h2 className="text-sm font-black text-course-darkBlue uppercase tracking-wider">
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
        </Card>

        {/* Access Duration & Renewals */}
        <Card variant="default" padding="lg" className="border border-black space-y-5">
          <div className="border-b border-black pb-2">
            <h2 className="text-sm font-black text-course-darkBlue uppercase tracking-wider">
              3. Student Access Duration &amp; Renewals
            </h2>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-black uppercase tracking-wider text-course-darkBlue">
              Access Validity
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <label
                className={`flex-1 p-3 border border-black cursor-pointer text-xs font-bold transition-colors ${
                  accessType === 'lifetime'
                    ? 'bg-course-darkBlue text-white'
                    : 'bg-white text-course-darkBlue hover:bg-neutral-50'
                }`}
              >
                <input
                  type="radio"
                  name="accessType"
                  className="sr-only"
                  checked={accessType === 'lifetime'}
                  onChange={() => setAccessType('lifetime')}
                />
                <div className="text-sm font-black">Lifetime Access</div>
                <div className="text-[11px] opacity-90 mt-0.5">Students can watch videos indefinitely</div>
              </label>

              <label
                className={`flex-1 p-3 border border-black cursor-pointer text-xs font-bold transition-colors ${
                  accessType === 'limited'
                    ? 'bg-course-darkBlue text-white'
                    : 'bg-white text-course-darkBlue hover:bg-neutral-50'
                }`}
              >
                <input
                  type="radio"
                  name="accessType"
                  className="sr-only"
                  checked={accessType === 'limited'}
                  onChange={() => setAccessType('limited')}
                />
                <div className="text-sm font-black">Limited Validity</div>
                <div className="text-[11px] opacity-90 mt-0.5">Access expires after a fixed number of days</div>
              </label>
            </div>
          </div>

          {accessType === 'limited' && (
            <div className="p-3 border border-black bg-neutral-50 space-y-4">
              <Input
                label="Access Validity Window (Days)"
                type="number"
                min="1"
                required
                value={validityDays}
                onChange={(e) => setValidityDays(e.target.value)}
                helperText="Common durations: 365 (1 year), 180 (6 months), 90 (3 months)."
              />

              <label className="flex items-center gap-2 text-xs font-bold text-course-darkBlue cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowRenewals}
                  onChange={(e) => setAllowRenewals(e.target.checked)}
                  className="w-4 h-4 accent-course-orange"
                />
                <span>Allow existing students to renew before expiry</span>
              </label>
            </div>
          )}
        </Card>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-black">
          <Link href="/admin/courses">
            <Button type="button" variant="outline" className="text-xs font-bold uppercase tracking-wider py-2.5">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            className="text-xs font-black uppercase tracking-wider py-2.5 px-6"
          >
            <Save className="w-4 h-4 mr-1.5" />
            Save &amp; Continue to Curriculum
          </Button>
        </div>
      </form>
    </div>
  );
}
