'use client';

import React from 'react';
import { TiltCard } from '../ui/TiltCard';
import { ClaudeIcon } from '../ui/ClaudeIcon';

interface OutcomeItem {
  title: string;
  desc: string;
}

export function OutcomesSection() {
  const outcomes: OutcomeItem[] = [
    {
      title: 'Decode Hydraulic Circuits.',
      desc: 'Understand circuit diagrams and see where the oil flows at every step.',
    },
    {
      title: 'Select Pumps & Cylinders.',
      desc: 'Work out pump, cylinder and tank sizes using proven plant formulas.',
    },
    {
      title: 'Set Up Proportional Valves.',
      desc: 'Learn how these valves work and tune them on modern plant machines.',
    },
    {
      title: 'Diagnose Hydraulic Faults.',
      desc: 'Trace heating, noise and leakage to the real cause, step by step.',
    },
  ];

  return (
    <section
      id="outcomes"
      className="relative w-full py-16 sm:py-20 md:py-24 pl-8 sm:pl-12 md:pl-16 lg:pl-20 xl:pl-24 pr-6 sm:pr-8 md:pr-12 lg:pr-16 font-reddit select-none bg-transparent scroll-mt-12 md:scroll-mt-16"
    >
      <div className="max-w-6xl w-full flex flex-col items-start">
        {/* Section Heading: Exact 2-line uppercase stacked with period */}
        <h2 className="font-extrabold text-white uppercase leading-[0.88] tracking-[-0.02em] text-5xl sm:text-6xl md:text-7xl lg:text-[76px] xl:text-[84px] mb-10 sm:mb-12 md:mb-14 select-none">
          <span className="block">OUTCOMES OF</span>
          <span className="block">THE COURSE.</span>
        </h2>

        {/* 2x2 Outcomes Cards Grid: Enlarged */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-7 sm:gap-8 lg:gap-9 w-full">
          {outcomes.map((item) => (
            <TiltCard
              key={item.title}
              className="relative p-5 sm:p-8 md:p-9 lg:p-10 bg-white rounded-lg sm:rounded-xl select-none group cursor-pointer shadow-lg"
              maxTilt={6.5}
            >
              {/* Card Content (stays crisp, sharp and vector-rendered in #0033FF) */}
              <div className="relative z-10 flex items-start gap-3 sm:gap-4.5 md:gap-5">
                {/* Claude-Like Sign Bullet Point: Mobile original, sm+ enlarged */}
                <ClaudeIcon className="w-[19px] h-[19px] sm:w-[26px] sm:h-[26px] md:w-[28px] md:h-[28px] text-[#0033FF] shrink-0 mt-0.5 sm:mt-1" />

                {/* Typography: Mobile original (19px/15px), sm+ enlarged (24-27px/17.5-19.5px) */}
                <div className="flex flex-col">
                  <h3 className="text-[#0033FF] font-bold text-[19px] sm:text-[24px] md:text-[26px] lg:text-[27px] tracking-[-0.01em] leading-tight">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 sm:mt-2.5 text-[#0033FF] font-normal text-[15px] sm:text-[17.5px] md:text-[18.5px] lg:text-[19.5px] leading-snug tracking-[-0.005em]">
                    {item.desc}
                  </p>
                </div>
              </div>
            </TiltCard>
          ))}
        </div>
      </div>
    </section>
  );
}
