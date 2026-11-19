'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, BookOpen } from 'lucide-react';

export default function NotFound() {
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
    <div className="fixed inset-0 w-full h-[100dvh] max-h-[100dvh] bg-black text-white p-2.5 sm:p-3 overflow-hidden font-reddit selection:bg-white selection:text-black z-10 flex flex-col lg:flex-row gap-2.5 sm:gap-3">
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
      {/* RIGHT CARD: 404 Route Not Found                                */}
      {/* ============================================================== */}
      <div className="w-full flex-1 min-h-0 lg:w-1/2 lg:h-full bg-[#101012] border border-white/[0.08] rounded-xl flex flex-col overflow-hidden relative select-text">
        {/* Top Header Bar: lines touch outer ends */}
        <div className="px-6 sm:px-8 lg:px-10 py-4 sm:py-5 border-b border-white/[0.08] flex items-center justify-between shrink-0 select-none bg-[#101012]">
          <div className="flex items-center gap-3">
            <Link href="/" className="lg:hidden flex flex-col select-none group" title="HYDRO BASICS Home">
              <span className="font-extrabold text-[14px] text-white leading-[1.05] tracking-wider uppercase">
                HYDRO
              </span>
              <span className="font-extrabold text-[14px] text-white leading-[1.05] tracking-wider uppercase">
                BASICS
              </span>
            </Link>
            <span className="lg:hidden text-white/30 font-mono text-xs">/</span>
            <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
              404 &bull; Route Not Found
            </h1>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-mono tracking-wider text-[#c2c4cc]/80 hover:text-white transition-colors ml-auto"
            title="Back to Home"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Scrollable Document Body */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 lg:px-10 py-6 sm:py-8 space-y-7 scroll-smooth text-left flex flex-col justify-center">
          {/* Main Error Title */}
          <div className="space-y-2">
            <span className="text-4xl sm:text-5xl font-black font-mono text-white tracking-tight block">
              404
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Page Not Located
            </h2>
            <p className="text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed max-w-lg">
              The hydraulic schematic, course module, or page you requested does not exist or may have been relocated.
            </p>
          </div>

          {/* Divider line touching outer ends */}
          <div className="-mx-6 sm:-mx-8 lg:-mx-10 border-b border-white/[0.08]" />

          {/* Concise recovery points */}
          <div className="space-y-3 text-xs sm:text-[13px] text-[#c2c4cc]">
            <div className="flex items-start gap-2.5">
              <span className="text-xs font-mono font-bold text-white/50 shrink-0 mt-0.5">01.</span>
              <p className="leading-relaxed">
                <strong className="text-white font-medium">Verify the URL:</strong> Double-check for typos or extra symbols in the link address.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-xs font-mono font-bold text-white/50 shrink-0 mt-0.5">02.</span>
              <p className="leading-relaxed">
                <strong className="text-white font-medium">Enrolled Students:</strong> Access curriculum lessons directly from your{' '}
                <Link href="/dashboard" className="text-white underline hover:text-white/80 font-medium">
                  Student Dashboard
                </Link>
                .
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-xs font-mono font-bold text-white/50 shrink-0 mt-0.5">03.</span>
              <p className="leading-relaxed">
                <strong className="text-white font-medium">Need Assistance:</strong> If you followed a broken link, reach our technical{' '}
                <Link href="/contact" className="text-white underline hover:text-white/80 font-medium">
                  Support Desk
                </Link>
                .
              </p>
            </div>
          </div>

          {/* Divider line touching outer ends */}
          <div className="-mx-6 sm:-mx-8 lg:-mx-10 border-b border-white/[0.08]" />

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/"
              className="w-full sm:flex-1 h-11 px-5 bg-white hover:bg-neutral-200 active:bg-neutral-300 text-black font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm select-none"
            >
              <span>Return to Home &rarr;</span>
            </Link>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto h-11 px-5 rounded-lg border border-white/[0.1] hover:border-white/[0.18] bg-[#1b1c20] hover:bg-[#22242a] text-[#c2c4cc] hover:text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer select-none"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>My Dashboard</span>
            </Link>
          </div>
        </div>

        {/* Bottom Legal Navigation Bar: lines touch outer ends */}
        <div className="px-6 sm:px-8 lg:px-10 py-4 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs select-none shrink-0 bg-[#101012]">
          <nav
            aria-label="Footer Legal Links"
            className="flex items-center gap-4 text-xs"
          >
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
