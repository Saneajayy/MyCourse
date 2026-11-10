'use client';

import React from 'react';
import Link from 'next/link';
import { TiltCard } from '../ui/TiltCard';
import { ScatterCanvas } from '../ui/ScatterCanvas';
import { ClaudeIcon } from '../ui/ClaudeIcon';

interface PricingSectionProps {
  priceFormatted?: string;
  originalPriceFormatted?: string;
  courseSlug?: string;
}

export function PricingSection({
  priceFormatted = '$4999',
}: PricingSectionProps) {
  const features = [
    '60 video lessons in Hindi.',
    '12 months of access.',
    'Certificate of completion.',
    'Learn on phone, tablet or laptop.',
    'Track your progress.',
    'Stream in HD Quality.',
  ];

  return (
    <section
      id="pricing"
      className="relative w-full py-16 sm:py-20 md:py-24 pl-8 sm:pl-12 md:pl-16 lg:pl-20 xl:pl-24 pr-6 sm:pr-8 md:pr-12 lg:pr-16 font-reddit select-none bg-transparent overflow-visible scroll-mt-12 md:scroll-mt-16"
    >

      {/* 3D Hydraulic Component Pixelated Graphic (Flipped horizontally and positioned on Left Side) */}
      <div className="absolute -left-[10vw] sm:-left-[14vw] lg:-left-[18vw] xl:-left-[20vw] top-1/2 -translate-y-[45%] sm:-translate-y-[35%] -translate-x-[10%] sm:translate-x-0 w-[103vw] sm:w-[86vw] max-w-[1650px] min-w-[840px] sm:min-w-[700px] pointer-events-none flex items-center justify-start z-0">
        <ScatterCanvas
          dotsUrl="/pricing-dots.json"
          fallbackSrc="/pricing-pixelated.png"
          alt="Hydraulic Component"
          width={2508}
          height={2508}
          rotationDeg={0}
          flipH={true}
          containerClassName="w-full h-auto max-h-[145vh] aspect-square flex items-center justify-start -scale-x-100"
          imgClassName="w-full h-auto max-h-[145vh] object-contain object-left"
          opacityClass="opacity-75"
          priority
        />
      </div>

      <div className="max-w-[1440px] w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 xl:gap-16 items-start">
          {/* Left Column: Heading in exact original top-left position */}
          <div className="lg:col-span-7 xl:col-span-7 flex flex-col items-start z-10">
            {/* Section Heading: Exact 2-line uppercase stacked with period */}
            <h2 className="font-extrabold text-white uppercase leading-[0.88] tracking-[-0.02em] text-5xl sm:text-6xl md:text-7xl lg:text-[76px] xl:text-[84px] select-none">
              <span className="block">BEST PRICE</span>
              <span className="block">FOR YOU.</span>
            </h2>
          </div>

          {/* Right Column: Pricing Card matching instructor card position and right margin */}
          <div className="lg:col-span-5 xl:col-span-5 flex justify-center lg:justify-end items-start w-full z-10">
            <TiltCard
              className="relative w-full max-w-[410px] sm:max-w-[475px] md:max-w-[530px] lg:max-w-[580px] xl:max-w-[630px] p-7 sm:p-8 md:p-9 lg:p-10 bg-white rounded-lg sm:rounded-xl select-none cursor-pointer"
              maxTilt={5.5}
            >
              {/* Card Content in Royal Blue #000000 */}
              <div className="relative z-10 flex flex-col items-start w-full">
                {/* Course Title Header */}
                <span className="text-black font-bold text-sm sm:text-base md:text-[17px] tracking-tight uppercase">
                  HYDRAULIC SYSTEM BASICS
                </span>

                {/* Price Display */}
                <div className="text-black font-bold text-5xl sm:text-6xl md:text-[66px] lg:text-[72px] tracking-tight mt-1.5 sm:mt-2 leading-none">
                  {priceFormatted}
                </div>

                {/* Subtitle */}
                <p className="text-black/80 font-medium text-xs sm:text-sm md:text-[15px] mt-1.5 sm:mt-2">
                  One-time payment. No monthly fees.
                </p>

                {/* Divider Line */}
                <div className="w-full border-b border-black/20 my-5 sm:my-6 md:my-7" />

                {/* Features List with Claude-Style Starburst Bullet Points */}
                <div className="space-y-3.5 sm:space-y-4 md:space-y-4.5 w-full">
                  {features.map((feature) => (
                    <div key={feature} className="flex items-center gap-3">
                      {/* Claude-Like Sign Bullet Point */}
                      <ClaudeIcon className="w-[18px] h-[18px] sm:w-[20px] sm:h-[20px] md:w-[22px] md:h-[22px] text-black shrink-0" />

                      {/* Feature Text */}
                      <span className="text-black font-bold text-[15px] sm:text-[16px] md:text-[17.5px] lg:text-[18.5px] leading-tight">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Checkout CTA Button: Enlarged, bold, high-contrast */}
                <Link
                  href="/checkout"
                  className="mt-7 sm:mt-8 md:mt-9 w-full h-[54px] sm:h-[58px] md:h-[62px] lg:h-[66px] py-0 px-2 rounded-xl bg-black hover:bg-[#262626] text-white font-black text-[24px] sm:text-[27px] md:text-[30px] lg:text-[32px] uppercase tracking-wide flex items-center justify-center leading-none text-center transition-all duration-200 active:scale-[0.98]"
                >
                  CHECKOUT NOW
                </Link>

                {/* Secure Payment Footer */}
                <div className="mt-3.5 sm:mt-4 w-full flex items-center justify-center gap-1.5 text-black/80 text-xs sm:text-[13px]">
                  <span>Secure payments powered by</span>
                  <span className="font-bold text-black italic flex items-center gap-0.5">
                    <svg className="w-3.5 h-3.5 fill-black" viewBox="0 0 24 24">
                      <path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5L4.5 9.75 3 10.5l9 4.5 9-4.5-1.5-.75L12 13.5z" />
                    </svg>
                    Razorpay
                  </span>
                </div>
              </div>
            </TiltCard>
          </div>
        </div>
      </div>
    </section>
  );
}
