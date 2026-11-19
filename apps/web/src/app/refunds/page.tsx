'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { siteConfig } from '../../config/site';

export default function RefundPage() {
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
    <div className="min-h-screen bg-black text-white font-reddit selection:bg-white selection:text-black flex flex-col justify-between">
      {/* Top Header Bar */}
      <header className="w-full max-w-4xl mx-auto px-5 pt-6 sm:px-8 sm:pt-8 flex items-center justify-between shrink-0">
        <Link
          href="/"
          className="text-[#80828d] hover:text-white font-medium text-xs sm:text-sm transition-colors flex items-center gap-1.5 py-1"
        >
          <span aria-hidden="true">&larr;</span> Back to Course
        </Link>

        <Link
          href="/"
          className="flex flex-col items-end -space-y-0.5 leading-[0.92] text-white hover:opacity-90 transition-opacity select-none text-right cursor-pointer"
          aria-label="HYDRO BASICS Home"
        >
          <span className="font-extrabold text-[16px] sm:text-[18px] tracking-[0.02em] uppercase leading-[0.92]">
            HYDRO
          </span>
          <span className="font-extrabold text-[16px] sm:text-[18px] tracking-[0.02em] uppercase leading-[0.92]">
            BASICS
          </span>
        </Link>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-2xl mx-auto px-4 py-8 sm:py-12 my-auto">
        <div className="relative w-full bg-[#101012] border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl select-text">
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-white/[0.08]">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Refund Policy
            </h1>
            <p className="text-xs sm:text-sm text-[#c2c4cc] leading-relaxed mt-1">
              Clear 7-day money-back guarantee, progress criteria, and direct settlement terms.
            </p>
          </div>

          {/* Points List */}
          <div className="divide-y divide-white/[0.06] text-xs sm:text-[13px] text-[#c2c4cc]">
            <div className="px-5 sm:px-6 py-3.5">
              <p className="leading-relaxed">
                <span className="font-mono font-semibold text-white/50 mr-2.5">01.</span>
                <strong className="font-semibold text-white mr-1.5">7-Day Guarantee:</strong>
                If the curriculum does not meet your expectations, request a 100% full refund
                within 7 calendar days of your enrollment.
              </p>
            </div>

            <div className="px-5 sm:px-6 py-3.5">
              <p className="leading-relaxed">
                <span className="font-mono font-semibold text-white/50 mr-2.5">02.</span>
                <strong className="font-semibold text-white mr-1.5">Eligibility Criteria:</strong>
                Eligible if you have completed less than 20% of video lessons and have not
                downloaded proprietary circuit blueprints.
              </p>
            </div>

            <div className="px-5 sm:px-6 py-3.5">
              <p className="leading-relaxed">
                <span className="font-mono font-semibold text-white/50 mr-2.5">03.</span>
                <strong className="font-semibold text-white mr-1.5">One-Time Payment:</strong>
                No recurring subscriptions, auto-debits, or surprise charges; you only pay once
                for your full 365-day access.
              </p>
            </div>

            <div className="px-5 sm:px-6 py-3.5">
              <p className="leading-relaxed">
                <span className="font-mono font-semibold text-white/50 mr-2.5">04.</span>
                <strong className="font-semibold text-white mr-1.5">Direct Settlement:</strong>
                Approved reversals are credited back to your original payment method in 5–7
                business days via Razorpay.
              </p>
            </div>

            <div className="px-5 sm:px-6 py-3.5">
              <p className="leading-relaxed">
                <span className="font-mono font-semibold text-white/50 mr-2.5">05.</span>
                <strong className="font-semibold text-white mr-1.5">How to Apply:</strong>
                Send your Order ID from your registered address to{' '}
                <a
                  href={`mailto:${siteConfig.supportEmail}`}
                  className="font-medium underline text-white hover:text-white/80 transition-colors"
                >
                  {siteConfig.supportEmail}
                </a>{' '}
                for prompt, no-hassle review.
              </p>
            </div>
          </div>

          {/* Bottom metadata strip */}
          <div className="px-5 sm:px-6 py-3 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono text-[#80828d] bg-[#0c0d0e]">
            <span>Settlement: Razorpay (5–7 Business Days)</span>
            <span>Updated: 2026</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-4xl mx-auto pb-6 sm:pb-8 px-5 sm:px-8 text-center shrink-0">
        <nav
          aria-label="Footer Legal Links"
          className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-xs mb-2"
        >
          <Link href="/terms" className="text-[#80828d] hover:text-white transition-colors">
            Terms
          </Link>
          <Link href="/privacy" className="text-[#80828d] hover:text-white transition-colors">
            Privacy
          </Link>
          <Link href="/refunds" className="text-white font-semibold">
            Refunds
          </Link>
          <Link href="/contact" className="text-[#80828d] hover:text-white transition-colors">
            Contact
          </Link>
        </nav>
        <p className="text-[11px] text-[#5d5f6a]">
          &copy; {currentYear} Hydro Basics. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
