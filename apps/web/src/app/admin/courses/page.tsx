'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api-client';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
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
          `"${modalAction.course.title}" is now visible in the student store.`,
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-black">
        <div>
          <h1 className="text-2xl font-black text-course-darkBlue uppercase tracking-tight">
            Course Management
          </h1>
          <p className="text-xs text-course-navySubtle mt-0.5">
            Create and edit course packages, pricing, curriculum structure, and video lessons
          </p>
        </div>

        <Link href="/admin/courses/new">
          <Button
            variant="primary"
            size="sm"
            className="text-xs font-black uppercase tracking-wider py-2.5"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Create New Course
          </Button>
        </Link>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 border border-black bg-rose-50 text-rose-950 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchCourses} className="text-xs">
            Retry
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && courses.length === 0 && !errorMessage && (
        <Card
          variant="default"
          padding="lg"
          className="border-2 border-dashed border-black text-center py-12 space-y-4"
        >
          <div className="w-12 h-12 bg-neutral-100 text-course-darkBlue border border-black flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="max-w-sm mx-auto space-y-1">
            <h2 className="text-base font-black text-course-darkBlue">No Courses in Catalog</h2>
            <p className="text-xs text-course-navySubtle">
              Get started by creating your first hydraulics course. You will be able to add
              curriculum sections and upload videos afterwards.
            </p>
          </div>
          <Link href="/admin/courses/new">
            <Button
              variant="primary"
              size="sm"
              className="text-xs font-bold uppercase tracking-wider"
            >
              <Plus className="w-4 h-4 mr-1" />
              Create Your First Course
            </Button>
          </Link>
        </Card>
      )}

      {/* Course List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {courses.map((course) => (
          <Card
            key={course.id}
            data-course-card={course.title}
            variant="default"
            padding="md"
            className="border border-black flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              {/* Header with Status Badges */}
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 border border-black text-[10px] font-black uppercase tracking-wider ${
                        course.status === 'PUBLISHED'
                          ? 'bg-emerald-100 text-emerald-950'
                          : course.status === 'DRAFT'
                            ? 'bg-amber-100 text-amber-950'
                            : 'bg-neutral-200 text-neutral-800'
                      }`}
                    >
                      {course.status}
                    </span>
                    <span className="text-[11px] font-mono text-course-navySubtle">
                      /{course.slug}
                    </span>
                  </div>
                  <h2 className="text-base font-black text-course-darkBlue leading-snug">
                    {course.title}
                  </h2>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-base font-black text-course-darkBlue">
                    {formatPrice(course.pricePaise)}
                  </div>
                  {course.compareAtPricePaise && (
                    <div className="text-[11px] font-mono text-course-navySubtle line-through">
                      {formatPrice(course.compareAtPricePaise)}
                    </div>
                  )}
                </div>
              </div>

              {/* Missing Video Warning Card */}
              {course.hasMissingVideosWarning && (
                <div className="p-2.5 border border-black bg-amber-50 text-amber-950 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span className="font-bold">
                    Warning: Course is PUBLISHED but {course.missingVideosCount} lesson(s) lack a
                    ready video!
                  </span>
                </div>
              )}

              {/* Course Meta Info */}
              <p className="text-xs text-course-navyMuted line-clamp-2">{course.description}</p>

              <div className="flex flex-wrap items-center gap-3 text-[11px] text-course-navySubtle pt-1 border-t border-neutral-200 font-medium">
                <span>{course._count?.sections || 0} Sections</span>
                <span>•</span>
                <span>{course._count?.lessons || 0} Lessons</span>
                <span>•</span>
                <span>{course._count?.orders || 0} Enrolled Students</span>
                <span>•</span>
                <span>
                  {course.validityDays ? `${course.validityDays} Days Access` : 'Lifetime Access'}
                </span>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="pt-3 border-t border-black flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Link href={`/admin/courses/${course.id}/curriculum`}>
                  <Button
                    variant="primary"
                    size="sm"
                    className="text-xs font-bold uppercase tracking-wider py-1.5 px-3"
                  >
                    <ListOrdered className="w-3.5 h-3.5 mr-1" />
                    Curriculum ({course._count?.lessons || 0})
                  </Button>
                </Link>

                <Link href={`/admin/courses/${course.id}/edit`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs font-bold uppercase tracking-wider py-1.5 px-3"
                  >
                    <Edit className="w-3.5 h-3.5 mr-1" />
                    Edit
                  </Button>
                </Link>
              </div>

              <div className="flex items-center gap-2">
                {course.status === 'PUBLISHED' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setModalAction({ type: 'unpublish', course })}
                    className="text-xs font-bold uppercase tracking-wider py-1.5 px-2.5 text-amber-800 hover:bg-amber-50"
                  >
                    <EyeOff className="w-3.5 h-3.5 mr-1" />
                    Unpublish
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setModalAction({ type: 'publish', course })}
                    className="text-xs font-bold uppercase tracking-wider py-1.5 px-2.5 text-emerald-800 hover:bg-emerald-50"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    Publish
                  </Button>
                )}

                <button
                  type="button"
                  onClick={() => setModalAction({ type: 'delete', course })}
                  className="p-1.5 border border-black hover:bg-rose-50 text-rose-700 min-h-[32px] min-w-[32px] inline-flex items-center justify-center transition-colors"
                  aria-label="Archive course"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </Card>
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
