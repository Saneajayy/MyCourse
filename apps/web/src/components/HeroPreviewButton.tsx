'use client';

import React, { useState } from 'react';
import { PlayCircle } from 'lucide-react';
import { PreviewPlayerModal } from './PreviewPlayerModal';

interface HeroPreviewButtonProps {
  courseSlug: string;
  previewLessonId: string;
  previewLessonTitle: string;
}

export function HeroPreviewButton({
  courseSlug,
  previewLessonId,
  previewLessonTitle,
}: HeroPreviewButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="btn-outline text-xs md:text-sm uppercase tracking-wide flex items-center gap-2 cursor-pointer"
      >
        <PlayCircle className="w-4 h-4 text-course-orange" />
        Watch Free Preview
      </button>

      {isOpen && (
        <PreviewPlayerModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          courseSlug={courseSlug}
          lessonId={previewLessonId}
          lessonTitle={previewLessonTitle}
        />
      )}
    </>
  );
}
