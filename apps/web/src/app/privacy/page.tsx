'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { siteConfig } from '../../config/site';
import { Lock, ShieldCheck, CreditCard, Server } from 'lucide-react';

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
          <div className="relative w-full bg-white border border-neutral-200 rounded-xl sm:rounded-2xl select-text overflow-hidden shadow-none">
            {/* Document Header Section with full-width bottom border */}
            <header className="p-6 sm:p-8 md:p-10 pb-6 sm:pb-8 border-b border-neutral-200">
              <div className="flex items-center gap-2 text-xs font-mono font-medium text-neutral-500 uppercase tracking-widest mb-2.5">
                <Lock className="w-4 h-4 text-black shrink-0" />
                <span>Data Protection &amp; Security Architecture</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-neutral-950 uppercase tracking-tight">
                Privacy Policy
              </h1>
              <p className="text-neutral-600 font-medium text-xs sm:text-sm mt-2 leading-relaxed">
                Data protection architecture, cryptographic session handling, and student privacy rights under Indian IT regulations.
              </p>
              <div className="-mx-6 sm:-mx-8 md:-mx-10 px-6 sm:px-8 md:px-10 pt-4 mt-4 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs font-mono text-neutral-500">
                <span>Compliant with DPDP Act 2023 &amp; IT Rules</span>
                <span>Updated: October 2026</span>
              </div>
            </header>

            {/* Policy Body */}
            <div className="p-6 sm:p-8 md:p-10 space-y-8 text-neutral-800 text-xs sm:text-sm leading-relaxed">
              <section className="space-y-3">
                <h2 className="text-sm sm:text-base font-bold text-neutral-950 flex items-center gap-2">
                  <span className="text-black font-mono font-bold">01.</span> Information We Collect
                </h2>
                <p className="text-neutral-600 leading-relaxed">
                  When you register for an account, enroll in courses, or stream instructional videos, we collect only the information necessary to provide authentication, tax invoicing, and course delivery:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="p-3.5 sm:p-4 bg-neutral-50 border border-neutral-200 rounded-lg space-y-1.5 shadow-none">
                    <div className="flex items-center gap-1.5 text-neutral-950 font-bold text-xs uppercase tracking-wider">
                      <ShieldCheck className="w-3.5 h-3.5 text-black shrink-0" />
                      <span>Account</span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-neutral-600 leading-relaxed">
                      Full student name, registered email, phone number, and argon2id password hashes.
                    </p>
                  </div>

                  <div className="p-3.5 sm:p-4 bg-neutral-50 border border-neutral-200 rounded-lg space-y-1.5 shadow-none">
                    <div className="flex items-center gap-1.5 text-neutral-950 font-bold text-xs uppercase tracking-wider">
                      <CreditCard className="w-3.5 h-3.5 text-black shrink-0" />
                      <span>Billing &amp; Tax</span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-neutral-600 leading-relaxed">
                      Name, transaction amount, and optional GSTIN provided for official tax invoice generation.
                    </p>
                  </div>

                  <div className="p-3.5 sm:p-4 bg-neutral-50 border border-neutral-200 rounded-lg space-y-1.5 shadow-none">
                    <div className="flex items-center gap-1.5 text-neutral-950 font-bold text-xs uppercase tracking-wider">
                      <Server className="w-3.5 h-3.5 text-black shrink-0" />
                      <span>Telemetry</span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-neutral-600 leading-relaxed">
                      IP address, device browser agent, and playback timestamps for DRM security.
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <h2 className="text-sm sm:text-base font-bold text-neutral-950 flex items-center gap-2">
                  <span className="text-black font-mono font-bold">02.</span> Payment Security &amp; Zero Card Storage
                </h2>
                <p className="text-neutral-600 leading-relaxed">
                  We strictly do <strong className="text-neutral-950">NOT</strong> store, process, or transmit your credit/debit card numbers, CVVs, netbanking credentials, or UPI PINs on our servers. All financial transactions are processed directly by RBI-regulated, PCI-DSS Level 1 compliant payment aggregators (Razorpay Software Private Limited).
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-sm sm:text-base font-bold text-neutral-950 flex items-center gap-2">
                  <span className="text-black font-mono font-bold">03.</span> Cookie &amp; Storage Architecture
                </h2>
                <p className="text-neutral-600 leading-relaxed">
                  In strict accordance with enterprise security practices, student session access tokens are maintained in volatile browser memory only and are never exposed to browser <code className="text-xs font-mono bg-neutral-100 border border-neutral-200 px-1.5 py-0.5 rounded text-neutral-900">localStorage</code>. Refresh tokens are secured in encrypted <code className="text-xs font-mono bg-neutral-100 border border-neutral-200 px-1.5 py-0.5 rounded text-neutral-900">httpOnly</code> cookies protected by <code className="text-xs font-mono bg-neutral-100 border border-neutral-200 px-1.5 py-0.5 rounded text-neutral-900">SameSite=Lax</code> policies to completely neutralize Cross-Site Scripting (XSS) risks.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-sm sm:text-base font-bold text-neutral-950 flex items-center gap-2">
                  <span className="text-black font-mono font-bold">04.</span> Student Privacy Rights &amp; Access
                </h2>
                <p className="text-neutral-600 leading-relaxed">
                  You hold full legal rights under the Digital Personal Data Protection (DPDP) Act, 2023 to inspect your stored student profile, download your GST purchase invoices, update contact details, or request permanent account erasure. Inquiries can be submitted directly to our compliance officer at{' '}
                  <a
                    href={`mailto:${siteConfig.supportEmail}`}
                    className="font-bold underline text-black hover:opacity-80"
                  >
                    {siteConfig.supportEmail}
                  </a>{' '}
                  or via our{' '}
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
              © {currentYear} Hydro Basics. All rights reserved.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
