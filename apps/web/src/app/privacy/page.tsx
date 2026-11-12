'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { siteConfig } from '../../config/site';

export default function PrivacyPage() {
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
    <div className="fixed inset-0 w-full h-full bg-white font-reddit selection:bg-black selection:text-white flex flex-col lg:flex-row overflow-hidden">
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
            <span aria-hidden="true">&larr;</span> Back to Course
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
        <main className="my-auto w-full max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-8 lg:py-0 relative z-10 flex flex-col justify-center">
          <div className="relative w-full bg-white border border-neutral-200/80 rounded-none select-text overflow-hidden">
            {/* Header: divider line touches outer box border */}
            <div className="p-5 sm:p-6 border-b border-neutral-200/80">
              <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
                Privacy Policy
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed mt-1">
                Data protection practices, secure payment handling, and student privacy rights.
              </p>
            </div>

            {/* Concise 1-2 line points with full-width separation lines touching border */}
            <div className="divide-y divide-neutral-200/80 text-xs sm:text-[13px] text-neutral-700">
              <div className="px-5 sm:px-6 py-2.5 sm:py-3">
                <p className="leading-relaxed">
                  <span className="font-mono font-bold text-neutral-900 mr-2">01.</span>
                  <strong className="font-bold text-neutral-950 mr-1">Information Collected:</strong>
                  Student name, email, phone number, and optional GSTIN collected solely for authentication and tax invoicing.
                </p>
              </div>

              <div className="px-5 sm:px-6 py-2.5 sm:py-3">
                <p className="leading-relaxed">
                  <span className="font-mono font-bold text-neutral-900 mr-2">02.</span>
                  <strong className="font-bold text-neutral-950 mr-1">Payment Security:</strong>
                  We never store card numbers, CVVs, or UPI PINs; all transactions are processed securely by RBI-authorized Razorpay (PCI-DSS Level 1).
                </p>
              </div>

              <div className="px-5 sm:px-6 py-2.5 sm:py-3">
                <p className="leading-relaxed">
                  <span className="font-mono font-bold text-neutral-900 mr-2">03.</span>
                  <strong className="font-bold text-neutral-950 mr-1">Session Protection:</strong>
                  Access tokens reside in volatile memory and encrypted httpOnly cookies to prevent session hijacking and cross-site scripting (XSS).
                </p>
              </div>

              <div className="px-5 sm:px-6 py-2.5 sm:py-3">
                <p className="leading-relaxed">
                  <span className="font-mono font-bold text-neutral-900 mr-2">04.</span>
                  <strong className="font-bold text-neutral-950 mr-1">Zero Data Selling:</strong>
                  We strictly do not sell, rent, or trade your personal information or contact details to third-party marketing networks.
                </p>
              </div>

              <div className="px-5 sm:px-6 py-2.5 sm:py-3">
                <p className="leading-relaxed">
                  <span className="font-mono font-bold text-neutral-900 mr-2">05.</span>
                  <strong className="font-bold text-neutral-950 mr-1">Student Privacy Rights:</strong>
                  Under DPDP Act 2023, you can view your data, download invoices, or request permanent account erasure at{' '}
                  <a
                    href={`mailto:${siteConfig.supportEmail}`}
                    className="font-semibold underline text-black hover:opacity-80"
                  >
                    {siteConfig.supportEmail}
                  </a>.
                </p>
              </div>
            </div>

            {/* Bottom metadata strip: divider line touches outer box border */}
            <div className="px-5 sm:px-6 py-2.5 border-t border-neutral-200/80 flex items-center justify-between text-[11px] font-mono text-neutral-400 bg-neutral-50/50">
              <span>Compliant with DPDP Act 2023 &amp; IT Rules</span>
              <span>Updated: 2026</span>
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
            <Link href="/privacy" className="text-black font-bold">
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
