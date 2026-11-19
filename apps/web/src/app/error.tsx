'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { RotateCcw, ArrowLeft } from 'lucide-react';

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
    document.documentElement.style.backgroundColor = '#000000';
    document.body.style.backgroundColor = '#000000';
    return () => {
      document.documentElement.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
    };
  }, []);

  const currentYear = new Date().getFullYear();

  return (
    <div className="fixed inset-0 w-full h-[100dvh] max-h-[100dvh] bg-black text-white p-2.5 sm:p-3 overflow-hidden font-reddit selection:bg-white selection:text-black z-50 flex flex-col lg:flex-row gap-2.5 sm:gap-3">
      {/* ============================================================== */}
      {/* LEFT CARD (Desktop Only): Signature Fractal Glass Graphic     */}
      {/* ============================================================== */}
      <div className="hidden lg:relative lg:flex lg:flex-col lg:justify-between lg:w-1/2 h-full bg-[#101012] border border-white/[0.08] rounded-xl overflow-hidden select-none p-6 sm:p-8 shrink-0">
        <Image
          src="/fractal-glass-5.jpg"
          alt="HydroBasics Industrial Hydraulic Engineer"
          fill
          priority
          sizes="50vw"
          className="object-cover object-center select-none"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent pointer-events-none"
          aria-hidden="true"
        />

        {/* Top Header Row over Image */}
        <div className="relative z-10 w-full flex items-center justify-between">
          <Link href="/" className="flex flex-col select-none group" title="HYDRO BASICS Home">
            <span className="font-extrabold text-[15px] sm:text-[16px] text-white leading-[1.05] tracking-wider uppercase group-hover:text-white/80 transition-colors">
              HYDRO
            </span>
            <span className="font-extrabold text-[15px] sm:text-[16px] text-white leading-[1.05] tracking-wider uppercase group-hover:text-white/80 transition-colors">
              BASICS
            </span>
          </Link>
        </div>
      </div>

      {/* ============================================================== */}
      {/* RIGHT CARD: 500 Operation Interrupted                          */}
      {/* ============================================================== */}
      <div className="w-full flex-1 min-h-0 lg:w-1/2 lg:h-full bg-[#101012] border border-white/[0.08] rounded-xl flex flex-col overflow-hidden relative select-text">
        {/* Top Header Bar: lines touch outer ends */}
        <div className="px-6 sm:px-8 lg:px-10 py-4 sm:py-5 border-b border-white/[0.08] flex items-center justify-between shrink-0 select-none bg-[#101012]">
          <Link
            href="/"
            className="lg:hidden flex flex-col select-none group"
            title="HYDRO BASICS Home"
          >
            <span className="font-extrabold text-[14px] text-white leading-[1.05] tracking-wider uppercase">
              HYDRO
            </span>
            <span className="font-extrabold text-[14px] text-white leading-[1.05] tracking-wider uppercase">
              BASICS
            </span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-mono tracking-wider text-[#c2c4cc]/80 hover:text-white transition-colors ml-auto"
            title="Back to Home"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Center Container with Login/Signup-style Tab Box */}
        <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center">
          <div className="w-full max-w-[420px] sm:max-w-[440px]">
            <div className="relative w-full bg-[#151619] border border-white/[0.08] hover:border-white/[0.14] rounded-xl p-6 sm:p-8 select-none overflow-hidden space-y-5 transition-all text-left">
              {/* Header */}
              <div className="space-y-1.5">
                <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-widest">
                  500 &bull; System Error
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Operation Interrupted
                </h1>
                <p className="text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed">
                  An unexpected system anomaly interrupted this operation. Our monitoring service
                  has logged the technical stack trace.
                </p>
              </div>

              {error.digest && (
                <div className="pt-0.5">
                  <code className="font-mono text-[11px] px-2.5 py-1 rounded bg-black/40 border border-white/[0.08] text-white/60 block w-fit truncate max-w-full">
                    Digest: {error.digest}
                  </code>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => reset()}
                  className="w-full h-11 bg-white hover:bg-neutral-200 active:bg-neutral-300 text-black font-semibold text-xs sm:text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm select-none"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Try Again</span>
                </button>
                <Link
                  href="/"
                  className="w-full h-10 rounded-lg border border-white/[0.08] hover:border-white/[0.14] bg-[#1b1c20] hover:bg-[#22242a] text-[#c2c4cc] hover:text-white text-xs font-medium flex items-center justify-center transition-colors cursor-pointer select-none"
                >
                  Return to Home
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Legal Navigation Bar: lines touch outer ends */}
        <div className="px-6 sm:px-8 lg:px-10 py-4 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs select-none shrink-0 bg-[#101012]">
          <nav aria-label="Footer Legal Links" className="flex items-center gap-4 text-xs">
            <Link href="/terms" className="text-[#80828d] hover:text-white transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="text-[#80828d] hover:text-white transition-colors">
              Privacy
            </Link>
            <Link href="/refunds" className="text-[#80828d] hover:text-white transition-colors">
              Refunds
            </Link>
            <Link href="/contact" className="text-[#80828d] hover:text-white transition-colors">
              Contact
            </Link>
          </nav>
          <p className="text-[11px] text-[#5d5f6a]">
            &copy; {currentYear} Hydro Basics. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
