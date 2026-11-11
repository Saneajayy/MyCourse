'use client';

import React from 'react';
import Link from 'next/link';
import { siteConfig } from '../../config/site';
import { useAuth } from '../../context/auth-context';
import { RefreshCw, CheckCircle2 } from 'lucide-react';
import { LandingFooter } from '../../components/landing/LandingFooter';

function RefundNavbar() {
  const { isAuthenticated } = useAuth();

  return (
    <header className="fixed top-0 inset-x-0 z-50 w-full figma-glass-nav font-reddit select-none">
      <nav
        aria-label="Refund Navigation"
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
                href="/login?redirect=/refunds"
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

export default function RefundPage() {
  return (
    <div className="bg-black min-h-screen text-white font-reddit relative selection:bg-white selection:text-black overflow-x-hidden pt-20 md:pt-[84px] flex flex-col justify-between">
      {/* Background Noise Texture */}
      <div className="noise-texture" aria-hidden="true" />

      {/* Floating Glass Navigation */}
      <RefundNavbar />

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 w-full max-w-[1240px] mx-auto py-10 sm:py-14 md:py-16 pb-16 sm:pb-24 pl-8 sm:pl-12 md:pl-16 lg:pl-20 xl:pl-24 pr-6 sm:pr-8 md:pr-12 lg:pr-16">
        {/* Header Block */}
        <div className="mb-8 sm:mb-12 select-none">
          <h1 className="font-extrabold text-white uppercase leading-[0.88] tracking-[-0.02em] text-4xl sm:text-5xl md:text-6xl lg:text-[68px] select-none">
            <span className="block">REFUND</span>
            <span className="block">POLICY.</span>
          </h1>
          <p className="text-white/70 font-medium text-xs sm:text-sm md:text-base mt-3 max-w-xl">
            Fair, transparent 7-day evaluation window, Razorpay settlement guidelines, and zero hidden recurring charges.
          </p>
        </div>

        {/* Minimal Policy Card Container */}
        <div className="bg-white border border-neutral-200/80 rounded-xl sm:rounded-2xl overflow-hidden shadow-none select-text">
          {/* Header Bar with continuous edge-to-edge dividing line */}
          <div className="px-6 sm:px-8 md:px-10 py-4.5 sm:py-5 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3 bg-neutral-50/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white shrink-0">
                <RefreshCw className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-900 block">
                  100% Engineering Satisfaction Guarantee
                </span>
                <span className="text-[11px] text-neutral-500 font-medium">
                  Direct Settlement via Razorpay • 5–7 Business Days
                </span>
              </div>
            </div>
            <div className="text-xs font-mono font-medium text-neutral-600 bg-white border border-neutral-200 px-3 py-1.5 rounded-md">
              Updated: October 2026
            </div>
          </div>

          {/* Card Body */}
          <div className="p-6 sm:p-8 md:p-10 lg:p-12 space-y-8 text-neutral-800 text-sm sm:text-[15px] leading-relaxed">
            <section className="space-y-2.5">
              <h2 className="text-base sm:text-lg font-bold text-neutral-950 flex items-center gap-2">
                <span className="text-black font-mono">01.</span> Free Previews Before Purchase
              </h2>
              <p>
                We provide free, full-length preview video lessons on our homepage for all prospective students. We strongly encourage you to watch the free preview videos, inspect the curriculum syllabus, and verify seamless video streaming on your plant device prior to purchasing enrollment.
              </p>
            </section>

            <section className="space-y-2.5">
              <h2 className="text-base sm:text-lg font-bold text-neutral-950 flex items-center gap-2">
                <span className="text-black font-mono">02.</span> 7-Day Money-Back Evaluation Window
              </h2>
              <p>
                We want you to be completely confident in the practical, industrial value of this training. If you determine that the course does not meet your engineering expectations, you are eligible for a <strong className="text-neutral-950">100% full refund</strong> within <strong className="text-neutral-950">7 calendar days</strong> of purchase, provided:
              </p>
              <div className="p-4 sm:p-5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2.5 text-xs sm:text-sm text-neutral-700">
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

            <section className="space-y-2.5">
              <h2 className="text-base sm:text-lg font-bold text-neutral-950 flex items-center gap-2">
                <span className="text-black font-mono">03.</span> How to Initiate a Refund
              </h2>
              <p>
                To request a refund, simply send an email from your registered account email address to{' '}
                <a
                  href={`mailto:${siteConfig.supportEmail}`}
                  className="font-bold underline text-black hover:underline"
                >
                  {siteConfig.supportEmail}
                </a>{' '}
                with the subject line: <code className="text-xs font-mono bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded text-neutral-900">Refund Request - [Your Order ID]</code>.
              </p>
              <p className="text-xs sm:text-sm text-neutral-600">
                Please include your registered phone number and a short note on how we can improve our curriculum.
              </p>
            </section>

            <section className="space-y-2.5">
              <h2 className="text-base sm:text-lg font-bold text-neutral-950 flex items-center gap-2">
                <span className="text-black font-mono">04.</span> Settlement Timeline &amp; Reversal
              </h2>
              <p>
                Approved refunds are processed immediately through our Razorpay merchant integration. Funds are credited back to your original payment source (Bank Account, Credit/Debit Card, or UPI handle) within <strong className="text-neutral-950">5 to 7 business days</strong> according to banking clearing cycles.
              </p>
              <p className="text-xs sm:text-sm text-neutral-600">
                Upon refund execution, your course license will be automatically revoked and a GST credit note will be issued against the initial tax invoice.
              </p>
            </section>

            <section className="space-y-2.5">
              <h2 className="text-base sm:text-lg font-bold text-neutral-950 flex items-center gap-2">
                <span className="text-black font-mono">05.</span> No Recurring Subscriptions or Hidden Charges
              </h2>
              <p>
                Course enrollment is strictly a single, one-time payment providing 365 days of streaming access. We do NOT maintain auto-debits, recurring subscriptions, or surprise renewal fees. You remain in complete control of your payment transactions.
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
