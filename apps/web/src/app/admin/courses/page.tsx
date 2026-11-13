'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api-client';
import { useToast } from '../../../components/ui/Toast';
import { ConfirmModal } from '../../../components/admin/ConfirmModal';
import {
  BookOpen,
  Plus,
  Edit,
  ListOrdered,
  Eye,
  EyeOff,
  Trash2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

interface ProductItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  pricePaise: number;
  compareAtPricePaise: number | null;
  currency: string;
  validityDays: number | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  missingVideosCount?: number;
  hasMissingVideosWarning?: boolean;
  _count?: {
    sections: number;
    lessons: number;
    orders: number;
  };
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<ProductItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Confirmation modal state
  const [modalAction, setModalAction] = useState<{
    type: 'publish' | 'unpublish' | 'delete';
    course: ProductItem;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const { success: toastSuccess, error: toastError } = useToast();

  const fetchCourses = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await apiClient<ProductItem[]>('/admin/products');
      setCourses(data);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to load courses. Please refresh.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleExecuteModalAction = async () => {
    if (!modalAction) return;
    setActionLoading(true);

    try {
      if (modalAction.type === 'publish') {
        await apiClient(`/admin/products/${modalAction.course.id}/publish`, { method: 'POST' });
        toastSuccess(
          'Course Published',
          `"${modalAction.course.title}" is now live on the public course catalog.`,
        );
      } else if (modalAction.type === 'unpublish') {
        await apiClient(`/admin/products/${modalAction.course.id}/unpublish`, { method: 'POST' });
        toastSuccess(
          'Course Unpublished',
          `"${modalAction.course.title}" is reverted to draft status.`,
        );
      } else if (modalAction.type === 'delete') {
        await apiClient(`/admin/products/${modalAction.course.id}`, { method: 'DELETE' });
        toastSuccess('Course Archived', `"${modalAction.course.title}" has been archived.`);
      }

      setModalAction(null);
      await fetchCourses();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      toastError('Operation Failed', msg);
    } finally {
      setActionLoading(false);
    }
  };

  const formatPrice = (paise: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(paise / 100);
  };

  return (
    <div className="space-y-6 font-reddit">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-neutral-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-neutral-950 uppercase">
              Course Management
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wider bg-neutral-100 text-neutral-600 border border-neutral-200">
              {courses.length} {courses.length === 1 ? 'Course' : 'Courses'}
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Curate course packages, pricing tiers, curriculum hierarchy, and video assets
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchCourses}
            title="Refresh courses"
            className="p-2 border border-neutral-200/90 hover:border-neutral-900 text-neutral-600 hover:text-neutral-950 bg-white hover:bg-neutral-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/admin/courses/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-neutral-900 text-white hover:bg-black text-xs font-semibold tracking-wide transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Course</span>
          </Link>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-3.5 border border-rose-200 bg-rose-50 text-rose-950 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={fetchCourses}
            className="px-2.5 py-1 text-xs font-semibold border border-rose-300 bg-white text-rose-900 hover:bg-rose-50"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && courses.length === 0 && !errorMessage && (
        <div className="border border-dashed border-neutral-300 bg-white text-center py-16 px-6 space-y-4">
          <div className="w-11 h-11 border border-neutral-200 bg-neutral-50 text-neutral-700 flex items-center justify-center mx-auto">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="max-w-sm mx-auto space-y-1">
            <h2 className="text-sm font-bold text-neutral-950 uppercase tracking-wider">
              No Courses in Catalog
            </h2>
            <p className="text-xs text-neutral-500">
              Get started by creating your first hydraulics course. You will be able to structure
              sections and upload high-bitrate video lessons next.
            </p>
          </div>
          <Link
            href="/admin/courses/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 text-white hover:bg-black text-xs font-semibold tracking-wide transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Your First Course
          </Link>
        </div>
      )}

      {/* Course List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {courses.map((course) => (
          <div
            key={course.id}
            data-course-card={course.title}
            className="border border-neutral-200/80 bg-white p-5 hover:border-neutral-300 transition-colors shadow-xs flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              {/* Header with Status Badges */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 border text-[10px] font-semibold tracking-wide uppercase ${
                        course.status === 'PUBLISHED'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : course.status === 'DRAFT'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-neutral-100 text-neutral-700 border-neutral-200'
                      }`}
                    >
                      {course.status}
                    </span>
                    <span className="text-[11px] font-mono text-neutral-400">/{course.slug}</span>
                  </div>
                  <h2 className="text-sm font-bold text-neutral-950 leading-snug">
                    {course.title}
                  </h2>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-base font-bold font-mono text-neutral-950">
                    {formatPrice(course.pricePaise)}
                  </div>
                  {course.compareAtPricePaise && (
                    <div className="text-[11px] font-mono text-neutral-400 line-through">
                      {formatPrice(course.compareAtPricePaise)}
                    </div>
                  )}
                </div>
              </div>

              {/* Missing Video Warning Card */}
              {course.hasMissingVideosWarning && (
                <div className="p-2.5 border border-amber-200 bg-amber-50/70 text-amber-950 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="font-medium text-[11px]">
                    Warning: Course is live but {course.missingVideosCount} lesson(s) lack ready
                    video streams.
                  </span>
                </div>
              )}

              {/* Course Meta Info */}
              <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                {course.description}
              </p>

              <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-500 pt-2 border-t border-neutral-100 font-mono">
                <span>{course._count?.sections || 0} Sections</span>
                <span className="text-neutral-300">•</span>
                <span>{course._count?.lessons || 0} Lessons</span>
                <span className="text-neutral-300">•</span>
                <span>{course._count?.orders || 0} Enrolled</span>
                <span className="text-neutral-300">•</span>
                <span>{course.validityDays ? `${course.validityDays}d Access` : 'Lifetime'}</span>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="pt-3 border-t border-neutral-200/80 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/courses/${course.id}/curriculum`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 text-white hover:bg-black text-xs font-semibold tracking-wide transition-colors"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                  <span>Curriculum ({course._count?.lessons || 0})</span>
                </Link>

                <Link
                  href={`/admin/courses/${course.id}/edit`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-neutral-300 hover:border-neutral-900 text-neutral-800 hover:bg-neutral-50 text-xs font-semibold tracking-wide transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </Link>
              </div>

              <div className="flex items-center gap-1.5">
                {course.status === 'PUBLISHED' ? (
                  <button
                    type="button"
                    onClick={() => setModalAction({ type: 'unpublish', course })}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-amber-300 text-amber-900 hover:bg-amber-50 text-xs font-semibold tracking-wide transition-colors"
                  >
                    <EyeOff className="w-3.5 h-3.5 text-amber-700" />
                    <span>Unpublish</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setModalAction({ type: 'publish', course })}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-emerald-300 text-emerald-900 hover:bg-emerald-50 text-xs font-semibold tracking-wide transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Publish</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setModalAction({ type: 'delete', course })}
                  className="p-1.5 border border-neutral-200 hover:border-rose-300 hover:bg-rose-50 text-neutral-400 hover:text-rose-600 min-h-[32px] min-w-[32px] inline-flex items-center justify-center transition-colors"
                  aria-label="Archive course"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Confirmation Modal */}
      {modalAction && (
        <ConfirmModal
          isOpen={true}
          title={
            modalAction.type === 'publish'
              ? 'Publish Course to Public Store'
              : modalAction.type === 'unpublish'
                ? 'Unpublish Course (Make Private)'
                : 'Archive Course Package'
          }
          description={
            modalAction.type === 'publish'
              ? `Publishing "${modalAction.course.title}" will make it immediately visible to students on your public catalog and allow new purchases.`
              : modalAction.type === 'unpublish'
                ? `Unpublishing "${modalAction.course.title}" will remove it from the public store. Existing enrolled students will continue to retain their access.`
                : `Archiving "${modalAction.course.title}" will hide it from the course catalog. Existing student access records will not be deleted.`
          }
          confirmText={
            modalAction.type === 'publish'
              ? 'Publish Course'
              : modalAction.type === 'unpublish'
                ? 'Unpublish Course'
                : 'Archive Course'
          }
          isDestructive={modalAction.type === 'delete' || modalAction.type === 'unpublish'}
          isLoading={actionLoading}
          onConfirm={handleExecuteModalAction}
          onClose={() => setModalAction(null)}
        />
      )}
    </div>
  );
}
