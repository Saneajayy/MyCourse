'use client';

import React from 'react';
import Link from 'next/link';
import { HeroScatterCanvas } from './HeroScatterCanvas';

interface HeroSectionProps {
  courseSlug?: string;
}

const TARGET_LETTERS = [
  'L',
  'E',
  'A',
  'R',
  'N',
  'A',
  'P',
  'P',
  'L',
  'Y',
  'S',
  'O',
  'L',
  'V',
  'E',
] as const;
const LETTER_POOL = ['L', 'E', 'A', 'R', 'N', 'A', 'P', 'P', 'L', 'Y', 'S', 'O', 'L', 'V', 'E'];

function MantraShuffle() {
  const [letters, setLetters] = React.useState<string[]>([...TARGET_LETTERS]);
  const isShufflingRef = React.useRef(false);
  const animFrameRef = React.useRef<number | null>(null);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const startShuffle = React.useCallback(() => {
    if (isShufflingRef.current) return;
    isShufflingRef.current = true;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const startTime = performance.now();
    const duration = 1300; // 1.3 seconds
    let lastFrameTime = 0;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1.0);

      // Throttle updates every 40ms (~25fps ticker)
      if (currentTime - lastFrameTime >= 40 || progress >= 1.0) {
        lastFrameTime = currentTime;

        // Shuffle letters among the 3 words
        const shuffledPool = [...LETTER_POOL].sort(() => Math.random() - 0.5);

        const nextLetters = TARGET_LETTERS.map((targetChar, i) => {
          // Lock threshold: progressively lock left to right from 20% to 92%
          const lockThreshold = 0.2 + (i / 15) * 0.72;
          if (progress >= lockThreshold) {
            return targetChar;
          }
          return shuffledPool[i] || targetChar;
        });

        setLetters(nextLetters);
      }

      if (progress < 1.0) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Guarantee exact final state
        setLetters([...TARGET_LETTERS]);
        isShufflingRef.current = false;

        // Automatically trigger next shuffle in 3 seconds
        timeoutRef.current = setTimeout(() => {
          startShuffle();
        }, 3000);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, []);

  React.useEffect(() => {
    // Start initial shuffle after 3 seconds on mount
    timeoutRef.current = setTimeout(() => {
      startShuffle();
    }, 3000);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [startShuffle]);

  const renderWord = (startIdx: number, endIdx: number) => {
    return (
      <span className="inline-flex items-center">
        {letters.slice(startIdx, endIdx).map((char, localIdx) => {
          const globalIdx = startIdx + localIdx;
          const isLocked =
            !isShufflingRef.current || letters[globalIdx] === TARGET_LETTERS[globalIdx];
          return (
            <span
              key={localIdx}
              className={`inline-block transition-opacity duration-150 ${
                isLocked ? 'opacity-100' : 'opacity-75'
              }`}
            >
              {char}
            </span>
          );
        })}
        <span>.</span>
      </span>
    );
  };

  return (
    <div
      onClick={startShuffle}
      className="mt-2 sm:mt-2.5 md:mt-3 flex items-center justify-center sm:justify-start gap-2.5 sm:gap-3 md:gap-3.5 text-white font-[200] font-extralight text-[27px] sm:text-[34px] md:text-[40px] lg:text-[46px] xl:text-[49px] tracking-[0.03em] uppercase leading-none whitespace-nowrap select-none cursor-pointer group"
      title="Click to shuffle"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          startShuffle();
        }
      }}
    >
      {renderWord(0, 5)}
      {renderWord(5, 10)}
      {renderWord(10, 15)}
    </div>
  );
}

export function HeroSection(_props: HeroSectionProps = {}) {
  return (
    <section className="relative w-full min-h-[calc(100vh-84px)] flex items-start sm:items-center overflow-visible pt-14 pb-16 sm:pt-14 sm:pb-14 md:pt-16 md:pb-16 font-reddit select-none">
      {/* 3D Hydraulic Pump/Motor Pixelated Graphic (interactive scatter canvas) */}
      <div className="absolute -right-[19vw] sm:-right-[22vw] lg:-right-[28vw] top-1/2 -translate-y-[31%] sm:-translate-y-[44%] translate-x-[44%] sm:translate-x-0 w-[162vw] sm:w-[94vw] max-w-[1850px] min-w-[1235px] sm:min-w-[720px] pointer-events-none flex items-center justify-end z-0">
        <HeroScatterCanvas />
      </div>

      <div className="relative w-full px-6 sm:pl-12 md:pl-16 lg:pl-20 xl:pl-24 sm:pr-8 md:pr-12 lg:pr-16 z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-8 lg:gap-4">
          {/* Left Column: Typography & Glass CTA */}
          <div className="lg:col-span-8 xl:col-span-8 z-10 flex flex-col items-center sm:items-start text-center sm:text-left w-full">
            {/* Eyebrow / Subheading: Reduced slightly on mobile, exact original scale on desktop */}
            <p className="text-white text-[17px] sm:text-[23px] md:text-[26px] lg:text-[28px] font-medium tracking-normal leading-tight text-center sm:text-left">
              A complete beginner&apos;s guide on hydraulics.
            </p>

            {/* Giant 3-Line Headline: Clean, distinct line spacing on both desktop and mobile without overlapping or collision */}
            <h1 className="mt-2 sm:mt-3 md:mt-4 mb-2 sm:mb-2.5 md:mb-3 ml-0 sm:-ml-1.5 md:-ml-2 lg:-ml-[8px] xl:-ml-[9px] 2xl:-ml-[10px] font-bold text-white uppercase leading-[0.88] sm:leading-[0.86] tracking-[-0.02em] space-y-1 sm:space-y-1.5 md:space-y-2 text-6xl sm:text-8xl md:text-[108px] lg:text-[132px] xl:text-[154px] 2xl:text-[172px] flex flex-col items-center sm:items-start text-center sm:text-left select-none">
              <span className="block">HYDRAULIC</span>
              <span className="block">SYSTEM</span>
              <span className="block">BASICS</span>
            </h1>

            <MantraShuffle />

            {/* Glass "START LEARNING NOW" Tab / Button: Exact dimensions and position strictly preserved */}
            <div className="mt-5 sm:mt-6 md:mt-7 lg:mt-8 w-[361px] sm:w-[420px] md:w-[463px] lg:w-[497px] max-w-full">
              <Link
                href="#pricing"
                className="figma-glass-btn w-full h-[54px] sm:h-[64px] md:h-[70px] lg:h-[74px] flex items-center justify-center px-1 sm:px-2 rounded-2xl md:rounded-[18px] text-white font-bold text-[26px] sm:text-[32px] md:text-[37px] lg:text-[41px] tracking-[0.01em] uppercase leading-none whitespace-nowrap transition-all duration-200 active:scale-[0.98]"
              >
                START LEARNING NOW
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
