'use client';

import React from 'react';
import Link from 'next/link';
import { siteConfig } from '../../config/site';
import { useAuth } from '../../context/auth-context';
import { Lock, ShieldCheck, CreditCard, Server } from 'lucide-react';

function PrivacyNavbar() {
  const { isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-neutral-200 select-none">
      <nav
        aria-label="Privacy Navigation"
        className="w-full max-w-5xl mx-auto h-16 sm:h-20 px-6 sm:px-8 md:px-12 flex items-center justify-between"
      >
        {/* Left Side: Brand Logo + Back to Course Link */}
        <div className="flex items-center gap-5 sm:gap-7">
          <Link
            href="/"
            className="flex flex-col justify-center -space-y-0.5 leading-[0.92] text-black hover:opacity-80 transition-opacity"
            aria-label="HYDRO BASICS Home"
          >
            <span className="font-extrabold text-[18px] sm:text-[20px] tracking-[0.02em] uppercase leading-[0.92]">
              HYDRO
            </span>
            <span className="font-extrabold text-[18px] sm:text-[20px] tracking-[0.02em] uppercase leading-[0.92]">
              BASICS
            </span>
          </Link>

          <div className="h-5 w-px bg-neutral-200" aria-hidden="true" />

          <Link
            href="/"
            className="text-neutral-600 hover:text-black font-semibold text-xs sm:text-sm tracking-normal transition-colors py-2 flex items-center gap-1.5"
          >
            <span aria-hidden="true">&larr;</span> Back to Course
          </Link>
        </div>

        {/* Right Side: Account / Login */}
        <div className="flex items-center">
          {isAuthenticated ? (
            <Link
              href="/my-courses"
              className="text-xs sm:text-sm font-bold text-neutral-900 hover:text-black px-3.5 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
            >
              My Courses
            </Link>
          ) : (
            <Link
              href="/login?redirect=/privacy"
              className="text-xs sm:text-sm font-bold text-neutral-900 hover:text-black px-3.5 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
            >
              Log In
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}

function PrivacyFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-neutral-200 bg-white select-none py-10 sm:py-12 mt-16 sm:mt-24">
      <div className="w-full max-w-5xl mx-auto px-6 sm:px-8 md:px-12 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left">
          <Link
            href="/"
            className="flex flex-col -space-y-0.5 leading-[0.92] text-black hover:opacity-80 transition-opacity"
            aria-label="HYDRO BASICS Home"
          >
            <span className="font-extrabold text-[16px] tracking-[0.02em] uppercase leading-[0.92]">
              HYDRO
            </span>
            <span className="font-extrabold text-[16px] tracking-[0.02em] uppercase leading-[0.92]">
              BASICS
            </span>
          </Link>
          <span className="hidden sm:inline text-neutral-300">|</span>
          <p className="text-xs text-neutral-500">
            © {currentYear} Hydro Basics. Industrial Hydraulic Engineering Masterclass.
          </p>
        </div>

        <nav
          aria-label="Footer Legal Links"
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-semibold text-neutral-600"
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
      </div>
    </footer>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-neutral-900 font-reddit selection:bg-black selection:text-white flex flex-col justify-between">
      {/* Sticky White Navigation */}
      <PrivacyNavbar />

      {/* Main Document Content */}
      <main className="w-full max-w-4xl mx-auto px-6 sm:px-8 md:px-12 py-10 sm:py-14 md:py-16 flex-1 select-text">
        {/* Document Header */}
        <header className="mb-10 sm:mb-12 border-b border-neutral-200 pb-8 sm:pb-10">
          <div className="flex items-center gap-2 text-xs font-mono font-medium text-neutral-500 uppercase tracking-widest mb-3">
            <Lock className="w-4 h-4 text-black shrink-0" />
            <span>Data Protection &amp; Security Architecture</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-neutral-950 uppercase tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-neutral-600 font-medium text-sm sm:text-base mt-3 max-w-2xl leading-relaxed">
            Data protection architecture, cryptographic session handling, and student privacy rights under Indian IT regulations.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-6 mt-6 border-t border-neutral-100 text-xs font-mono text-neutral-500">
            <span>Compliant with DPDP Act 2023 &amp; IT Rules</span>
            <span>Updated: October 2026</span>
          </div>
        </header>

        {/* Policy Body */}
        <div className="space-y-10 sm:space-y-12 text-neutral-800 text-sm sm:text-[15px] leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 flex items-center gap-2.5">
              <span className="text-black font-mono font-bold">01.</span> Information We Collect
            </h2>
            <p className="text-neutral-600 leading-relaxed">
              When you register for an account, enroll in courses, or stream instructional videos, we collect only the information necessary to provide authentication, tax invoicing, and course delivery:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 sm:p-5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1.5 shadow-none">
                <div className="flex items-center gap-2 text-neutral-950 font-bold text-xs uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-black shrink-0" />
                  <span>Account Credentials</span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Full student name, registered email address, phone number, and password hashes encrypted via argon2id.
                </p>
              </div>

              <div className="p-4 sm:p-5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1.5 shadow-none">
                <div className="flex items-center gap-2 text-neutral-950 font-bold text-xs uppercase tracking-wider">
                  <CreditCard className="w-4 h-4 text-black shrink-0" />
                  <span>Billing &amp; Tax Data</span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Name, transaction amount, and optional GSTIN provided for official tax invoice generation.
                </p>
              </div>

              <div className="p-4 sm:p-5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1.5 shadow-none">
                <div className="flex items-center gap-2 text-neutral-950 font-bold text-xs uppercase tracking-wider">
                  <Server className="w-4 h-4 text-black shrink-0" />
                  <span>Telemetry &amp; DRM</span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  IP address, device browser agent, and playback timestamps to enforce single-stream security and resume points.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 flex items-center gap-2.5">
              <span className="text-black font-mono font-bold">02.</span> Payment Security &amp; Zero Card Storage
            </h2>
            <p className="text-neutral-600 leading-relaxed">
              We strictly do <strong className="text-neutral-950">NOT</strong> store, process, or transmit your credit/debit card numbers, CVVs, netbanking credentials, or UPI PINs on our servers. All financial transactions are processed directly by RBI-regulated, PCI-DSS Level 1 compliant payment aggregators (Razorpay Software Private Limited).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 flex items-center gap-2.5">
              <span className="text-black font-mono font-bold">03.</span> Cookie &amp; Storage Architecture
            </h2>
            <p className="text-neutral-600 leading-relaxed">
              In strict accordance with enterprise security practices, student session access tokens are maintained in volatile browser memory only and are never exposed to browser <code className="text-xs font-mono bg-neutral-100 border border-neutral-200 px-1.5 py-0.5 rounded text-neutral-900">localStorage</code>. Refresh tokens are secured in encrypted <code className="text-xs font-mono bg-neutral-100 border border-neutral-200 px-1.5 py-0.5 rounded text-neutral-900">httpOnly</code> cookies protected by <code className="text-xs font-mono bg-neutral-100 border border-neutral-200 px-1.5 py-0.5 rounded text-neutral-900">SameSite=Lax</code> policies to completely neutralize Cross-Site Scripting (XSS) risks.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 flex items-center gap-2.5">
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
      </main>

      {/* Clean White Minimal Footer */}
      <PrivacyFooter />
    </div>
  );
}
