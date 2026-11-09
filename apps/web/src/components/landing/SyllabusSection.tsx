'use client';

import React from 'react';
import { ClaudeIcon } from '../ui/ClaudeIcon';

interface Lesson {
  id: string;
  title: string;
  durationSeconds?: number;
  isFreePreview?: boolean;
}

interface Section {
  id: string;
  title: string;
  lessons: Lesson[];
}

interface SyllabusSectionProps {
  courseSlug?: string;
  sections?: Section[];
}

export function SyllabusSection({
  courseSlug: _courseSlug = 'hydraulic-engineering-mastery',
  sections,
}: SyllabusSectionProps) {
  // Fallback curriculum matching the exact Figma design
  const defaultSections: Section[] = [
    {
      id: 'sec-1',
      title: 'Module 1 - Introduction to Hydraulics',
      lessons: [
        {
          id: '01a13c1f-b379-7851-9c08-3d938832bd39',
          title: 'How hydraulic systems work',
          durationSeconds: 720,
          isFreePreview: true,
        },
        {
          id: '01a13c1f-b379-7851-9c08-3d938832bd40',
          title: 'Pressure, flow and power in simple terms',
          durationSeconds: 980,
          isFreePreview: false,
        },
        {
          id: '01a13c1f-b379-7851-9c08-3d938832bd41',
          title: 'Main parts of a hydraulic circuit',
          durationSeconds: 840,
          isFreePreview: false,
        },
        {
          id: '01a13c1f-b379-7851-9c08-3d938832bd42',
          title: 'Hydraulic oil and filters',
          durationSeconds: 910,
          isFreePreview: false,
        },
      ],
    },
    {
      id: 'sec-2',
      title: 'Module 2 - Pumps, Valves and Circuits',
      lessons: [
        {
          id: '01a13c1f-b379-7851-9c08-3d938832bd43',
          title: 'Choosing the right pump',
          durationSeconds: 1120,
          isFreePreview: false,
        },
        {
          id: '01a13c1f-b379-7851-9c08-3d938832bd44',
          title: 'Directional and pressure control valves',
          durationSeconds: 1250,
          isFreePreview: false,
        },
        {
          id: '01a13c1f-b379-7851-9c08-3d938832bd45',
          title: 'Proportional valves explained',
          durationSeconds: 1340,
          isFreePreview: false,
        },
        {
          id: '01a13c1f-b379-7851-9c08-3d938832bd46',
          title: 'Reading hydraulic schematics',
          durationSeconds: 1480,
          isFreePreview: false,
        },
      ],
    },
    {
      id: 'sec-3',
      title: 'Module 3 - Troubleshooting and Maintenance',
      lessons: [
        {
          id: '01a13c1f-b379-7851-9c08-3d938832bd47',
          title: 'Common hydraulic problems and their causes',
          durationSeconds: 1190,
          isFreePreview: false,
        },
        {
          id: '01a13c1f-b379-7851-9c08-3d938832bd48',
          title: 'Step-by-step fault finding',
          durationSeconds: 1310,
          isFreePreview: false,
        },
        {
          id: '01a13c1f-b379-7851-9c08-3d938832bd49',
          title: 'Preventive maintenance checklist',
          durationSeconds: 880,
          isFreePreview: false,
        },
        {
          id: '01a13c1f-b379-7851-9c08-3d938832bd50',
          title: 'Real plant case studies',
          durationSeconds: 1420,
          isFreePreview: false,
        },
      ],
    },
  ];

  const displaySections = sections && sections.length > 0 ? sections : defaultSections;

  // Dynamic formatting helper: ensures "Module X - Title" format
  const formatModuleTitle = (rawTitle: string, index: number): string => {
    const stripped = rawTitle.replace(/^Module\s*\d+\s*[:-]?\s*/i, '').trim();
    return `Module ${index + 1} - ${stripped || rawTitle}`;
  };

  return (
    <section
      id="syllabus"
      className="relative w-full py-16 sm:py-20 md:py-24 pl-8 sm:pl-12 md:pl-16 lg:pl-20 xl:pl-24 pr-6 sm:pr-8 md:pr-12 lg:pr-16 font-reddit select-none scroll-mt-12 md:scroll-mt-16"
    >
      <div className="max-w-4xl flex flex-col items-start">
        {/* Section Heading: Exact 2-line uppercase stacked with period */}
        <h2 className="font-extrabold text-white uppercase leading-[0.88] tracking-[-0.02em] text-5xl sm:text-6xl md:text-7xl lg:text-[76px] xl:text-[84px] mb-12 sm:mb-14 md:mb-16 select-none">
          <span className="block">OVERVIEW OF</span>
          <span className="block">THE COURSE.</span>
        </h2>

        {/* Dynamic Modules List */}
        <div className="w-full space-y-10 sm:space-y-14 md:space-y-16">
          {displaySections.map((section, sIdx) => {
            const lessons = section.lessons || [];
            const displayTitle = formatModuleTitle(section.title, sIdx);

            return (
              <div key={section.id} className="flex flex-col items-start">
                {/* Module Header Row: Mobile original size, sm+ enlarged */}
                <div className="flex items-center gap-3.5 sm:gap-4.5 md:gap-5">
                  {/* Claude-Like Sign Bullet Point */}
                  <div className="w-[19px] h-[19px] sm:w-[26px] sm:h-[26px] md:w-[28px] md:h-[28px] flex items-center justify-center shrink-0 text-white">
                    <ClaudeIcon className="w-full h-full" />
                  </div>

                  {/* Module Title: Mobile original (21px), sm+ enlarged (28px-34px) */}
                  <h3 className="text-white font-semibold text-[21px] sm:text-[28px] md:text-[31px] lg:text-[34px] tracking-[-0.01em] leading-tight">
                    {displayTitle}
                  </h3>
                </div>

                {/* Lessons Sub-Tree: Vertical connector aligned under 'M' of Module */}
                {lessons.length > 0 && (
                  <div className="mt-2 sm:mt-3 flex flex-col pl-[34px] sm:pl-[44px] md:pl-[48px] w-full">
                    {lessons.map((lesson, lIdx) => {
                      const isLast = lIdx === lessons.length - 1;

                      return (
                        <div
                          key={lesson.id}
                          className="relative flex items-center min-h-[34px] sm:min-h-[45px] md:min-h-[48px]"
                        >
                          {/* Tree Branch Connector: Mobile original, sm+ enlarged */}
                          <div className="relative w-6 sm:w-8 h-[34px] sm:h-[45px] md:h-[48px] shrink-0 self-stretch flex items-center">
                            {!isLast ? (
                              <>
                                {/* Mobile continuous vertical stem */}
                                <div className="sm:hidden absolute left-[1px] top-0 bottom-0 w-[1.5px] bg-white pointer-events-none" />
                                {/* Desktop continuous vertical stem */}
                                <div className="hidden sm:block absolute left-[1.5px] top-0 bottom-0 w-[1.8px] bg-white pointer-events-none" />

                                {/* Mobile branch arc */}
                                <svg
                                  className="sm:hidden absolute left-0 top-0 w-6 h-[34px] pointer-events-none"
                                  viewBox="0 0 24 36"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M 1.5 10 Q 1.5 18 9.5 18 L 22 18"
                                    stroke="white"
                                    strokeWidth="1.5"
                                    fill="none"
                                  />
                                </svg>

                                {/* Desktop branch arc */}
                                <svg
                                  className="hidden sm:block absolute left-0 top-0 w-7 sm:w-8 h-[45px] md:h-[48px] pointer-events-none"
                                  viewBox="0 0 28 46"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M 1.5 12 Q 1.5 23 10 23 L 26 23"
                                    stroke="white"
                                    strokeWidth="1.8"
                                    fill="none"
                                  />
                                </svg>
                              </>
                            ) : (
                              <>
                                {/* Mobile last item arc */}
                                <svg
                                  className="sm:hidden absolute left-0 top-0 w-6 h-[34px] pointer-events-none"
                                  viewBox="0 0 24 36"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M 1.5 0 L 1.5 10 Q 1.5 18 9.5 18 L 22 18"
                                    stroke="white"
                                    strokeWidth="1.5"
                                    fill="none"
                                  />
                                </svg>

                                {/* Desktop last item arc */}
                                <svg
                                  className="hidden sm:block absolute left-0 top-0 w-7 sm:w-8 h-[45px] md:h-[48px] pointer-events-none"
                                  viewBox="0 0 28 46"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M 1.5 0 L 1.5 12 Q 1.5 23 10 23 L 26 23"
                                    stroke="white"
                                    strokeWidth="1.8"
                                    fill="none"
                                  />
                                </svg>
                              </>
                            )}
                          </div>

                          {/* Lesson Title: Mobile original (17px), sm+ enlarged (22px-25px) */}
                          <span className="text-white font-normal text-[17px] sm:text-[22px] md:text-[24px] lg:text-[25px] tracking-[-0.005em] leading-snug">
                            {lesson.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
