'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../../../lib/api-client';
import { Input } from '../../../../../components/ui/Input';
import { useToast } from '../../../../../components/ui/Toast';
import { ArrowLeft, Save, AlertCircle, UploadCloud, ImageIcon, ListOrdered } from 'lucide-react';

interface ProductDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  pricePaise: number;
  compareAtPricePaise: number | null;
  currency: string;
  validityDays: number | null;
  allowRenewals: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

export default function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const courseId = resolvedParams.id;

  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();

  const [course, setCourse] = useState<ProductDetail | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [priceRupees, setPriceRupees] = useState('');
  const [compareAtPriceRupees, setCompareAtPriceRupees] = useState('');
  const [accessType, setAccessType] = useState<'lifetime' | 'limited'>('lifetime');
  const [validityDays, setValidityDays] = useState('365');
  const [allowRenewals, setAllowRenewals] = useState(true);

  // Thumbnail upload state
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchCourse = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await apiClient<ProductDetail>(`/admin/products/${courseId}`);
      setCourse(data);
      setTitle(data.title);
      setSlug(data.slug);
      setDescription(data.description);
      setPriceRupees(String(data.pricePaise / 100));
      setCompareAtPriceRupees(
        data.compareAtPricePaise ? String(data.compareAtPricePaise / 100) : '',
      );
      setAccessType(data.validityDays ? 'limited' : 'lifetime');
      setValidityDays(data.validityDays ? String(data.validityDays) : '365');
      setAllowRenewals(data.allowRenewals !== false);
      setThumbnailUrl(data.thumbnailUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load course';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toastError('Invalid File Type', 'Please upload a JPG, PNG, or WebP image.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toastError('File Too Large', 'Maximum image size is 5 MB.');
      return;
    }

    setThumbnailUploading(true);
    try {
      const formData = new FormData();
      formData.append('thumbnail', file);

      const res = await apiClient<{ thumbnailUrl: string }>(
        `/admin/products/${courseId}/thumbnail`,
        {
          method: 'POST',
          body: formData,
        },
      );

      setThumbnailUrl(res.thumbnailUrl);
      toastSuccess('Thumbnail Uploaded', 'Course thumbnail updated successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload thumbnail';
      toastError('Upload Failed', msg);
    } finally {
      setThumbnailUploading(false);
    }
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

    setIsSaving(true);
    try {
      await apiClient(`/admin/products/${courseId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim(),
          description: description.trim(),
          pricePaise: price,
          compareAtPricePaise: compareAt,
          validityDays: accessType === 'lifetime' ? null : Number(validityDays) || 365,
          allowRenewals,
        }),
      });

      toastSuccess('Course Saved', 'Course details and pricing saved.');
      router.push('/admin/courses');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save changes';
      setErrorMessage(msg);
      toastError('Save Failed', msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-16 text-center text-xs font-mono text-neutral-500 font-reddit">
        Loading course information...
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6 font-reddit">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-neutral-200/80">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/courses"
            className="p-2 border border-neutral-200/90 hover:border-neutral-900 bg-white hover:bg-neutral-50 text-neutral-700 min-h-[36px] min-w-[36px] inline-flex items-center justify-center transition-colors"
            aria-label="Back to courses list"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-950 uppercase">
              Edit Course Details
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5">Editing: {course?.title}</p>
          </div>
        </div>

        <Link
          href={`/admin/courses/${courseId}/curriculum`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-neutral-300 hover:border-neutral-900 text-neutral-800 hover:bg-neutral-50 text-xs font-semibold tracking-wide transition-colors"
        >
          <ListOrdered className="w-3.5 h-3.5" />
          <span>Curriculum Editor</span>
        </Link>
      </div>

      {errorMessage && (
        <div className="p-3.5 border border-rose-200 bg-rose-50 text-rose-950 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Thumbnail Upload Card */}
        <div className="border border-neutral-200/80 bg-white p-6 space-y-4 shadow-xs">
          <div className="border-b border-neutral-200/80 pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-950">
              Course Card Thumbnail
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Recommended: 1280x720 aspect ratio (16:9), max 5 MB JPG/PNG/WebP
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-48 h-28 border border-neutral-200 bg-neutral-100 flex items-center justify-center overflow-hidden shrink-0">
              {thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumbnailUrl}
                  alt="Course Thumbnail Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-3 text-neutral-400">
                  <ImageIcon className="w-7 h-7 mx-auto mb-1 opacity-60" />
                  <span className="text-[10px] font-mono uppercase">No Thumbnail</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleThumbnailUpload}
                  disabled={thumbnailUploading}
                />
                <button
                  type="button"
                  disabled={thumbnailUploading}
                  onClick={(e) => {
                    const input = e.currentTarget.parentElement?.querySelector('input');
                    input?.click();
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-neutral-300 hover:border-neutral-900 text-neutral-800 hover:bg-neutral-50 text-xs font-semibold tracking-wide transition-colors"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>
                    {thumbnailUploading
                      ? 'Uploading...'
                      : thumbnailUrl
                        ? 'Change Thumbnail'
                        : 'Upload Image'}
                  </span>
                </button>
              </label>
              <p className="text-[11px] text-neutral-500">
                Thumbnails are optimized and rendered across public sales and student catalog pages.
              </p>
            </div>
          </div>
        </div>

        {/* General Info */}
        <div className="border border-neutral-200/80 bg-white p-6 space-y-5 shadow-xs">
          <div className="border-b border-neutral-200/80 pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-950">
              Course Information
            </h2>
          </div>

          <Input
            label="Course Title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <Input
            label="Web Address Slug (URL)"
            type="text"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            helperText="Changing slug updates public links. Ensure URL safety."
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
              Description &amp; Syllabus Overview
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 border border-neutral-300 bg-white text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 transition-colors"
            />
          </div>
        </div>

        {/* Pricing */}
        <div className="border border-neutral-200/80 bg-white p-6 space-y-5 shadow-xs">
          <div className="border-b border-neutral-200/80 pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-950">
              Pricing &amp; Discounts
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Selling Price (₹ Rupees)"
              type="number"
              min="0"
              required
              value={priceRupees}
              onChange={(e) => setPriceRupees(e.target.value)}
            />

            <Input
              label="Compare-At Price (₹ Optional)"
              type="number"
              min="0"
              value={compareAtPriceRupees}
              onChange={(e) => setCompareAtPriceRupees(e.target.value)}
            />
          </div>
        </div>

        {/* Validity */}
        <div className="border border-neutral-200/80 bg-white p-6 space-y-5 shadow-xs">
          <div className="border-b border-neutral-200/80 pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-950">
              Access Duration &amp; Renewals
            </h2>
          </div>

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
                Students retain access indefinitely
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

          {accessType === 'limited' && (
            <div className="p-4 border border-neutral-200/80 bg-neutral-50 space-y-4">
              <Input
                label="Access Validity Window (Days)"
                type="number"
                min="1"
                required
                value={validityDays}
                onChange={(e) => setValidityDays(e.target.value)}
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

        {/* Submit */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-neutral-200/80">
          <Link
            href="/admin/courses"
            className="px-4 py-2 border border-neutral-300 hover:border-neutral-900 text-neutral-700 hover:bg-neutral-50 text-xs font-semibold tracking-wide transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-neutral-900 text-white hover:bg-black text-xs font-semibold tracking-wide transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
