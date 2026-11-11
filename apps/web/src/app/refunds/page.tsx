'use client';

import React from 'react';
import Link from 'next/link';
import { siteConfig } from '../../config/site';
import { useAuth } from '../../context/auth-context';
import { RefreshCw, CheckCircle2 } from 'lucide-react';

function RefundNavbar() {
  const { isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-neutral-200 select-none">
      <nav
        aria-label="Refund Navigation"
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
              href="/login?redirect=/refunds"
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

function RefundFooter() {
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
      </div>
    </footer>
  );
}

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-white text-neutral-900 font-reddit selection:bg-black selection:text-white flex flex-col justify-between">
      {/* Sticky White Navigation */}
      <RefundNavbar />

      {/* Main Document Content */}
      <main className="w-full max-w-4xl mx-auto px-6 sm:px-8 md:px-12 py-10 sm:py-14 md:py-16 flex-1 select-text">
        {/* Document Header */}
        <header className="mb-10 sm:mb-12 border-b border-neutral-200 pb-8 sm:pb-10">
          <div className="flex items-center gap-2 text-xs font-mono font-medium text-neutral-500 uppercase tracking-widest mb-3">
            <RefreshCw className="w-4 h-4 text-black shrink-0" />
            <span>100% Engineering Satisfaction Guarantee</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-neutral-950 uppercase tracking-tight">
            Refund Policy
          </h1>
          <p className="text-neutral-600 font-medium text-sm sm:text-base mt-3 max-w-2xl leading-relaxed">
            Fair, transparent 7-day evaluation window, Razorpay settlement guidelines, and zero hidden recurring charges.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-6 mt-6 border-t border-neutral-100 text-xs font-mono text-neutral-500">
            <span>Direct Settlement via Razorpay • 5–7 Business Days</span>
            <span>Updated: October 2026</span>
          </div>
        </header>

        {/* Policy Body */}
        <div className="space-y-10 sm:space-y-12 text-neutral-800 text-sm sm:text-[15px] leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 flex items-center gap-2.5">
              <span className="text-black font-mono font-bold">01.</span> Free Previews Before Purchase
            </h2>
            <p className="text-neutral-600 leading-relaxed">
              We provide free, full-length preview video lessons on our homepage for all prospective students. We strongly encourage you to watch the free preview videos, inspect the curriculum syllabus, and verify seamless video streaming on your plant device prior to purchasing enrollment.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 flex items-center gap-2.5">
              <span className="text-black font-mono font-bold">02.</span> 7-Day Money-Back Evaluation Window
            </h2>
            <p className="text-neutral-600 leading-relaxed">
              We want you to be completely confident in the practical, industrial value of this training. If you determine that the course does not meet your engineering expectations, you are eligible for a <strong className="text-neutral-950">100% full refund</strong> within <strong className="text-neutral-950">7 calendar days</strong> of purchase, provided:
            </p>
            <div className="p-5 sm:p-6 bg-neutral-50 border border-neutral-200 rounded-xl space-y-3 text-xs sm:text-sm text-neutral-700">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-black shrink-0" />
                <span>Your request is received within 7 calendar days of the payment timestamp.</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-black shrink-0" />
                <span>You have watched less than <strong className="text-neutral-950">20% of the total course video curriculum</strong>.</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-black shrink-0" />
                <span>You have not downloaded all supplementary blueprint files or proprietary calculators.</span>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 flex items-center gap-2.5">
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
              with the subject line: <code className="text-xs font-mono bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded text-neutral-900">Refund Request - [Your Order ID]</code>.
            </p>
            <p className="text-xs sm:text-sm text-neutral-500">
              Please include your registered phone number and a short note on how we can improve our curriculum.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 flex items-center gap-2.5">
              <span className="text-black font-mono font-bold">04.</span> Settlement Timeline &amp; Reversal
            </h2>
            <p className="text-neutral-600 leading-relaxed">
              Approved refunds are processed immediately through our Razorpay merchant integration. Funds are credited back to your original payment source (Bank Account, Credit/Debit Card, or UPI handle) within <strong className="text-neutral-950">5 to 7 business days</strong> according to banking clearing cycles.
            </p>
            <p className="text-xs sm:text-sm text-neutral-500">
              Upon refund execution, your course license will be automatically revoked and a GST credit note will be issued against the initial tax invoice.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 flex items-center gap-2.5">
              <span className="text-black font-mono font-bold">05.</span> No Recurring Subscriptions or Hidden Charges
            </h2>
            <p className="text-neutral-600 leading-relaxed">
              Course enrollment is strictly a single, one-time payment providing 365 days of streaming access. We do NOT maintain auto-debits, recurring subscriptions, or surprise renewal fees. You remain in complete control of your payment transactions.
            </p>
          </section>
        </div>
      </main>

      {/* Clean White Minimal Footer */}
      <RefundFooter />
    </div>
  );
}
