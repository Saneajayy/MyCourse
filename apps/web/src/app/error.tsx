'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { RotateCcw, Home, AlertTriangle } from 'lucide-react';
import { siteConfig } from '../config/site';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Next.js Global Page Error:', error);
  }, [error]);

  useEffect(() => {
    document.documentElement.style.backgroundColor = '#FFFFFF';
    document.body.style.backgroundColor = '#FFFFFF';
    return () => {
      document.documentElement.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
    };
  }, []);

  const currentYear = new Date().getFullYear();

  return (
    <div className="fixed inset-0 w-full h-full bg-white font-reddit selection:bg-black selection:text-white flex flex-col lg:flex-row overflow-hidden z-50">
      {/* Left Column (Desktop Only): Signature Dot Halftone Graphic on Black */}
      <div className="hidden lg:relative lg:flex lg:w-1/2 h-full bg-black overflow-hidden select-none">
        <Image
          src="/split-pixelated.png"
          alt="HydroBasics Industrial Hydraulic Engineer"
          fill
          priority
          sizes="50vw"
          className="object-cover object-center mix-blend-screen opacity-95 select-none"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"
          aria-hidden="true"
        />
      </div>

      {/* Right Column: Clean White Background */}
      <div className="w-full lg:w-1/2 h-full bg-white flex flex-col justify-between overflow-y-auto lg:overflow-hidden relative">
        {/* Top Header Bar */}
        <header className="w-full flex items-center justify-between px-5 pt-4 sm:px-8 sm:pt-6 shrink-0 z-20 lg:absolute lg:top-0 lg:inset-x-0">
          <Link
            href="/"
            className="text-neutral-500 hover:text-black font-semibold text-xs sm:text-sm tracking-normal transition-colors flex items-center gap-1.5 py-1"
          >
            <span aria-hidden="true">&larr;</span> Back to Home
          </Link>

          <Link
            href="/"
            className="flex flex-col items-end -space-y-0.5 leading-[0.92] text-black hover:opacity-90 transition-opacity select-none text-right cursor-pointer"
            aria-label="HYDRO BASICS Home"
          >
            <span className="font-extrabold text-[18px] sm:text-[20px] tracking-[0.02em] uppercase leading-[0.92]">
              HYDRO
            </span>
            <span className="font-extrabold text-[18px] sm:text-[20px] tracking-[0.02em] uppercase leading-[0.92]">
              BASICS
            </span>
          </Link>
        </header>

        {/* Center Content Card - Vertically Centered */}
        <main className="my-auto w-full max-w-lg mx-auto px-4 sm:px-6 py-6 sm:py-8 lg:py-0 relative z-10 flex flex-col justify-center">
          <div className="relative w-full bg-white border border-neutral-200/80 rounded-none select-text overflow-hidden">
            {/* Header: divider line touches outer box border */}
            <div className="p-5 sm:p-6 border-b border-neutral-200/80">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-rose-600 uppercase tracking-widest mb-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>System Error 500</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
                Operation Interrupted
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed mt-1">
                An unexpected error occurred while loading this page. Our technical monitoring team
                has been notified.
              </p>
            </div>

            {/* Concise 1-2 line points with full-width separation lines touching border */}
            <div className="divide-y divide-neutral-200/80 text-xs sm:text-[13px] text-neutral-700">
              <div className="px-5 sm:px-6 py-2.5 sm:py-3">
                <p className="leading-relaxed">
                  <span className="font-mono font-bold text-neutral-900 mr-2">01.</span>
                  <strong className="font-bold text-neutral-950 mr-1">Immediate Recovery:</strong>
                  Click &quot;Try Again&quot; below to re-execute the request or reload your browser
                  window.
                </p>
              </div>

              <div className="px-5 sm:px-6 py-2.5 sm:py-3">
                <p className="leading-relaxed">
                  <span className="font-mono font-bold text-neutral-900 mr-2">02.</span>
                  <strong className="font-bold text-neutral-950 mr-1">Need Assistance:</strong>
                  If the problem persists, contact our engineering support desk at{' '}
                  <a
                    href={`mailto:${siteConfig.supportEmail}`}
                    className="font-semibold underline text-black hover:opacity-80"
                  >
                    {siteConfig.supportEmail}
                  </a>
                  .
                </p>
              </div>

              {error.digest && (
                <div className="px-5 sm:px-6 py-2 bg-neutral-50/50">
                  <p className="font-mono text-[11px] text-neutral-500 truncate">
                    <span className="font-bold text-neutral-700">Digest:</span> {error.digest}
                  </p>
                </div>
              )}
            </div>

            {/* Action Bar: full-width border touching outer box border */}
            <div className="p-4 sm:p-5 border-t border-neutral-200/80 bg-neutral-50/40 flex flex-col sm:flex-row items-center gap-2.5">
              <button
                type="button"
                onClick={() => reset()}
                className="w-full sm:flex-1 h-10 px-4 bg-black hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider rounded-none transition-colors flex items-center justify-center gap-2 cursor-pointer select-none"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
              <Link
                href="/"
                className="w-full sm:w-auto h-10 px-4 bg-white hover:bg-neutral-50 text-neutral-900 border border-neutral-300 font-semibold text-xs rounded-none transition-colors flex items-center justify-center gap-1.5 cursor-pointer select-none"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Return Home</span>
              </Link>
            </div>

            {/* Bottom metadata strip: divider line touches outer box border */}
            <div className="px-5 sm:px-6 py-2 border-t border-neutral-200/80 flex items-center justify-between text-[11px] font-mono text-neutral-400 bg-neutral-50/70">
              <span>Status: 500 Interrupted</span>
              <span>{siteConfig.brandName}</span>
            </div>
          </div>
        </main>

        {/* Footer: Lifted up from bottom edge */}
        <footer className="shrink-0 pb-6 sm:pb-8 lg:pb-7 px-5 sm:px-8 text-center z-20 lg:absolute lg:bottom-0 lg:inset-x-0">
          <nav
            aria-label="Footer Legal Links"
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-neutral-500 mb-1"
          >
            <Link href="/terms" className="hover:text-black transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-black transition-colors">
              Privacy
            </Link>
            <Link href="/refunds" className="hover:text-black transition-colors">
              Refunds
            </Link>
            <Link href="/contact" className="hover:text-black transition-colors">
              Contact
            </Link>
          </nav>
          <p className="text-[11px] text-neutral-400">
            &copy; {currentYear} Hydro Basics. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}
