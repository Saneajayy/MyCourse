'use client';

import React, { useState } from 'react';
import { Accordion, Badge, Button } from './ui';
import { PreviewPlayerModal } from './PreviewPlayerModal';
import { PlayCircle, Clock } from 'lucide-react';

interface LessonData {
  id: string;
  title: string;
  description: string | null;
  position: number;
  durationSeconds: number;
  isFreePreview: boolean;
  status: string;
}

interface SectionData {
  id: string;
  title: string;
  position: number;
  lessons: LessonData[];
}

interface CourseSyllabusSectionProps {
  courseSlug: string;
  sections: SectionData[];
}

export function CourseSyllabusSection({ courseSlug, sections }: CourseSyllabusSectionProps) {
  const [selectedPreview, setSelectedPreview] = useState<{
    lessonId: string;
    lessonTitle: string;
  } | null>(null);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs > 0 ? `${secs}s` : ''}`;
  };

  const accordionItems = sections.map((section) => {
    const totalSecs = section.lessons.reduce((acc, l) => acc + l.durationSeconds, 0);
    const hasFreePreview = section.lessons.some((l) => l.isFreePreview);

    return {
      id: section.id,
      title: section.title,
      subtitle: `${section.lessons.length} Lessons • ${formatDuration(totalSecs)}`,
      badge: hasFreePreview ? (
        <Badge variant="orangeSubtle">Free Preview Included</Badge>
      ) : (
        <Badge variant="default">Complete Module</Badge>
      ),
      content: (
        <div className="space-y-3">
          {section.lessons.map((lesson) => (
            <div
              key={lesson.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border border-black bg-course-white"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-course-darkBlue">{lesson.title}</span>
                  {lesson.isFreePreview && (
                    <Badge variant="orange" size="sm">
                      Free Preview
                    </Badge>
                  )}
                </div>
                {lesson.description && (
                  <p className="text-xs text-course-navySubtle mt-1 leading-relaxed">
                    {lesson.description}
                  </p>
                )}
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-course-navyMuted mt-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatDuration(lesson.durationSeconds)}</span>
                </div>
              </div>

              <div>
                {lesson.isFreePreview ? (
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() =>
                      setSelectedPreview({
                        lessonId: lesson.id,
                        lessonTitle: lesson.title,
                      })
                    }
                  >
                    <PlayCircle className="w-4 h-4 mr-1.5" />
                    Watch Preview
                  </Button>
                ) : (
                  <span className="text-xs font-bold uppercase tracking-wider text-course-navyMuted py-2 px-3 block text-center sm:text-right">
                    Paid Access
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ),
    };
  });

  return (
    <>
      <Accordion items={accordionItems} defaultOpenIds={sections.slice(0, 1).map((s) => s.id)} />

      {selectedPreview && (
        <PreviewPlayerModal
          isOpen={!!selectedPreview}
          onClose={() => setSelectedPreview(null)}
          courseSlug={courseSlug}
          lessonId={selectedPreview.lessonId}
          lessonTitle={selectedPreview.lessonTitle}
        />
      )}
    </>
  );
}
