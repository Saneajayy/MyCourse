'use client';

import React from 'react';
import Link from 'next/link';
import { siteConfig } from '../../config/site';
import { useAuth } from '../../context/auth-context';
import { Lock } from 'lucide-react';
import { LandingFooter } from '../../components/landing/LandingFooter';

function PrivacyNavbar() {
  const { isAuthenticated } = useAuth();

  return (
    <header className="fixed top-0 inset-x-0 z-50 w-full figma-glass-nav font-reddit select-none">
      <nav
        aria-label="Privacy Navigation"
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
                href="/login?redirect=/privacy"
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

export default function PrivacyPage() {
  return (
    <div className="bg-black min-h-screen text-white font-reddit relative selection:bg-white selection:text-black overflow-x-hidden pt-20 md:pt-[84px] flex flex-col justify-between">
      {/* Background Noise Texture */}
      <div className="noise-texture" aria-hidden="true" />

      {/* Floating Glass Navigation */}
      <PrivacyNavbar />

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 w-full max-w-[1240px] mx-auto py-10 sm:py-14 md:py-16 pb-16 sm:pb-24 pl-8 sm:pl-12 md:pl-16 lg:pl-20 xl:pl-24 pr-6 sm:pr-8 md:pr-12 lg:pr-16">
        {/* Header Block */}
        <div className="mb-8 sm:mb-12 select-none">
          <h1 className="font-extrabold text-white uppercase leading-[0.88] tracking-[-0.02em] text-4xl sm:text-5xl md:text-6xl lg:text-[68px] select-none">
            <span className="block">PRIVACY</span>
            <span className="block">POLICY.</span>
          </h1>
          <p className="text-white/70 font-medium text-xs sm:text-sm md:text-base mt-3 max-w-xl">
            Data protection architecture, cryptographic session handling, and student privacy rights under Indian IT regulations.
          </p>
        </div>

        {/* Minimal Policy Card Container */}
        <div className="bg-white border border-neutral-200/80 rounded-xl sm:rounded-2xl overflow-hidden shadow-none select-text">
          {/* Header Bar with continuous edge-to-edge dividing line */}
          <div className="px-6 sm:px-8 md:px-10 py-4.5 sm:py-5 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3 bg-neutral-50/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-900 block">
                  Data Protection &amp; Security Architecture
                </span>
                <span className="text-[11px] text-neutral-500 font-medium">
                  DPDP Act Compliant • ISO/IEC 27001 Alignment
                </span>
              </div>
            </div>
            <div className="text-xs font-mono font-medium text-neutral-600 bg-white border border-neutral-200 px-3 py-1.5 rounded-md">
              Effective: October 2026
            </div>
          </div>

          {/* Card Body */}
          <div className="p-6 sm:p-8 md:p-10 lg:p-12 space-y-8 text-neutral-800 text-sm sm:text-[15px] leading-relaxed">
            <section className="space-y-2.5">
              <h2 className="text-base sm:text-lg font-bold text-neutral-950 flex items-center gap-2">
                <span className="text-black font-mono">01.</span> Information We Collect
              </h2>
              <p>
                When you register for an account, enroll in courses, or stream instructional videos, we collect only the information necessary to provide authentication, tax invoicing, and course delivery:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-4 sm:p-5 bg-neutral-50 border border-neutral-200 rounded-xl">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-950 mb-1.5">
                    Account Credentials
                  </h3>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Full student name, registered email address, phone number, and password hashes encrypted via argon2id.
                  </p>
                </div>
                <div className="p-4 sm:p-5 bg-neutral-50 border border-neutral-200 rounded-xl">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-950 mb-1.5">
                    Billing &amp; Tax Data
                  </h3>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Name, transaction amount, and optional GSTIN provided for official tax invoice generation.
                  </p>
                </div>
                <div className="p-4 sm:p-5 bg-neutral-50 border border-neutral-200 rounded-xl">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-950 mb-1.5">
                    Telemetry &amp; DRM
                  </h3>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    IP address, device browser agent, and playback timestamps to enforce single-stream security and resume points.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-2.5">
              <h2 className="text-base sm:text-lg font-bold text-neutral-950 flex items-center gap-2">
                <span className="text-black font-mono">02.</span> Payment Security &amp; Zero Card Storage
              </h2>
              <p>
                We strictly do NOT store, process, or transmit your credit/debit card numbers, CVVs, netbanking credentials, or UPI PINs on our servers. All financial transactions are processed directly by RBI-regulated, PCI-DSS Level 1 compliant payment aggregators (Razorpay Software Private Limited).
              </p>
            </section>

            <section className="space-y-2.5">
              <h2 className="text-base sm:text-lg font-bold text-neutral-950 flex items-center gap-2">
                <span className="text-black font-mono">03.</span> Cookie &amp; Storage Architecture
              </h2>
              <p>
                In strict accordance with enterprise security practices (ADR 001), student session access tokens are maintained in volatile browser memory only and are never exposed to browser <code className="text-xs font-mono bg-neutral-100 border border-neutral-200 px-1.5 py-0.5 rounded text-neutral-900">localStorage</code>. Refresh tokens are secured in encrypted <code className="text-xs font-mono bg-neutral-100 border border-neutral-200 px-1.5 py-0.5 rounded text-neutral-900">httpOnly</code> cookies protected by <code className="text-xs font-mono bg-neutral-100 border border-neutral-200 px-1.5 py-0.5 rounded text-neutral-900">SameSite=Lax</code> policies to completely neutralize Cross-Site Scripting (XSS) risks.
              </p>
            </section>

            <section className="space-y-2.5">
              <h2 className="text-base sm:text-lg font-bold text-neutral-950 flex items-center gap-2">
                <span className="text-black font-mono">04.</span> Student Privacy Rights &amp; Access
              </h2>
              <p>
                You hold full legal rights under the Digital Personal Data Protection (DPDP) Act, 2023 to inspect your stored student profile, download your GST purchase invoices, update contact details, or request permanent account erasure. Inquiries can be submitted directly to our compliance officer at{' '}
                <a
                  href={`mailto:${siteConfig.supportEmail}`}
                  className="font-bold underline text-black hover:underline"
                >
                  {siteConfig.supportEmail}
                </a>
                .
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
