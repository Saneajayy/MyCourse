'use client';

import React from 'react';
import { siteConfig } from '../../config/site';
import { TiltCard } from '../ui/TiltCard';

export function InstructorSection() {
  return (
    <section
      id="instructor"
      className="relative w-full py-16 sm:py-20 md:py-24 pl-8 sm:pl-12 md:pl-16 lg:pl-20 xl:pl-24 pr-6 sm:pr-8 md:pr-12 lg:pr-16 font-reddit select-none bg-transparent scroll-mt-12 md:scroll-mt-16"
    >

      <div className="max-w-[1440px] w-full">
        {/* 2-Column Layout: Left Text Details, Right Pure Card Element */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 xl:gap-16 items-start lg:items-stretch">
          {/* Left Column: Heading, Instructor Name, Role & Bio */}
          <div className="lg:col-span-7 xl:col-span-7 flex flex-col items-start lg:justify-between h-full">
            {/* Top Container: Section Heading, Instructor Name & Current Industrial Role */}
            <div className="w-full">
              {/* Section Heading: Exact 2-line uppercase stacked with period (SAME SIZE) */}
              <h2 className="font-extrabold text-white uppercase leading-[0.88] tracking-[-0.02em] text-5xl sm:text-6xl md:text-7xl lg:text-[76px] xl:text-[84px] mb-6 sm:mb-8 md:mb-10 select-none">
                <span className="block">THE COURSE</span>
                <span className="block">INSTRUCTOR.</span>
              </h2>

              {/* Instructor Name & Current Industrial Role: Reduced Content Size */}
              <h3 className="text-white font-bold text-2xl sm:text-3xl md:text-[34px] lg:text-[38px] xl:text-[42px] tracking-tight leading-tight">
                MR. HIRA LAL
              </h3>
              <p className="text-white/85 font-medium text-sm sm:text-base md:text-[17px] lg:text-[19px] xl:text-[20px] mt-1.5 sm:mt-2 leading-snug">
                Associate Manager at TVS.
              </p>
            </div>

            {/* Comprehensive Instructor Bio: Reduced content size, ending line aligns with the card bottom */}
            <div className="space-y-3.5 sm:space-y-4 text-white font-normal text-sm sm:text-base md:text-[16px] lg:text-[16.5px] xl:text-[17.5px] leading-[1.6] sm:leading-[1.55] lg:leading-[1.5] tracking-[-0.005em] mt-7 sm:mt-9 lg:mt-0 max-w-[680px] lg:max-w-[720px] xl:max-w-[750px] text-justify [text-align-last:left] [text-justify:inter-word]">
              <p>
                HiraLal has worked in hydraulic engineering for over 22 years and has taught on
                YouTube for more than 7 years. He has spent most of his career inside real plants,
                working with pumps, valves, cylinders and power packs, and fixing the faults that
                stop production. Trusted by 70,000+ subscribers, he is known for explaining hard
                hydraulic ideas in simple words that anyone on the shop floor can follow.
              </p>
              <p>
                Every lesson in this course comes from his own hands-on work, not from textbooks.
                You will see real examples, real faults and real fixes, explained step by step. He
                shows you how to read circuit diagrams, choose the right pump and find the cause of
                a problem without guessing. [Lessons are in Hindi, so you can learn in the language
                you think in.] By the end, you will be able to use what you learn at your own plant
                the very next day.
              </p>
            </div>
          </div>

          {/* Right Column: Pure Card Element matching Outcomes Section: Reduced by 15% */}
          <div className="lg:col-span-5 xl:col-span-5 flex justify-center lg:justify-end items-start w-full">
            <TiltCard
              className="relative w-full max-w-[410px] sm:max-w-[475px] md:max-w-[530px] lg:max-w-[580px] xl:max-w-[630px] aspect-[390/418] min-h-[410px] sm:min-h-[475px] md:min-h-[530px] lg:min-h-[580px] xl:min-h-[630px] bg-white rounded-lg sm:rounded-xl select-none cursor-pointer overflow-hidden"
              maxTilt={6.5}
            >
              {/* Top-Right Corner Logos: YouTube & LinkedIn from public folder */}
              <div className="absolute top-4 right-4 sm:top-5 sm:right-5 z-20 flex items-center gap-3 sm:gap-4">
                <a
                  href={siteConfig.instructor.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="hover:opacity-75 transition-opacity cursor-pointer inline-flex items-center"
                  aria-label="Mr. Hira Lal on YouTube"
                  title="YouTube Channel"
                >
                  <img
                    src="/youtub.png"
                    alt="YouTube"
                    className="h-5 sm:h-[22px] lg:h-6 w-auto object-contain"
                  />
                </a>

                <a
                  href={siteConfig.instructor.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="hover:opacity-75 transition-opacity cursor-pointer inline-flex items-center"
                  aria-label="Mr. Hira Lal on LinkedIn"
                  title="LinkedIn Profile"
                >
                  <img
                    src="/linkedin.png"
                    alt="LinkedIn"
                    className="h-5 sm:h-[22px] lg:h-6 w-auto object-contain"
                  />
                </a>
              </div>

              <div className="w-full h-full" />
            </TiltCard>
          </div>
        </div>
      </div>
    </section>
  );
}
