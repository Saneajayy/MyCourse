'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../../../lib/api-client';
import { Input } from '../../../../../components/ui/Input';
import { useToast } from '../../../../../components/ui/Toast';
import { ConfirmModal } from '../../../../../components/admin/ConfirmModal';
import { TusVideoUpload } from '../../../../../components/admin/TusVideoUpload';
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Video,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Clock,
  X,
  Settings,
} from 'lucide-react';

interface LessonItem {
  id: string;
  sectionId: string;
  title: string;
  description: string | null;
  position: number;
  videoProviderId: string | null;
  durationSeconds: number;
  isFreePreview: boolean;
  status: 'PROCESSING' | 'READY' | 'FAILED';
}

interface SectionItem {
  id: string;
  productId: string;
  title: string;
  position: number;
  lessons: LessonItem[];
}

interface ProductWithCurriculum {
  id: string;
  slug: string;
  title: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  sections: SectionItem[];
  missingVideosCount?: number;
  hasMissingVideosWarning?: boolean;
}

export default function CurriculumEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const courseId = resolvedParams.id;

  const { success: toastSuccess, error: toastError } = useToast();

  const [course, setCourse] = useState<ProductWithCurriculum | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Section Modal state (create / edit)
  const [sectionModal, setSectionModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    sectionId?: string;
    title: string;
  }>({ isOpen: false, mode: 'create', title: '' });

  // Lesson Modal state (create / edit info)
  const [lessonModal, setLessonModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    sectionId: string;
    lessonId?: string;
    title: string;
    description: string;
    isFreePreview: boolean;
  }>({
    isOpen: false,
    mode: 'create',
    sectionId: '',
    title: '',
    description: '',
    isFreePreview: false,
  });

  // Video Upload Modal state
  const [videoModal, setVideoModal] = useState<{
    isOpen: boolean;
    lesson: LessonItem | null;
  }>({ isOpen: false, lesson: null });

  // Delete Confirmation Modal state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'section' | 'lesson';
    id: string;
    name: string;
    hasVideo: boolean;
    confirmDeleteVideo: boolean;
    force: boolean;
  }>({
    isOpen: false,
    type: 'lesson',
    id: '',
    name: '',
    hasVideo: false,
    confirmDeleteVideo: false,
    force: false,
  });

  const [isActionLoading, setIsActionLoading] = useState(false);

  // Drag-and-drop state
  const [draggedLessonId, setDraggedLessonId] = useState<string | null>(null);

  const fetchCurriculum = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await apiClient<ProductWithCurriculum>(`/admin/products/${courseId}`);
      setCourse(data);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to load course curriculum. Please refresh.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchCurriculum();
  }, [fetchCurriculum]);

  const formatDuration = (seconds: number): string => {
    if (!seconds) return '0 min';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  // Section CRUD
  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionModal.title.trim()) return;

    setIsActionLoading(true);
    try {
      if (sectionModal.mode === 'create') {
        await apiClient(`/admin/products/${courseId}/sections`, {
          method: 'POST',
          body: JSON.stringify({ title: sectionModal.title.trim() }),
        });
        toastSuccess('Section Created', `"${sectionModal.title}" added to curriculum.`);
      } else if (sectionModal.mode === 'edit' && sectionModal.sectionId) {
        await apiClient(`/admin/sections/${sectionModal.sectionId}`, {
          method: 'PATCH',
          body: JSON.stringify({ title: sectionModal.title.trim() }),
        });
        toastSuccess('Section Updated', 'Section title updated.');
      }
      setSectionModal({ isOpen: false, mode: 'create', title: '' });
      await fetchCurriculum();
    } catch (err: unknown) {
      toastError('Section Action Failed', err instanceof Error ? err.message : 'Error');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Lesson CRUD
  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonModal.title.trim() || !lessonModal.sectionId) return;

    setIsActionLoading(true);
    try {
      if (lessonModal.mode === 'create') {
        await apiClient(`/admin/sections/${lessonModal.sectionId}/lessons`, {
          method: 'POST',
          body: JSON.stringify({
            title: lessonModal.title.trim(),
            description: lessonModal.description.trim() || null,
            isFreePreview: lessonModal.isFreePreview,
            productId: courseId,
          }),
        });
        toastSuccess('Lesson Created', `Lesson "${lessonModal.title}" added.`);
      } else if (lessonModal.mode === 'edit' && lessonModal.lessonId) {
        await apiClient(`/admin/lessons/${lessonModal.lessonId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            title: lessonModal.title.trim(),
            description: lessonModal.description.trim() || null,
            isFreePreview: lessonModal.isFreePreview,
          }),
        });
        toastSuccess('Lesson Updated', 'Lesson details updated.');
      }
      setLessonModal({
        isOpen: false,
        mode: 'create',
        sectionId: '',
        title: '',
        description: '',
        isFreePreview: false,
      });
      await fetchCurriculum();
    } catch (err: unknown) {
      toastError('Lesson Action Failed', err instanceof Error ? err.message : 'Error');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Reorder Sections
  const handleMoveSection = async (index: number, direction: 'up' | 'down') => {
    if (!course) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= course.sections.length) return;

    const reordered = [...course.sections];
    const [moved] = reordered.splice(index, 1);
    if (!moved) return;
    reordered.splice(targetIndex, 0, moved);

    const orderedIds = reordered.map((s) => s.id);
    try {
      await apiClient(`/admin/products/${courseId}/sections/reorder`, {
        method: 'POST',
        body: JSON.stringify({ orderedIds }),
      });
      await fetchCurriculum();
    } catch (err: unknown) {
      toastError('Reorder Failed', err instanceof Error ? err.message : 'Error');
    }
  };

  // Reorder Lessons
  const handleMoveLesson = async (
    sectionId: string,
    lessonIndex: number,
    direction: 'up' | 'down',
  ) => {
    if (!course) return;
    const section = course.sections.find((s) => s.id === sectionId);
    if (!section) return;

    const targetIndex = direction === 'up' ? lessonIndex - 1 : lessonIndex + 1;
    if (targetIndex < 0 || targetIndex >= section.lessons.length) return;

    const reordered = [...section.lessons];
    const [moved] = reordered.splice(lessonIndex, 1);
    if (!moved) return;
    reordered.splice(targetIndex, 0, moved);

    const orderedIds = reordered.map((l) => l.id);
    try {
      await apiClient(`/admin/sections/${sectionId}/lessons/reorder`, {
        method: 'POST',
        body: JSON.stringify({ orderedIds }),
      });
      await fetchCurriculum();
    } catch (err: unknown) {
      toastError('Reorder Failed', err instanceof Error ? err.message : 'Error');
    }
  };

  // Drag and drop lesson reordering
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropLesson = async (targetSectionId: string, targetLessonId: string) => {
    if (!draggedLessonId || !course || draggedLessonId === targetLessonId) return;

    const section = course.sections.find((s) => s.id === targetSectionId);
    if (!section) return;

    const fromIndex = section.lessons.findIndex((l) => l.id === draggedLessonId);
    const toIndex = section.lessons.findIndex((l) => l.id === targetLessonId);
    if (fromIndex === -1 || toIndex === -1) return;

    const reordered = [...section.lessons];
    const [moved] = reordered.splice(fromIndex, 1);
    if (!moved) return;
    reordered.splice(toIndex, 0, moved);

    setDraggedLessonId(null);
    const orderedIds = reordered.map((l) => l.id);

    try {
      await apiClient(`/admin/sections/${targetSectionId}/lessons/reorder`, {
        method: 'POST',
        body: JSON.stringify({ orderedIds }),
      });
      await fetchCurriculum();
    } catch (err: unknown) {
      toastError('Reorder Failed', err instanceof Error ? err.message : 'Error');
    }
  };

  // 1-Click Free Preview Toggle
  const handleTogglePreview = async (lesson: LessonItem) => {
    try {
      await apiClient(`/admin/lessons/${lesson.id}/free-preview`, {
        method: 'POST',
        body: JSON.stringify({ isFreePreview: !lesson.isFreePreview }),
      });
      toastSuccess(
        lesson.isFreePreview ? 'Preview Disabled' : 'Preview Enabled',
        `"${lesson.title}" is ${lesson.isFreePreview ? 'now paid only' : 'now a free preview'}.`,
      );
      await fetchCurriculum();
    } catch (err: unknown) {
      toastError('Toggle Failed', err instanceof Error ? err.message : 'Error');
    }
  };

  // Delete Section / Lesson Confirmation Execution
  const handleExecuteDelete = async () => {
    setIsActionLoading(true);
    try {
      if (deleteConfirm.type === 'section') {
        const queryParams = new URLSearchParams();
        if (deleteConfirm.confirmDeleteVideo) queryParams.set('confirmDeleteVideo', 'true');
        if (deleteConfirm.force) queryParams.set('force', 'true');

        await apiClient(`/admin/sections/${deleteConfirm.id}?${queryParams.toString()}`, {
          method: 'DELETE',
        });
        toastSuccess('Section Deleted', `Section "${deleteConfirm.name}" removed.`);
      } else {
        const queryParams = new URLSearchParams();
        if (deleteConfirm.confirmDeleteVideo) queryParams.set('confirmDeleteVideo', 'true');
        if (deleteConfirm.force) queryParams.set('force', 'true');

        await apiClient(`/admin/lessons/${deleteConfirm.id}?${queryParams.toString()}`, {
          method: 'DELETE',
        });
        toastSuccess('Lesson Deleted', `Lesson "${deleteConfirm.name}" removed.`);
      }

      setDeleteConfirm({
        isOpen: false,
        type: 'lesson',
        id: '',
        name: '',
        hasVideo: false,
        confirmDeleteVideo: false,
        force: false,
      });
      await fetchCurriculum();
    } catch (err: unknown) {
      toastError('Delete Failed', err instanceof Error ? err.message : 'Error');
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-16 text-center text-xs font-mono text-neutral-500 font-reddit">
        Loading curriculum and video statuses...
      </div>
    );
  }

  return (
    <div className="space-y-6 font-reddit">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-neutral-200/80">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/courses"
            className="p-2 border border-neutral-200/90 hover:border-neutral-900 bg-white hover:bg-neutral-50 text-neutral-700 min-h-[36px] min-w-[36px] inline-flex items-center justify-center transition-colors"
            aria-label="Back to courses list"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 border text-[10px] font-semibold tracking-wide uppercase ${
                  course?.status === 'PUBLISHED'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                {course?.status}
              </span>
              <span className="text-xs font-mono text-neutral-400">/{course?.slug}</span>
            </div>
            <h1 className="text-lg font-bold text-neutral-950 mt-1">
              {course?.title}
              <span className="text-neutral-400 font-normal ml-2">— Curriculum Hierarchy</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setSectionModal({ isOpen: true, mode: 'create', title: '' })}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-neutral-900 text-white hover:bg-black text-xs font-semibold tracking-wide transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Section</span>
          </button>

          <Link
            href={`/admin/courses/${courseId}/edit`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-neutral-300 hover:border-neutral-900 text-neutral-800 hover:bg-neutral-50 text-xs font-semibold tracking-wide transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Course Settings</span>
          </Link>
        </div>
      </div>

      {/* Published Course Missing Video Alert */}
      {course?.hasMissingVideosWarning && (
        <div className="p-3.5 border border-amber-300 bg-amber-50/70 text-amber-950 text-xs space-y-1">
          <div className="flex items-center gap-2 font-semibold uppercase tracking-wider text-amber-900 text-[11px]">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Missing Video Warning</span>
          </div>
          <p className="text-xs text-amber-900 leading-relaxed">
            This course is marked <strong>PUBLISHED</strong>, but {course.missingVideosCount} lesson(s) lack a video stream or are still transcoding. Ensure all paid lessons have a ready video before launching promotions.
          </p>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-3.5 border border-rose-200 bg-rose-50 text-rose-950 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={fetchCurriculum}
            className="px-2.5 py-1 text-xs font-semibold border border-rose-300 bg-white text-rose-900 hover:bg-rose-50"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {course?.sections.length === 0 && !errorMessage && (
        <div className="border border-dashed border-neutral-300 bg-white text-center py-16 px-6 space-y-4">
          <div className="w-11 h-11 border border-neutral-200 bg-neutral-50 text-neutral-700 flex items-center justify-center mx-auto">
            <Plus className="w-5 h-5" />
          </div>
          <div className="max-w-sm mx-auto space-y-1">
            <h2 className="text-sm font-bold text-neutral-950 uppercase tracking-wider">
              No Curriculum Sections Yet
            </h2>
            <p className="text-xs text-neutral-500">
              Click &quot;Add Section&quot; to begin building modules (e.g. &quot;Module 1: Hydraulic Fluid Fundamentals&quot;).
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSectionModal({ isOpen: true, mode: 'create', title: '' })}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 text-white hover:bg-black text-xs font-semibold tracking-wide transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Create First Section
          </button>
        </div>
      )}

      {/* Sections and Lessons Hierarchy */}
      <div className="space-y-5">
        {course?.sections.map((section, sIndex) => (
          <div key={section.id} className="border border-neutral-200/80 bg-white shadow-xs overflow-hidden">
            {/* Section Header */}
            <div className="p-3.5 bg-neutral-50/80 border-b border-neutral-200/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 bg-neutral-900 text-white font-mono text-xs font-semibold flex items-center justify-center shrink-0">
                  {sIndex + 1}
                </span>
                <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-950">
                  {section.title}
                </h2>
                <span className="text-[11px] font-mono text-neutral-500">
                  ({section.lessons.length} {section.lessons.length === 1 ? 'lesson' : 'lessons'})
                </span>
              </div>

              {/* Section Controls */}
              <div className="flex items-center gap-1">
                {/* Up/Down buttons for mobile accessibility */}
                <button
                  type="button"
                  disabled={sIndex === 0}
                  onClick={() => handleMoveSection(sIndex, 'up')}
                  className="p-1 border border-neutral-200 hover:border-neutral-900 bg-white hover:bg-neutral-50 disabled:opacity-30 min-h-[30px] min-w-[30px] inline-flex items-center justify-center transition-colors"
                  aria-label="Move section up"
                  title="Move section up"
                >
                  <ChevronUp className="w-3.5 h-3.5 text-neutral-700" />
                </button>
                <button
                  type="button"
                  disabled={sIndex === course.sections.length - 1}
                  onClick={() => handleMoveSection(sIndex, 'down')}
                  className="p-1 border border-neutral-200 hover:border-neutral-900 bg-white hover:bg-neutral-50 disabled:opacity-30 min-h-[30px] min-w-[30px] inline-flex items-center justify-center transition-colors"
                  aria-label="Move section down"
                  title="Move section down"
                >
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-700" />
                </button>

                {/* Edit Section Title */}
                <button
                  type="button"
                  onClick={() =>
                    setSectionModal({
                      isOpen: true,
                      mode: 'edit',
                      sectionId: section.id,
                      title: section.title,
                    })
                  }
                  className="p-1 border border-neutral-200 hover:border-neutral-900 bg-white hover:bg-neutral-50 min-h-[30px] min-w-[30px] inline-flex items-center justify-center transition-colors ml-1"
                  aria-label="Rename section"
                  title="Rename section"
                >
                  <Edit className="w-3.5 h-3.5 text-neutral-700" />
                </button>

                {/* Delete Section */}
                <button
                  type="button"
                  onClick={() =>
                    setDeleteConfirm({
                      isOpen: true,
                      type: 'section',
                      id: section.id,
                      name: section.title,
                      hasVideo: section.lessons.some((l) => !!l.videoProviderId),
                      confirmDeleteVideo: false,
                      force: false,
                    })
                  }
                  className="p-1 border border-neutral-200 hover:border-rose-300 bg-white hover:bg-rose-50 text-neutral-500 hover:text-rose-600 min-h-[30px] min-w-[30px] inline-flex items-center justify-center transition-colors"
                  aria-label="Delete section"
                  title="Delete section"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Add Lesson Button */}
                <button
                  type="button"
                  onClick={() =>
                    setLessonModal({
                      isOpen: true,
                      mode: 'create',
                      sectionId: section.id,
                      title: '',
                      description: '',
                      isFreePreview: false,
                    })
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-neutral-900 text-white hover:bg-black text-xs font-semibold tracking-wide transition-colors ml-2"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Lesson</span>
                </button>
              </div>
            </div>

            {/* Lessons List in Section */}
            <div className="divide-y divide-neutral-200/80">
              {section.lessons.length === 0 ? (
                <div className="p-4 text-center text-xs text-neutral-400 italic">
                  No lessons in this section. Click &quot;Add Lesson&quot; above to create one.
                </div>
              ) : (
                section.lessons.map((lesson, lIndex) => (
                  <div
                    key={lesson.id}
                    data-lesson-id={lesson.id}
                    draggable
                    onDragStart={() => setDraggedLessonId(lesson.id)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDropLesson(section.id, lesson.id)}
                    className="p-3.5 bg-white hover:bg-neutral-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                  >
                    {/* Left: Drag Handle, Number, Title & Badges */}
                    <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                      {/* Drag Handle (Desktop) */}
                      <span
                        className="hidden sm:inline-flex text-neutral-300 hover:text-neutral-800 cursor-grab active:cursor-grabbing p-0.5"
                        title="Drag to reorder lesson"
                      >
                        <GripVertical className="w-4 h-4" />
                      </span>

                      {/* Lesson Number */}
                      <span className="text-xs font-mono font-semibold text-neutral-400 shrink-0">
                        {sIndex + 1}.{lIndex + 1}
                      </span>

                      {/* Title & Description preview */}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-neutral-900 truncate">
                            {lesson.title}
                          </span>

                          {/* Free Preview Badge */}
                          {lesson.isFreePreview ? (
                            <span className="px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 text-[10px] font-semibold uppercase tracking-wider text-emerald-800">
                              Free Preview
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-200 text-[10px] font-medium uppercase tracking-wider text-neutral-600">
                              Paid Only
                            </span>
                          )}

                          {/* Video Status Badge */}
                          {lesson.status === 'READY' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 text-[10px] font-medium text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Ready ({formatDuration(lesson.durationSeconds)})
                            </span>
                          )}
                          {lesson.status === 'PROCESSING' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 border border-amber-200 text-[10px] font-medium text-amber-800">
                              <Clock className="w-3 h-3 text-amber-600 animate-spin" />
                              Transcoding...
                            </span>
                          )}
                          {!lesson.videoProviderId && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-rose-50 border border-rose-200 text-[10px] font-medium text-rose-800">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              No Video
                            </span>
                          )}
                        </div>

                        {lesson.description && (
                          <p className="text-[11px] text-neutral-500 truncate max-w-md mt-0.5">
                            {lesson.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                      {/* Move Up/Down Buttons for Phone */}
                      <button
                        type="button"
                        disabled={lIndex === 0}
                        onClick={() => handleMoveLesson(section.id, lIndex, 'up')}
                        className="p-1 border border-neutral-200 hover:border-neutral-900 bg-white hover:bg-neutral-50 disabled:opacity-30 min-h-[30px] min-w-[30px] inline-flex items-center justify-center transition-colors"
                        aria-label="Move lesson up"
                        title="Move lesson up"
                      >
                        <ChevronUp className="w-3.5 h-3.5 text-neutral-700" />
                      </button>
                      <button
                        type="button"
                        disabled={lIndex === section.lessons.length - 1}
                        onClick={() => handleMoveLesson(section.id, lIndex, 'down')}
                        className="p-1 border border-neutral-200 hover:border-neutral-900 bg-white hover:bg-neutral-50 disabled:opacity-30 min-h-[30px] min-w-[30px] inline-flex items-center justify-center transition-colors"
                        aria-label="Move lesson down"
                        title="Move lesson down"
                      >
                        <ChevronDown className="w-3.5 h-3.5 text-neutral-700" />
                      </button>

                      {/* 1-Click Toggle Free Preview */}
                      <button
                        type="button"
                        onClick={() => handleTogglePreview(lesson)}
                        className={`px-2 py-1 border min-h-[30px] text-[10px] font-semibold uppercase tracking-wider inline-flex items-center gap-1 transition-colors ${
                          lesson.isFreePreview
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                            : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50'
                        }`}
                        title={
                          lesson.isFreePreview
                            ? 'Click to make Paid Only'
                            : 'Click to make Free Preview'
                        }
                      >
                        <Eye className="w-3 h-3" />
                        <span className="hidden md:inline">
                          {lesson.isFreePreview ? 'Preview: On' : 'Preview: Off'}
                        </span>
                      </button>

                      {/* Upload / Replace Video Button */}
                      <button
                        type="button"
                        onClick={() => setVideoModal({ isOpen: true, lesson })}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold tracking-wide transition-colors min-h-[30px] ${
                          lesson.videoProviderId
                            ? 'border border-neutral-300 hover:border-neutral-900 text-neutral-800 bg-white hover:bg-neutral-50'
                            : 'bg-neutral-900 text-white hover:bg-black'
                        }`}
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>{lesson.videoProviderId ? 'Manage Video' : 'Upload Video'}</span>
                      </button>

                      {/* Edit Info Button */}
                      <button
                        type="button"
                        onClick={() =>
                          setLessonModal({
                            isOpen: true,
                            mode: 'edit',
                            sectionId: section.id,
                            lessonId: lesson.id,
                            title: lesson.title,
                            description: lesson.description || '',
                            isFreePreview: lesson.isFreePreview,
                          })
                        }
                        className="p-1 border border-neutral-200 hover:border-neutral-900 bg-white hover:bg-neutral-50 min-h-[30px] min-w-[30px] inline-flex items-center justify-center transition-colors"
                        aria-label="Edit lesson info"
                        title="Edit lesson details"
                      >
                        <Edit className="w-3.5 h-3.5 text-neutral-700" />
                      </button>

                      {/* Delete Lesson Button */}
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteConfirm({
                            isOpen: true,
                            type: 'lesson',
                            id: lesson.id,
                            name: lesson.title,
                            hasVideo: !!lesson.videoProviderId,
                            confirmDeleteVideo: false,
                            force: false,
                          })
                        }
                        className="p-1 border border-neutral-200 hover:border-rose-300 bg-white hover:bg-rose-50 text-neutral-500 hover:text-rose-600 min-h-[30px] min-w-[30px] inline-flex items-center justify-center transition-colors"
                        aria-label="Delete lesson"
                        title="Delete lesson"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL 1: Create / Edit Section */}
      {sectionModal.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="section-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
        >
          <div className="w-full max-w-md bg-white border border-neutral-200/90 shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200/80">
              <h2
                id="section-modal-title"
                className="text-xs font-bold uppercase tracking-wider text-neutral-950"
              >
                {sectionModal.mode === 'create' ? 'Add New Section' : 'Rename Section'}
              </h2>
              <button
                type="button"
                onClick={() => setSectionModal({ isOpen: false, mode: 'create', title: '' })}
                className="p-1 border border-neutral-200 hover:border-neutral-900 text-neutral-500 hover:text-neutral-900 min-h-[32px] min-w-[32px] inline-flex items-center justify-center transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSection} className="space-y-4">
              <Input
                label="Section Title"
                type="text"
                required
                autoFocus
                placeholder="e.g. Module 2: Directional Control Valves & Circuit Design"
                value={sectionModal.title}
                onChange={(e) => setSectionModal({ ...sectionModal, title: e.target.value })}
                helperText="Groups related lessons together in the student syllabus."
              />

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-200/80">
                <button
                  type="button"
                  onClick={() => setSectionModal({ isOpen: false, mode: 'create', title: '' })}
                  className="px-4 py-2 border border-neutral-300 hover:border-neutral-900 text-neutral-700 hover:bg-neutral-50 text-xs font-semibold tracking-wide transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading}
                  className="px-5 py-2 bg-neutral-900 text-white hover:bg-black text-xs font-semibold tracking-wide transition-colors disabled:opacity-50"
                >
                  Save Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Create / Edit Lesson Info */}
      {lessonModal.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="lesson-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
        >
          <div className="w-full max-w-lg bg-white border border-neutral-200/90 shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200/80">
              <h2
                id="lesson-modal-title"
                className="text-xs font-bold uppercase tracking-wider text-neutral-950"
              >
                {lessonModal.mode === 'create' ? 'Add New Lesson' : 'Edit Lesson Information'}
              </h2>
              <button
                type="button"
                onClick={() =>
                  setLessonModal({
                    isOpen: false,
                    mode: 'create',
                    sectionId: '',
                    title: '',
                    description: '',
                    isFreePreview: false,
                  })
                }
                className="p-1 border border-neutral-200 hover:border-neutral-900 text-neutral-500 hover:text-neutral-900 min-h-[32px] min-w-[32px] inline-flex items-center justify-center transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLesson} className="space-y-4">
              <Input
                label="Lesson Title"
                type="text"
                required
                autoFocus
                placeholder="e.g. Spool Valve Metering & Flow Characteristics"
                value={lessonModal.title}
                onChange={(e) => setLessonModal({ ...lessonModal, title: e.target.value })}
              />

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
                  Lesson Description / Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={lessonModal.description}
                  onChange={(e) => setLessonModal({ ...lessonModal, description: e.target.value })}
                  placeholder="Summary of formulas, components, or schematics analyzed in this video."
                  className="w-full p-3 border border-neutral-300 bg-white text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 transition-colors"
                />
              </div>

              <div className="p-3.5 border border-neutral-200/80 bg-neutral-50">
                <label className="flex items-center gap-2.5 text-xs font-medium text-neutral-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lessonModal.isFreePreview}
                    onChange={(e) =>
                      setLessonModal({ ...lessonModal, isFreePreview: e.target.checked })
                    }
                    className="w-4 h-4 accent-neutral-900"
                  />
                  <span>Mark as Free Preview (Accessible without purchasing course)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-200/80">
                <button
                  type="button"
                  onClick={() =>
                    setLessonModal({
                      isOpen: false,
                      mode: 'create',
                      sectionId: '',
                      title: '',
                      description: '',
                      isFreePreview: false,
                    })
                  }
                  className="px-4 py-2 border border-neutral-300 hover:border-neutral-900 text-neutral-700 hover:bg-neutral-50 text-xs font-semibold tracking-wide transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading}
                  className="px-5 py-2 bg-neutral-900 text-white hover:bg-black text-xs font-semibold tracking-wide transition-colors disabled:opacity-50"
                >
                  Save Lesson
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Direct TUS Video Upload Modal */}
      {videoModal.isOpen && videoModal.lesson && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="video-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
        >
          <div className="w-full max-w-xl bg-white border border-neutral-200/90 shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200/80">
              <div>
                <h2
                  id="video-modal-title"
                  className="text-xs font-bold uppercase tracking-wider text-neutral-950"
                >
                  Direct Video Upload
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Lesson: {videoModal.lesson.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setVideoModal({ isOpen: false, lesson: null });
                  fetchCurriculum();
                }}
                className="p-1 border border-neutral-200 hover:border-neutral-900 text-neutral-500 hover:text-neutral-900 min-h-[32px] min-w-[32px] inline-flex items-center justify-center transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <TusVideoUpload
              lessonId={videoModal.lesson.id}
              lessonTitle={videoModal.lesson.title}
              initialVideoProviderId={videoModal.lesson.videoProviderId}
              initialStatus={videoModal.lesson.status}
              initialDurationSeconds={videoModal.lesson.durationSeconds}
              onUploadSuccess={() => {
                fetchCurriculum();
              }}
            />

            <div className="pt-3 border-t border-neutral-200/80 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setVideoModal({ isOpen: false, lesson: null });
                  fetchCurriculum();
                }}
                className="px-4 py-2 border border-neutral-300 hover:border-neutral-900 text-neutral-800 hover:bg-neutral-50 text-xs font-semibold tracking-wide transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Delete Safety Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <ConfirmModal
          isOpen={true}
          title={`Delete ${deleteConfirm.type === 'section' ? 'Section' : 'Lesson'}`}
          description={`Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone.`}
          confirmText={`Delete ${deleteConfirm.type === 'section' ? 'Section' : 'Lesson'}`}
          isDestructive={true}
          isLoading={isActionLoading}
          onConfirm={handleExecuteDelete}
          onClose={() =>
            setDeleteConfirm({
              isOpen: false,
              type: 'lesson',
              id: '',
              name: '',
              hasVideo: false,
              confirmDeleteVideo: false,
              force: false,
            })
          }
        >
          <div className="space-y-2.5 p-3.5 border border-rose-200 bg-rose-50 text-xs">
            {deleteConfirm.hasVideo && (
              <label className="flex items-start gap-2 cursor-pointer font-semibold text-rose-950">
                <input
                  type="checkbox"
                  checked={deleteConfirm.confirmDeleteVideo}
                  onChange={(e) =>
                    setDeleteConfirm({ ...deleteConfirm, confirmDeleteVideo: e.target.checked })
                  }
                  className="w-4 h-4 accent-rose-600 mt-0.5 shrink-0"
                />
                <span>
                  Confirm video deletion: Permanently delete the uploaded video from Bunny Stream CDN.
                </span>
              </label>
            )}

            <label className="flex items-start gap-2 cursor-pointer font-medium text-rose-900">
              <input
                type="checkbox"
                checked={deleteConfirm.force}
                onChange={(e) => setDeleteConfirm({ ...deleteConfirm, force: e.target.checked })}
                className="w-4 h-4 accent-rose-600 mt-0.5 shrink-0"
              />
              <span>
                Force delete even if enrolled students already have watch progress recorded for this item.
              </span>
            </label>
          </div>
        </ConfirmModal>
      )}
    </div>
  );
}
