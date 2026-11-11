'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { siteConfig } from '../../config/site';
import { ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function TermsPage() {
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
        {/* Soft overlay gradient for subtle depth */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#000000]/80 via-transparent to-transparent pointer-events-none"
          aria-hidden="true"
        />
      </div>

      {/* Right Column: Clean White Background with Scrollable Content */}
      <div className="w-full lg:w-1/2 h-full bg-white flex flex-col overflow-y-auto relative">
        {/* Top Header Bar inside right side area */}
        <header className="w-full flex items-center justify-between px-5 pt-5 sm:px-8 sm:pt-8 shrink-0 z-20">
          <Link
            href="/"
            className="text-neutral-600 hover:text-black font-semibold text-xs sm:text-sm tracking-normal transition-colors flex items-center gap-1.5 py-1"
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

        {/* Content Container */}
        <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10 relative z-10 flex-1">
          {/* Main Card with border matching separation line, all separation lines touching the box border */}
          <div className="relative w-full bg-white border border-neutral-200 rounded-none select-text overflow-hidden shadow-none">
            {/* Document Header Section with full-width bottom border */}
            <header className="p-6 sm:p-8 md:p-10 pb-6 sm:pb-8 border-b border-neutral-200">
              <div className="flex items-center gap-2 text-xs font-mono font-medium text-neutral-500 uppercase tracking-widest mb-2.5">
                <ShieldCheck className="w-4 h-4 text-black shrink-0" />
                <span>Binding Legal Agreement</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-neutral-950 uppercase tracking-tight">
                Terms &amp; Conditions
              </h1>
              <p className="text-neutral-600 font-medium text-xs sm:text-sm mt-2 leading-relaxed">
                Official student enrollment agreement, platform licensing rules, and industrial engineering safety protocols.
              </p>
              <div className="-mx-6 sm:-mx-8 md:-mx-10 px-6 sm:px-8 md:px-10 pt-4 mt-4 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs font-mono text-neutral-500">
                <span>Jurisdiction: {siteConfig.contact.jurisdiction}</span>
                <span>Updated: October 2026</span>
              </div>
            </header>

            {/* Policy Body */}
            <div className="p-6 sm:p-8 md:p-10 space-y-8 text-neutral-800 text-xs sm:text-sm leading-relaxed">
              <section className="space-y-2">
                <h2 className="text-sm sm:text-base font-bold text-neutral-950 flex items-center gap-2">
                  <span className="text-black font-mono font-bold">01.</span> Acceptance of Terms
                </h2>
                <p className="text-neutral-600 leading-relaxed">
                  By registering for an account or enrolling in courses provided by{' '}
                  <strong className="text-neutral-950">{siteConfig.brandName}</strong> (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;),
                  you agree to be legally bound by these Terms and Conditions. If you do not agree to these terms, please do not purchase or access the course curriculum.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-sm sm:text-base font-bold text-neutral-950 flex items-center gap-2">
                  <span className="text-black font-mono font-bold">02.</span> Course Access &amp; Validity
                </h2>
                <p className="text-neutral-600 leading-relaxed">
                  Enrolling in the course grants you a single-user, non-exclusive, non-transferable license to stream instructional videos, review hydraulic schematics, and access supplemental reference materials for a period of <strong className="text-neutral-950">365 days (1 year)</strong> from the timestamp of payment confirmation, unless lifetime access was explicitly purchased.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-sm sm:text-base font-bold text-neutral-950 flex items-center gap-2">
                  <span className="text-black font-mono font-bold">03.</span> Anti-Piracy &amp; Dynamic Watermarking
                </h2>
                <p className="text-neutral-600 leading-relaxed">
                  All video lectures are dynamically embedded with cryptographic watermarks displaying the enrolled student&apos;s registered email address and session tokens. Screen-recording, ripping, downloading, sharing credentials, or publicly distributing course materials is strictly prohibited and constitutes a copyright violation punishable under the Indian Copyright Act, 1957.
                </p>
                <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-none space-y-2 text-xs text-neutral-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-black shrink-0" />
                    <span>Single-device concurrent streaming is strictly enforced.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-black shrink-0" />
                    <span>Sharing student login accounts triggers automatic session revocation without refund.</span>
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <h2 className="text-sm sm:text-base font-bold text-neutral-950 flex items-center gap-2">
                  <span className="text-black font-mono font-bold">04.</span> Pricing, Payments &amp; Taxes
                </h2>
                <p className="text-neutral-600 leading-relaxed">
                  All course fees are quoted in Indian Rupees (INR) and are inclusive of Goods and Services Tax (GST) where applicable. Payments are processed securely via RBI-authorized payment aggregators (Razorpay). Valid GST tax invoices are automatically generated upon payment confirmation and remain available for PDF download in your student account dashboard.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-sm sm:text-base font-bold text-neutral-950 flex items-center gap-2">
                  <span className="text-black font-mono font-bold">05.</span> Engineering Safety Protocol
                </h2>
                <div className="p-4 sm:p-5 bg-amber-50 border border-amber-200 rounded-none text-amber-950 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span className="text-xs uppercase tracking-wider font-bold">Safety Compliance Notice</span>
                  </div>
                  <p className="text-xs text-amber-900/90 leading-relaxed">
                    Industrial hydraulic machinery operates under extreme fluid pressures exceeding 200–350 bar. The instructions, schematic circuits, and troubleshooting procedures taught in this course are educational demonstrations. Students and engineers must follow original manufacturer safety manuals, plant isolation (LOTO) protocols, and pressure relief checks before performing live maintenance. We assume no liability for equipment damage or personal injury resulting from improper practical application.
                  </p>
                </div>
              </section>

              <section className="space-y-2">
                <h2 className="text-sm sm:text-base font-bold text-neutral-950 flex items-center gap-2">
                  <span className="text-black font-mono font-bold">06.</span> Contact &amp; Grievance Redressal
                </h2>
                <p className="text-neutral-600 leading-relaxed">
                  For any billing inquiries, account questions, or legal notices, contact our support desk directly at{' '}
                  <a
                    href={`mailto:${siteConfig.supportEmail}`}
                    className="font-bold underline text-black hover:opacity-80"
                  >
                    {siteConfig.supportEmail}
                  </a>{' '}
                  or visit our{' '}
                  <Link href="/contact" className="font-bold underline text-black hover:opacity-80">
                    Contact Support
                  </Link>{' '}
                  page.
                </p>
              </section>
            </div>
          </div>

          {/* Quick Legal Nav below card */}
          <footer className="mt-6 sm:mt-8 pb-4 text-center">
            <nav
              aria-label="Footer Legal Links"
              className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-xs text-neutral-500 mb-2"
            >
              <Link href="/terms" className="text-black font-bold">
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
              © {currentYear} Hydro Basics. All rights reserved.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
