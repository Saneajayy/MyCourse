'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../../../lib/api-client';
import { Card } from '../../../../../components/ui/Card';
import { Button } from '../../../../../components/ui/Button';
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
      setCompareAtPriceRupees(data.compareAtPricePaise ? String(data.compareAtPricePaise / 100) : '');
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
      <div className="py-12 text-center text-xs font-bold text-course-navySubtle">
        Loading course information...
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-black">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/courses"
            className="p-1.5 border border-black hover:bg-neutral-100 min-h-[36px] min-w-[36px] inline-flex items-center justify-center transition-colors"
            aria-label="Back to courses list"
          >
            <ArrowLeft className="w-4 h-4 text-course-darkBlue" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-course-darkBlue uppercase tracking-tight">
              Edit Course Details
            </h1>
            <p className="text-xs text-course-navySubtle mt-0.5">
              Editing: {course?.title}
            </p>
          </div>
        </div>

        <Link href={`/admin/courses/${courseId}/curriculum`}>
          <Button variant="outline" size="sm" className="text-xs font-bold uppercase tracking-wider py-1.5">
            <ListOrdered className="w-3.5 h-3.5 mr-1" />
            Curriculum Editor
          </Button>
        </Link>
      </div>

      {errorMessage && (
        <div className="p-4 border border-black bg-rose-50 text-rose-950 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
          <span className="font-bold">{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Thumbnail Upload Card */}
        <Card variant="default" padding="lg" className="border border-black space-y-4">
          <div className="border-b border-black pb-2">
            <h2 className="text-sm font-black text-course-darkBlue uppercase tracking-wider">
              Course Card Thumbnail
            </h2>
            <p className="text-xs text-course-navySubtle mt-0.5">
              Recommended: 1280x720 aspect ratio (16:9), max 5 MB JPG/PNG/WebP
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-48 h-28 border border-black bg-neutral-100 flex items-center justify-center overflow-hidden shrink-0">
              {thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumbnailUrl}
                  alt="Course Thumbnail Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-3 text-course-navySubtle">
                  <ImageIcon className="w-8 h-8 mx-auto opacity-50 mb-1" />
                  <span className="text-[10px] font-bold">No Image Uploaded</span>
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs font-bold uppercase tracking-wider"
                  isLoading={thumbnailUploading}
                  onClick={(e) => {
                    const input = e.currentTarget.parentElement?.querySelector('input');
                    input?.click();
                  }}
                >
                  <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
                  {thumbnailUrl ? 'Change Thumbnail' : 'Upload Image'}
                </Button>
              </label>
              <p className="text-[11px] text-course-navySubtle">
                Note: Thumbnail images are stored locally and will be migrated to persistent object storage in production.
              </p>
            </div>
          </div>
        </Card>

        {/* General Info */}
        <Card variant="default" padding="lg" className="border border-black space-y-5">
          <div className="border-b border-black pb-2">
            <h2 className="text-sm font-black text-course-darkBlue uppercase tracking-wider">
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
            <label className="block text-xs font-black uppercase tracking-wider text-course-darkBlue">
              Description &amp; Syllabus Overview
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 border border-black bg-course-white text-xs text-course-darkBlue focus:outline-none focus:ring-2 focus:ring-course-orange"
            />
          </div>
        </Card>

        {/* Pricing */}
        <Card variant="default" padding="lg" className="border border-black space-y-5">
          <div className="border-b border-black pb-2">
            <h2 className="text-sm font-black text-course-darkBlue uppercase tracking-wider">
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
        </Card>

        {/* Validity */}
        <Card variant="default" padding="lg" className="border border-black space-y-5">
          <div className="border-b border-black pb-2">
            <h2 className="text-sm font-black text-course-darkBlue uppercase tracking-wider">
              Access Duration &amp; Renewals
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <label
              className={`flex-1 p-3 border border-black cursor-pointer text-xs font-bold ${
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
            </label>

            <label
              className={`flex-1 p-3 border border-black cursor-pointer text-xs font-bold ${
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
            </label>
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

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-black">
          <Link href="/admin/courses">
            <Button type="button" variant="outline" className="text-xs font-bold uppercase tracking-wider py-2.5">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSaving}
            className="text-xs font-black uppercase tracking-wider py-2.5 px-6"
          >
            <Save className="w-4 h-4 mr-1.5" />
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
