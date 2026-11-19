'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { siteConfig } from '../../config/site';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
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
      <div className="hidden lg:relative lg:flex lg:flex-col lg:w-1/2 h-full bg-[#101012] border border-white/[0.08] rounded-xl overflow-hidden select-none p-6 sm:p-8 shrink-0">
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
      {/* RIGHT CARD: Terms of Service Content                          */}
      {/* ============================================================== */}
      <div className="w-full flex-1 min-h-0 lg:w-1/2 lg:h-full bg-[#101012] border border-white/[0.08] rounded-xl flex flex-col justify-between overflow-y-auto relative p-5 sm:p-7 select-text">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] shrink-0 select-none">
          <Link href="/" className="lg:hidden flex flex-col select-none group" title="HYDRO BASICS Home">
            <span className="font-extrabold text-[15px] text-white leading-[1.05] tracking-wider uppercase">
              HYDRO
            </span>
            <span className="font-extrabold text-[15px] text-white leading-[1.05] tracking-wider uppercase">
              BASICS
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[11px] font-mono tracking-wider text-[#c2c4cc]/70 hover:text-white transition-colors ml-auto"
            title="Back to Course"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Back to Course</span>
          </Link>
        </div>

        {/* Main Content */}
        <div className="my-auto py-5 space-y-4 max-w-xl mx-auto w-full">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Terms of Service
            </h1>
            <p className="text-xs sm:text-sm text-[#c2c4cc] leading-relaxed mt-1">
              Student enrollment agreement, curriculum licensing, and plant safety guidelines.
            </p>
          </div>

          <div className="rounded-lg border border-white/[0.08] bg-[#151619] overflow-hidden divide-y divide-white/[0.06] text-xs sm:text-[13px] text-[#c2c4cc]">
            <div className="p-3.5 sm:p-4">
              <p className="leading-relaxed">
                <span className="font-mono font-semibold text-white/50 mr-2">01.</span>
                <strong className="font-semibold text-white mr-1.5">License &amp; Access:</strong>
                Single-user streaming license valid for 365 days from enrollment; sharing accounts
                or login credentials is strictly prohibited.
              </p>
            </div>

            <div className="p-3.5 sm:p-4">
              <p className="leading-relaxed">
                <span className="font-mono font-semibold text-white/50 mr-2">02.</span>
                <strong className="font-semibold text-white mr-1.5">Anti-Piracy Watermarking:</strong>
                All video lectures carry cryptographic watermarks with your ID; ripping,
                recording, or redistributing materials revokes access immediately.
              </p>
            </div>

            <div className="p-3.5 sm:p-4">
              <p className="leading-relaxed">
                <span className="font-mono font-semibold text-white/50 mr-2">03.</span>
                <strong className="font-semibold text-white mr-1.5">Engineering Safety Notice:</strong>
                Instructional demonstrations only. Plant hydraulic circuits exceed 200 bar—always
                verify OEM manuals and enforce strict LOTO protocols.
              </p>
            </div>

            <div className="p-3.5 sm:p-4">
              <p className="leading-relaxed">
                <span className="font-mono font-semibold text-white/50 mr-2">04.</span>
                <strong className="font-semibold text-white mr-1.5">Payments &amp; Tax Invoices:</strong>
                One-time payment processed securely via Razorpay. GST-compliant tax invoices are
                automatically available for download in your dashboard.
              </p>
            </div>

            <div className="p-3.5 sm:p-4">
              <p className="leading-relaxed">
                <span className="font-mono font-semibold text-white/50 mr-2">05.</span>
                <strong className="font-semibold text-white mr-1.5">Jurisdiction &amp; Inquiries:</strong>
                Governed by the laws of {siteConfig.contact.jurisdiction}. For legal notices or
                enrollment queries, contact{' '}
                <a
                  href={`mailto:${siteConfig.supportEmail}`}
                  className="font-medium underline text-white hover:text-white/80 transition-colors"
                >
                  {siteConfig.supportEmail}
                </a>
                .
              </p>
            </div>

            <div className="px-4 py-2.5 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono text-[#80828d] bg-[#0c0d0e]">
              <span>Jurisdiction: {siteConfig.contact.jurisdiction}</span>
              <span>Updated: 2026</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs select-none shrink-0">
          <nav
            aria-label="Footer Legal Links"
            className="flex items-center gap-4 text-xs"
          >
            <Link href="/terms" className="text-white font-semibold">
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
