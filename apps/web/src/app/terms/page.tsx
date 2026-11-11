'use client';

import React from 'react';
import Link from 'next/link';
import { siteConfig } from '../../config/site';
import { useAuth } from '../../context/auth-context';
import { ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';

function TermsNavbar() {
  const { isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-neutral-200 select-none">
      <nav
        aria-label="Terms Navigation"
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
              href="/login?redirect=/terms"
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

function TermsFooter() {
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
      </div>
    </footer>
  );
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white text-neutral-900 font-reddit selection:bg-black selection:text-white flex flex-col justify-between">
      {/* Sticky White Navigation */}
      <TermsNavbar />

      {/* Main Document Content */}
      <main className="w-full max-w-4xl mx-auto px-6 sm:px-8 md:px-12 py-10 sm:py-14 md:py-16 flex-1 select-text">
        {/* Document Header */}
        <header className="mb-10 sm:mb-12 border-b border-neutral-200 pb-8 sm:pb-10">
          <div className="flex items-center gap-2 text-xs font-mono font-medium text-neutral-500 uppercase tracking-widest mb-3">
            <ShieldCheck className="w-4 h-4 text-black shrink-0" />
            <span>Binding Legal Agreement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-neutral-950 uppercase tracking-tight">
            Terms &amp; Conditions
          </h1>
          <p className="text-neutral-600 font-medium text-sm sm:text-base mt-3 max-w-2xl leading-relaxed">
            Official student enrollment agreement, platform licensing rules, and industrial engineering safety protocols.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-6 mt-6 border-t border-neutral-100 text-xs font-mono text-neutral-500">
            <span>Jurisdiction: {siteConfig.contact.jurisdiction}</span>
            <span>Updated: October 2026</span>
          </div>
        </header>

        {/* Policy Body */}
        <div className="space-y-10 sm:space-y-12 text-neutral-800 text-sm sm:text-[15px] leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 flex items-center gap-2.5">
              <span className="text-black font-mono font-bold">01.</span> Acceptance of Terms
            </h2>
            <p className="text-neutral-600 leading-relaxed">
              By registering for an account or enrolling in courses provided by{' '}
              <strong className="text-neutral-950">{siteConfig.brandName}</strong> (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;),
              you agree to be legally bound by these Terms and Conditions. If you do not agree to these terms, please do not purchase or access the course curriculum.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 flex items-center gap-2.5">
              <span className="text-black font-mono font-bold">02.</span> Course Access &amp; Validity
            </h2>
            <p className="text-neutral-600 leading-relaxed">
              Enrolling in the course grants you a single-user, non-exclusive, non-transferable license to stream instructional videos, review hydraulic schematics, and access supplemental reference materials for a period of <strong className="text-neutral-950">365 days (1 year)</strong> from the timestamp of payment confirmation, unless lifetime access was explicitly purchased.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 flex items-center gap-2.5">
              <span className="text-black font-mono font-bold">03.</span> Anti-Piracy &amp; Dynamic Watermarking
            </h2>
            <p className="text-neutral-600 leading-relaxed">
              All video lectures are dynamically embedded with cryptographic watermarks displaying the enrolled student&apos;s registered email address and session tokens. Screen-recording, ripping, downloading, sharing credentials, or publicly distributing course materials is strictly prohibited and constitutes a copyright violation punishable under the Indian Copyright Act, 1957.
            </p>
            <div className="p-5 sm:p-6 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2.5 text-xs sm:text-sm text-neutral-700">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-black shrink-0" />
                <span>Single-device concurrent streaming is strictly enforced.</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-black shrink-0" />
                <span>Sharing student login accounts triggers automatic session revocation without refund.</span>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 flex items-center gap-2.5">
              <span className="text-black font-mono font-bold">04.</span> Pricing, Payments &amp; Taxes
            </h2>
            <p className="text-neutral-600 leading-relaxed">
              All course fees are quoted in Indian Rupees (INR) and are inclusive of Goods and Services Tax (GST) where applicable. Payments are processed securely via RBI-authorized payment aggregators (Razorpay). Valid GST tax invoices are automatically generated upon payment confirmation and remain available for PDF download in your student account dashboard.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 flex items-center gap-2.5">
              <span className="text-black font-mono font-bold">05.</span> Engineering Safety Protocol
            </h2>
            <div className="p-5 sm:p-6 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="text-xs sm:text-sm uppercase tracking-wider font-bold">Safety Compliance Notice</span>
              </div>
              <p className="text-xs sm:text-sm text-amber-900/90 leading-relaxed">
                Industrial hydraulic machinery operates under extreme fluid pressures exceeding 200–350 bar. The instructions, schematic circuits, and troubleshooting procedures taught in this course are educational demonstrations. Students and engineers must follow original manufacturer safety manuals, plant isolation (LOTO) protocols, and pressure relief checks before performing live maintenance. We assume no liability for equipment damage or personal injury resulting from improper practical application.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 flex items-center gap-2.5">
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
      </main>

      {/* Clean White Minimal Footer */}
      <TermsFooter />
    </div>
  );
}
