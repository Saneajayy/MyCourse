'use client';

import React from 'react';
import Link from 'next/link';
import { siteConfig } from '../../config/site';
import { useAuth } from '../../context/auth-context';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import { LandingFooter } from '../../components/landing/LandingFooter';

function TermsNavbar() {
  const { isAuthenticated } = useAuth();

  return (
    <header className="fixed top-0 inset-x-0 z-50 w-full figma-glass-nav font-reddit select-none">
      <nav
        aria-label="Terms Navigation"
        className="w-full h-20 md:h-[84px] flex items-stretch justify-between"
      >
        {/* Left Side: Brand Logo + Back to Course Link */}
        <div className="flex items-center pl-8 sm:pl-12 md:pl-16 lg:pl-20 xl:pl-24 gap-6 sm:gap-8 lg:gap-10">
          <Link
            href="/"
            className="flex flex-col justify-center -space-y-0.5 leading-[0.92] text-white hover:opacity-90 transition-opacity"
            aria-label="HYDRO BASICS Home"
          >
            <span className="font-extrabold text-[20px] tracking-[0.02em] uppercase leading-[0.92]">
              HYDRO
            </span>
            <span className="font-extrabold text-[20px] tracking-[0.02em] uppercase leading-[0.92]">
              BASICS
            </span>
          </Link>

          <Link
            href="/"
            className="text-white/80 hover:text-white font-semibold text-sm sm:text-base tracking-normal transition-colors py-2 flex items-center gap-2"
          >
            <span aria-hidden="true">&larr;</span> Back to Course
          </Link>
        </div>

        {/* Right Side: Account / Login Cell */}
        <div className="flex items-stretch">
          <div className="figma-glass-divider border-r border-white/20 h-full flex items-stretch">
            {isAuthenticated ? (
              <Link
                href="/my-courses"
                className="h-full flex items-center justify-center px-6 sm:px-8 lg:px-10 text-white font-semibold text-[15px] sm:text-[16px] xl:text-[17px] tracking-normal hover:bg-white/10 active:bg-white/15 transition-all whitespace-nowrap"
              >
                My Courses
              </Link>
            ) : (
              <Link
                href="/login?redirect=/terms"
                className="h-full flex items-center justify-center px-6 sm:px-8 lg:px-10 text-white font-semibold text-[15px] sm:text-[16px] xl:text-[17px] tracking-normal hover:bg-white/10 active:bg-white/15 transition-all whitespace-nowrap"
              >
                Log In
              </Link>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}

export default function TermsPage() {
  return (
    <div className="bg-black min-h-screen text-white font-reddit relative selection:bg-white selection:text-black overflow-x-hidden pt-20 md:pt-[84px] flex flex-col justify-between">
      {/* Background Noise Texture */}
      <div className="noise-texture" aria-hidden="true" />

      {/* Floating Glass Navigation */}
      <TermsNavbar />

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 w-full max-w-[1240px] mx-auto py-10 sm:py-14 md:py-16 pb-16 sm:pb-24 pl-8 sm:pl-12 md:pl-16 lg:pl-20 xl:pl-24 pr-6 sm:pr-8 md:pr-12 lg:pr-16">
        {/* Header Block */}
        <div className="mb-8 sm:mb-12 select-none">
          <h1 className="font-extrabold text-white uppercase leading-[0.88] tracking-[-0.02em] text-4xl sm:text-5xl md:text-6xl lg:text-[68px] select-none">
            <span className="block">TERMS &amp;</span>
            <span className="block">CONDITIONS.</span>
          </h1>
          <p className="text-white/70 font-medium text-xs sm:text-sm md:text-base mt-3 max-w-xl">
            Official student enrollment agreement, platform licensing rules, and industrial engineering safety protocols.
          </p>
        </div>

        {/* Minimal Policy Card Container */}
        <div className="bg-white border border-neutral-200/80 rounded-xl sm:rounded-2xl overflow-hidden shadow-none select-text">
          {/* Header Bar with continuous edge-to-edge dividing line */}
          <div className="px-6 sm:px-8 md:px-10 py-4.5 sm:py-5 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3 bg-neutral-50/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-900 block">
                  Binding Legal Agreement
                </span>
                <span className="text-[11px] text-neutral-500 font-medium">
                  Jurisdiction: {siteConfig.contact.jurisdiction}
                </span>
              </div>
            </div>
            <div className="text-xs font-mono font-medium text-neutral-600 bg-white border border-neutral-200 px-3 py-1.5 rounded-md">
              Last Updated: October 2026
            </div>
          </div>

          {/* Card Body */}
          <div className="p-6 sm:p-8 md:p-10 lg:p-12 space-y-8 text-neutral-800 text-sm sm:text-[15px] leading-relaxed">
            <section className="space-y-2.5">
              <h2 className="text-base sm:text-lg font-bold text-neutral-950 flex items-center gap-2">
                <span className="text-black font-mono">01.</span> Acceptance of Terms
              </h2>
              <p>
                By registering for an account or enrolling in courses provided by{' '}
                <strong className="text-neutral-950">{siteConfig.brandName}</strong> (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;),
                you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not purchase or access the course curriculum.
              </p>
            </section>

            <section className="space-y-2.5">
              <h2 className="text-base sm:text-lg font-bold text-neutral-950 flex items-center gap-2">
                <span className="text-black font-mono">02.</span> Course Access &amp; Validity
              </h2>
              <p>
                Enrolling in the course grants you a single-user, non-exclusive, non-transferable license to stream instructional videos, review hydraulic schematics, and access supplemental reference materials for a period of <strong className="text-neutral-950">365 days (1 year)</strong> from the timestamp of payment confirmation, unless lifetime access was explicitly purchased.
              </p>
            </section>

            <section className="space-y-2.5">
              <h2 className="text-base sm:text-lg font-bold text-neutral-950 flex items-center gap-2">
                <span className="text-black font-mono">03.</span> Anti-Piracy &amp; Dynamic Watermarking
              </h2>
              <p>
                All video lectures are dynamically embedded with cryptographic watermarks displaying the enrolled student&apos;s registered email address and session tokens. Screen-recording, ripping, downloading, sharing credentials, or publicly distributing course materials is strictly prohibited and constitutes a copyright violation punishable under the Indian Copyright Act, 1957.
              </p>
              <p>
                Single-device concurrent streaming is strictly enforced. Sharing student login accounts will trigger automatic session revocation or permanent account ban without refund.
              </p>
            </section>

            <section className="space-y-2.5">
              <h2 className="text-base sm:text-lg font-bold text-neutral-950 flex items-center gap-2">
                <span className="text-black font-mono">04.</span> Pricing, Payments &amp; Taxes
              </h2>
              <p>
                All course fees are quoted in Indian Rupees (INR) and are inclusive of Goods and Services Tax (GST) where applicable. Payments are processed securely via RBI-authorized payment aggregators (Razorpay). Valid GST tax invoices are automatically generated upon payment confirmation and remain available for PDF download in your student account dashboard.
              </p>
            </section>

            <section className="space-y-2.5">
              <div className="p-4 sm:p-5 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-neutral-950 text-sm sm:text-base">
                  <AlertTriangle className="w-4 h-4 text-neutral-900 shrink-0" />
                  <h3>05. Engineering Safety Disclaimer</h3>
                </div>
                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                  Industrial hydraulic machinery operates under extreme fluid pressures exceeding 200–350 bar. The instructions, schematic circuits, and troubleshooting procedures taught in this course are educational demonstrations. Students and engineers must follow original manufacturer safety manuals, plant isolation (LOTO) protocols, and pressure relief checks before performing live maintenance. We assume no liability for equipment damage or personal injury resulting from improper practical application.
                </p>
              </div>
            </section>

            <section className="space-y-2.5">
              <h2 className="text-base sm:text-lg font-bold text-neutral-950 flex items-center gap-2">
                <span className="text-black font-mono">06.</span> Contact &amp; Grievance Redressal
              </h2>
              <p>
                For any billing inquiries, account questions, or legal notices, contact our support desk directly at{' '}
                <a
                  href={`mailto:${siteConfig.supportEmail}`}
                  className="font-bold underline text-black hover:underline"
                >
                  {siteConfig.supportEmail}
                </a>{' '}
                or visit our{' '}
                <Link href="/contact" className="font-bold underline text-black hover:underline">
                  Contact Support
                </Link>{' '}
                page.
              </p>
            </section>
          </div>
        </div>
      </main>

      {/* Signature Landing Footer */}
      <LandingFooter showQuickLinks={true} />
    </div>
  );
}
