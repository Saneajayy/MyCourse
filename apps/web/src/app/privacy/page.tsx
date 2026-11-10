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

      {/* SVG Deckled Edge Filter */}
      <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
        <defs>
          <filter
            id="figma-texture-privacy"
            x="-10%"
            y="-15%"
            width="120%"
            height="130%"
            filterUnits="objectBoundingBox"
            primitiveUnits="userSpaceOnUse"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.25"
              numOctaves="3"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="5.5"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 w-full max-w-[1240px] mx-auto py-10 sm:py-14 md:py-16 pb-16 sm:pb-24 pl-8 sm:pl-12 md:pl-16 lg:pl-20 xl:pl-24 pr-6 sm:pr-8 md:pr-12 lg:pr-16">
        {/* Header Block: Exact landing page title scale & typography */}
        <div className="mb-10 sm:mb-14 select-none">
          <h1 className="font-extrabold text-white uppercase leading-[0.88] tracking-[-0.02em] text-5xl sm:text-6xl md:text-7xl lg:text-[76px] xl:text-[84px] select-none">
            <span className="block">PRIVACY</span>
            <span className="block">POLICY.</span>
          </h1>
          <p className="text-white/80 font-medium text-sm sm:text-base md:text-lg mt-3 max-w-xl">
            Data protection architecture, cryptographic session handling, and student privacy rights under Indian IT regulations.
          </p>
        </div>

        {/* Master Deckled Paper Card Container */}
        <div className="relative w-full p-8 sm:p-10 md:p-12 lg:p-14 select-none drop-shadow-[0_20px_35px_rgba(0,0,60,0.35)]">
          {/* Textured White Card Background via SVG Filter */}
          <div className="absolute inset-0 pointer-events-none overflow-visible">
            <svg className="w-full h-full overflow-visible" xmlns="http://www.w3.org/2000/svg">
              <rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                rx="5.1"
                ry="5.1"
                fill="white"
                filter="url(#figma-texture-privacy)"
              />
            </svg>
          </div>

          {/* Card Content */}
          <div className="relative z-10 w-full text-neutral-900 space-y-8 select-text">
            {/* Meta Timestamp Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white shrink-0 shadow-sm">
                  <Lock className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-black">
                  Data Protection &amp; Security Architecture
                </span>
              </div>
              <div className="text-xs font-mono text-neutral-500">
                Effective: October 2026 • DPDP Act Compliant
              </div>
            </div>

            {/* Privacy Sections */}
            <div className="space-y-8 text-sm sm:text-base text-neutral-800 leading-relaxed">
              <section className="space-y-2.5">
                <h2 className="text-lg sm:text-xl font-bold text-neutral-950 flex items-center gap-2">
                  <span className="text-black font-mono">01.</span> Information We Collect
                </h2>
                <p>
                  When you register for an account, enroll in courses, or stream instructional videos, we collect only the information necessary to provide authentication, tax invoicing, and course delivery:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-md">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-900 mb-1">
                      Account Credentials
                    </h3>
                    <p className="text-xs text-neutral-600 leading-relaxed">
                      Full student name, registered email address, phone number, and password hashes encrypted via argon2id.
                    </p>
                  </div>
                  <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-md">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-900 mb-1">
                      Billing &amp; Tax Data
                    </h3>
                    <p className="text-xs text-neutral-600 leading-relaxed">
                      Name, transaction amount, and optional GSTIN provided for official tax invoice generation.
                    </p>
                  </div>
                  <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-md">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-900 mb-1">
                      Telemetry &amp; DRM
                    </h3>
                    <p className="text-xs text-neutral-600 leading-relaxed">
                      IP address, device browser agent, and playback timestamps to enforce single-stream security and resume points.
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-2.5">
                <h2 className="text-lg sm:text-xl font-bold text-neutral-950 flex items-center gap-2">
                  <span className="text-black font-mono">02.</span> Payment Security &amp; Zero Card Storage
                </h2>
                <p>
                  We strictly do NOT store, process, or transmit your credit/debit card numbers, CVVs, netbanking credentials, or UPI PINs on our servers. All financial transactions are processed directly by RBI-regulated, PCI-DSS Level 1 compliant payment aggregators (Razorpay Software Private Limited).
                </p>
              </section>

              <section className="space-y-2.5">
                <h2 className="text-lg sm:text-xl font-bold text-neutral-950 flex items-center gap-2">
                  <span className="text-black font-mono">03.</span> Cookie &amp; Storage Architecture
                </h2>
                <p>
                  In strict accordance with enterprise security practices (ADR 001), student session access tokens are maintained in volatile browser memory only and are never exposed to browser <code className="text-xs font-mono bg-neutral-100 px-1.5 py-0.5 rounded">localStorage</code>. Refresh tokens are secured in encrypted <code className="text-xs font-mono bg-neutral-100 px-1.5 py-0.5 rounded">httpOnly</code> cookies protected by <code className="text-xs font-mono bg-neutral-100 px-1.5 py-0.5 rounded">SameSite=Lax</code> policies to completely neutralize Cross-Site Scripting (XSS) risks.
                </p>
              </section>

              <section className="space-y-2.5">
                <h2 className="text-lg sm:text-xl font-bold text-neutral-950 flex items-center gap-2">
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
        </div>
      </main>

      {/* Signature Landing Footer */}
      <LandingFooter showQuickLinks={true} />
    </div>
  );
}
