'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { siteConfig } from '../../config/site';
import { RefreshCw, CheckCircle2 } from 'lucide-react';

export default function RefundPage() {
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
                <RefreshCw className="w-4 h-4 text-black shrink-0" />
                <span>100% Engineering Satisfaction Guarantee</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-neutral-950 uppercase tracking-tight">
                Refund Policy
              </h1>
              <p className="text-neutral-600 font-medium text-xs sm:text-sm mt-2 leading-relaxed">
                Fair, transparent 7-day evaluation window, Razorpay settlement guidelines, and zero hidden recurring charges.
              </p>
              <div className="-mx-6 sm:-mx-8 md:-mx-10 px-6 sm:px-8 md:px-10 pt-4 mt-4 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs font-mono text-neutral-500">
                <span>Direct Settlement via Razorpay • 5–7 Business Days</span>
                <span>Updated: October 2026</span>
              </div>
            </header>

            {/* Policy Body */}
            <div className="p-6 sm:p-8 md:p-10 space-y-8 text-neutral-800 text-xs sm:text-sm leading-relaxed">
              <section className="space-y-2">
                <h2 className="text-sm sm:text-base font-bold text-neutral-950 flex items-center gap-2">
                  <span className="text-black font-mono font-bold">01.</span> Free Previews Before Purchase
                </h2>
                <p className="text-neutral-600 leading-relaxed">
                  We provide free, full-length preview video lessons on our homepage for all prospective students. We strongly encourage you to watch the free preview videos, inspect the curriculum syllabus, and verify seamless video streaming on your plant device prior to purchasing enrollment.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-sm sm:text-base font-bold text-neutral-950 flex items-center gap-2">
                  <span className="text-black font-mono font-bold">02.</span> 7-Day Money-Back Evaluation Window
                </h2>
                <p className="text-neutral-600 leading-relaxed">
                  We want you to be completely confident in the practical, industrial value of this training. If you determine that the course does not meet your engineering expectations, you are eligible for a <strong className="text-neutral-950">100% full refund</strong> within <strong className="text-neutral-950">7 calendar days</strong> of purchase, provided:
                </p>
                <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-none space-y-2 text-xs text-neutral-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-black shrink-0" />
                    <span>Your request is received within 7 calendar days of the payment timestamp.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-black shrink-0" />
                    <span>You have watched less than <strong className="text-neutral-950">20% of the total course video curriculum</strong>.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-black shrink-0" />
                    <span>You have not downloaded all supplementary blueprint files or proprietary calculators.</span>
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <h2 className="text-sm sm:text-base font-bold text-neutral-950 flex items-center gap-2">
                  <span className="text-black font-mono font-bold">03.</span> How to Initiate a Refund
                </h2>
                <p className="text-neutral-600 leading-relaxed">
                  To request a refund, simply send an email from your registered account email address to{' '}
                  <a
                    href={`mailto:${siteConfig.supportEmail}`}
                    className="font-bold underline text-black hover:opacity-80"
                  >
                    {siteConfig.supportEmail}
                  </a>{' '}
                  with the subject line: <code className="text-xs font-mono bg-neutral-100 border border-neutral-200 px-1.5 py-0.5 rounded-none text-neutral-900">Refund Request - [Your Order ID]</code>.
                </p>
                <p className="text-xs text-neutral-500">
                  Please include your registered phone number and a short note on how we can improve our curriculum.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-sm sm:text-base font-bold text-neutral-950 flex items-center gap-2">
                  <span className="text-black font-mono font-bold">04.</span> Settlement Timeline &amp; Reversal
                </h2>
                <p className="text-neutral-600 leading-relaxed">
                  Approved refunds are processed immediately through our Razorpay merchant integration. Funds are credited back to your original payment source (Bank Account, Credit/Debit Card, or UPI handle) within <strong className="text-neutral-950">5 to 7 business days</strong> according to banking clearing cycles.
                </p>
                <p className="text-xs text-neutral-500">
                  Upon refund execution, your course license will be automatically revoked and a GST credit note will be issued against the initial tax invoice.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-sm sm:text-base font-bold text-neutral-950 flex items-center gap-2">
                  <span className="text-black font-mono font-bold">05.</span> No Recurring Subscriptions or Hidden Charges
                </h2>
                <p className="text-neutral-600 leading-relaxed">
                  Course enrollment is strictly a single, one-time payment providing 365 days of streaming access. We do NOT maintain auto-debits, recurring subscriptions, or surprise renewal fees. You remain in complete control of your payment transactions.
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
              <Link href="/terms" className="hover:text-black transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-black transition-colors">
                Privacy
              </Link>
              <Link href="/refunds" className="text-black font-bold">
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
