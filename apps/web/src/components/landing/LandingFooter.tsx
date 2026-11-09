'use client';

import React from 'react';
import Link from 'next/link';
import { ScatterCanvas } from '../ui/ScatterCanvas';

export interface LandingFooterProps {
  showQuickLinks?: boolean;
}

export function LandingFooter({ showQuickLinks = true }: LandingFooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative w-full overflow-visible font-reddit select-none bg-transparent pt-6 sm:pt-8 md:pt-10 pb-10 sm:pb-12 md:pb-14 pl-8 sm:pl-12 md:pl-16 lg:pl-20 xl:pl-24 pr-6 sm:pr-8 md:pr-12 lg:pr-16">
      {/* Horizontal Divider Line matching Figma screenshot - spans across the left area */}
      <div className="w-full max-w-[62%] sm:max-w-[66%] border-t border-white/20 mb-8 sm:mb-10 md:mb-12" />

      {/* 3D Pixelated Graphic: Headroom extended upwards so top is uncut, cropped strictly at bottom */}
      <div className="absolute right-0 bottom-0 -top-[800px] w-full pointer-events-none overflow-hidden z-0">
        <div className="absolute right-0 translate-x-[25%] translate-y-[30%] bottom-0 w-[90vw] sm:w-[78vw] md:w-[70vw] lg:w-[62vw] xl:w-[58vw] max-w-[1100px] min-w-[450px] flex items-end justify-end">
          <ScatterCanvas
            dotsUrl="/footer-dots.json"
            fallbackSrc="/footer-pixelated.png"
            alt="Hydraulic 3D Component"
            width={2334}
            height={2694}
            rotationDeg={10}
            containerClassName="w-full h-auto aspect-[2334/2694] rotate-[10deg] flex items-end justify-end"
            imgClassName="w-full h-auto object-contain object-bottom-right"
            opacityClass="opacity-85"
            priority
          />
        </div>
      </div>

      <div className="relative z-10 flex flex-col justify-between">
        {/* Main Footer Layout: On mobile navigation & legal columns are first; on desktop HYDRO BASICS is left, Quick Links is right */}
        <div className="flex flex-col sm:flex-row items-start gap-8 sm:gap-14 md:gap-16 lg:gap-20">
          {/* HYDRO BASICS Column: Left on desktop (sm:order-1), second on mobile (order-2) */}
          <div className="order-2 sm:order-1 flex flex-col items-start">
            {/* Giant Stacked Brand Wordmark */}
            <div className="flex flex-col items-start leading-[0.80] select-none">
              <span className="block font-bold text-white uppercase text-[86px] sm:text-[104px] md:text-[128px] lg:text-[155px] xl:text-[180px] 2xl:text-[195px] tracking-[-0.03em]">
                HYDRO
              </span>
              <span className="block font-bold text-white uppercase text-[86px] sm:text-[104px] md:text-[128px] lg:text-[155px] xl:text-[180px] 2xl:text-[195px] tracking-[-0.03em] mt-1.5 sm:-mt-0.5 md:-mt-1 lg:-mt-1.5 xl:-mt-2">
                BASICS
              </span>
            </div>

            {/* Desktop Legal Links: Positioned horizontally directly below HYDRO BASICS (hidden on mobile) */}
            <div className="hidden sm:flex flex-col items-start gap-2.5 sm:gap-3 text-xs sm:text-sm text-white/70 mt-8 sm:mt-10 md:mt-12">
              <div className="flex flex-wrap items-center gap-x-5 sm:gap-x-6 gap-y-2">
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms &amp; Conditions
                </Link>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
                <Link href="/refunds" className="hover:text-white transition-colors">
                  Refund Policy
                </Link>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Contact Support
                </Link>
              </div>

              <p className="text-white/45 text-[11px] sm:text-xs">
                © {currentYear} Hydro Basics. Industrial Hydraulic Engineering Masterclass.
              </p>
            </div>

            {/* Mobile Copyright: Placed below HYDRO BASICS on mobile */}
            <p className="sm:hidden text-white/45 text-[11px] mt-6 select-none">
              © {currentYear} Hydro Basics. Industrial Hydraulic Engineering Masterclass.
            </p>
          </div>

          {/* Links Row on mobile (order-1), Quick Links on desktop (sm:order-2) */}
          {showQuickLinks ? (
            <div className="order-1 sm:order-2 flex flex-row sm:flex-col items-start gap-10 sm:gap-0 shrink-0 pt-0 sm:pt-3 md:pt-4 justify-start">
              {/* Quick Links Column */}
              <div className="flex flex-col items-start">
                <span className="text-xs sm:text-sm font-bold text-white/50 uppercase tracking-[0.2em] mb-3 sm:mb-4 select-none">
                  Quick Links
                </span>
                <nav aria-label="Footer Quick Links" className="flex flex-col space-y-2 sm:space-y-2.5 text-sm sm:text-base font-medium text-white/75">
                  <Link href="/#syllabus" className="hover:text-white transition-colors">
                    Syllabus
                  </Link>
                  <Link href="/#reviews" className="hover:text-white transition-colors">
                    Reviews
                  </Link>
                  <Link href="/#instructor" className="hover:text-white transition-colors">
                    Instructor
                  </Link>
                  <Link href="/#pricing" className="hover:text-white transition-colors">
                    Pricing
                  </Link>
                  <Link href="/#faqs" className="hover:text-white transition-colors">
                    FAQs
                  </Link>
                </nav>
              </div>

              {/* Mobile-Only Legal Column: Positioned on the right side as a column next to Quick Links */}
              <div className="sm:hidden flex flex-col items-start">
                <span className="text-xs font-bold text-white/50 uppercase tracking-[0.2em] mb-3 select-none">
                  Legal
                </span>
                <nav aria-label="Footer Legal Links" className="flex flex-col space-y-2 text-sm font-medium text-white/75">
                  <Link href="/terms" className="hover:text-white transition-colors">
                    Terms &amp; Conditions
                  </Link>
                  <Link href="/privacy" className="hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                  <Link href="/refunds" className="hover:text-white transition-colors">
                    Refund Policy
                  </Link>
                  <Link href="/contact" className="hover:text-white transition-colors">
                    Contact Support
                  </Link>
                </nav>
              </div>
            </div>
          ) : (
            <div className="order-1 sm:order-2 flex flex-col items-start shrink-0 pt-0 sm:pt-3 md:pt-4 justify-start">
              <span className="text-xs sm:text-sm font-bold text-white/50 uppercase tracking-[0.2em] mb-3 select-none">
                Legal &amp; Support
              </span>
              <nav aria-label="Footer Legal Links" className="flex flex-col space-y-2.5 text-sm font-medium text-white/75">
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms &amp; Conditions
                </Link>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
                <Link href="/refunds" className="hover:text-white transition-colors">
                  Refund Policy
                </Link>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Contact Support
                </Link>
              </nav>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
