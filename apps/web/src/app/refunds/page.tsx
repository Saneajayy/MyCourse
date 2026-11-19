'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { siteConfig } from '../../config/site';
import { ArrowLeft, Shield, CheckCircle2, RotateCcw } from 'lucide-react';

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
    <div className="fixed inset-0 w-full h-[100dvh] max-h-[100dvh] bg-black text-white p-2.5 sm:p-3 overflow-hidden font-reddit selection:bg-white selection:text-black z-10 flex flex-col lg:flex-row gap-2.5 sm:gap-3">
      {/* ============================================================== */}
      {/* LEFT CARD (Desktop Only): Signature Fractal Glass Graphic     */}
      {/* ============================================================== */}
      <div className="hidden lg:relative lg:flex lg:flex-col lg:justify-between lg:w-1/2 h-full bg-[#101012] border border-white/[0.08] rounded-xl overflow-hidden select-none p-6 sm:p-8 shrink-0">
        <Image
          src="/fractal-glass-5.jpg"
          alt="HydroBasics Industrial Hydraulic Engineer"
          fill
          priority
          sizes="50vw"
          className="object-cover object-center select-none"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent pointer-events-none"
          aria-hidden="true"
        />

        {/* Top Header Row over Image */}
        <div className="relative z-10 w-full flex items-center justify-between">
          <Link href="/" className="flex flex-col select-none group" title="HYDRO BASICS Home">
            <span className="font-extrabold text-[15px] sm:text-[16px] text-white leading-[1.05] tracking-wider uppercase group-hover:text-white/80 transition-colors">
              HYDRO
            </span>
            <span className="font-extrabold text-[15px] sm:text-[16px] text-white leading-[1.05] tracking-wider uppercase group-hover:text-white/80 transition-colors">
              BASICS
            </span>
          </Link>
          <span className="text-[11px] font-mono tracking-wider text-white/70 px-2.5 py-1 rounded bg-black/40 border border-white/10 backdrop-blur-md">
            Refund &amp; Cancellation
          </span>
        </div>

        {/* Bottom Highlights over Left Card Image */}
        <div className="relative z-10 w-full space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
            <Shield className="w-3.5 h-3.5" />
            <span>7-Day Full Satisfaction Guarantee</span>
          </div>
          <p className="text-xs text-[#c2c4cc]/80 leading-relaxed max-w-sm">
            Fair progress eligibility criteria, 5–7 business days direct Razorpay settlement, and no recurring charges.
          </p>
        </div>
      </div>

      {/* ============================================================== */}
      {/* RIGHT CARD: Full Scrollable Refund Policy (Starts Top-Left)   */}
      {/* ============================================================== */}
      <div className="w-full flex-1 min-h-0 lg:w-1/2 lg:h-full bg-[#101012] border border-white/[0.08] rounded-xl flex flex-col overflow-y-auto relative p-6 sm:p-8 lg:p-10 select-text scroll-smooth">
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between pb-5 border-b border-white/[0.08] shrink-0 select-none">
          <Link href="/" className="lg:hidden flex flex-col select-none group" title="HYDRO BASICS Home">
            <span className="font-extrabold text-[15px] text-white leading-[1.05] tracking-wider uppercase">
              HYDRO
            </span>
            <span className="font-extrabold text-[15px] text-white leading-[1.05] tracking-wider uppercase">
              BASICS
            </span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-mono tracking-wider text-[#c2c4cc]/80 hover:text-white transition-colors ml-auto"
            title="Back to Course"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Course</span>
          </Link>
        </div>

        {/* Main Document Body */}
        <div className="pt-6 pb-12 space-y-8 max-w-2xl text-left">
          {/* Header */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono text-white/80 px-2.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08]">
                Effective: November 2026
              </span>
              <span className="text-[11px] font-mono text-[#80828d]">
                Version 2.4 • Student Protection Terms
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
              Cancellation &amp; Refund Policy
            </h1>

            <p className="text-xs sm:text-sm text-[#c2c4cc] leading-relaxed">
              At <strong>{siteConfig.brandName}</strong>, we stand firmly behind the engineering depth and practical industrial utility of our curriculum. This Cancellation &amp; Refund Policy describes our 7-day money-back guarantee, student eligibility conditions, non-refundable elements, and payment gateway reversal protocols.
            </p>
          </div>

          <div className="border-t border-white/[0.08]" />

          {/* Section 1 */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white/40">01.</span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                7-Day Money-Back Guarantee
              </h2>
            </div>
            <p className="text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed">
              Every student who enrolls in a Hydro Basics course is entitled to evaluate the curriculum risk-free for seven (7) calendar days starting from the timestamp of payment confirmation. If you conclude that the course does not meet your technical expectations, you may submit a formal cancellation request for a 100% full tuition refund.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white/40">02.</span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Eligibility Criteria &amp; Progress Threshold
              </h2>
            </div>
            <p className="text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed">
              To prevent curriculum scraping and intellectual property exploitation, refund requests must satisfy each of the following objective criteria at the moment of application:
            </p>
            <div className="space-y-2 text-xs">
              <div className="p-3.5 rounded-lg bg-[#151619] border border-white/[0.08] flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[#c2c4cc] leading-relaxed">
                  <strong className="text-white">Curriculum Consumption:</strong> You must have completed less than <strong>20%</strong> of the total video lecture lessons in the enrolled course (as monitored by our automated lesson heartbeat system).
                </p>
              </div>
              <div className="p-3.5 rounded-lg bg-[#151619] border border-white/[0.08] flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[#c2c4cc] leading-relaxed">
                  <strong className="text-white">Time Window:</strong> Your refund notice must be received within <strong>7 calendar days (168 hours)</strong> from the exact transaction timestamp recorded on your tax invoice.
                </p>
              </div>
              <div className="p-3.5 rounded-lg bg-[#151619] border border-white/[0.08] flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[#c2c4cc] leading-relaxed">
                  <strong className="text-white">No Certificate Issued:</strong> No completion credentials or verified engineering certificates may have been unlocked or generated for your account.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white/40">03.</span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Non-Refundable Circumstances
              </h2>
            </div>
            <p className="text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed">
              Refunds will not be approved under any of the following circumstances:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed pl-1">
              <li>Requests submitted after the expiration of the 7-calendar-day evaluation window.</li>
              <li>Accounts that have watched 20% or more of the course video curriculum.</li>
              <li>Accounts found in violation of our Terms of Service (e.g., credential sharing, ripping video streams, tampering with DRM watermarks).</li>
              <li>Custom corporate plant training cohorts or bulk enterprise invoices executed under negotiated B2B contracts.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white/40">04.</span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Direct Settlement &amp; Processing Timelines
              </h2>
            </div>
            <p className="text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed">
              Once your refund request is verified by our administration desk:
            </p>
            <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 leading-relaxed space-y-1">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                <span>Original Payment Method Reversal (5–7 Business Days)</span>
              </div>
              <p>
                The reimbursement is transmitted via Razorpay directly back to the original source of payment (UPI VPA, Credit Card, Debit Card, or Net Banking account). Depending on your bank&apos;s clearing cycles, the credit will appear on your statement within 5 to 7 Indian banking days.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white/40">05.</span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                How to Submit a Refund Request
              </h2>
            </div>
            <p className="text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed">
              To ensure prompt processing, email your refund notice directly from your <strong>registered student email address</strong> to our support desk:
            </p>
            <div className="p-4 rounded-lg bg-[#151619] border border-white/[0.08] text-xs text-[#c2c4cc] space-y-2 font-mono">
              <p><span className="text-[#80828d]">To:</span> <a href={`mailto:${siteConfig.supportEmail}`} className="text-white underline">{siteConfig.supportEmail}</a></p>
              <p><span className="text-[#80828d]">Subject:</span> <span className="text-white">Refund Request - [Your Order ID]</span></p>
              <p><span className="text-[#80828d]">Body details:</span> Registered Name, Phone Number, and brief reason for cancellation.</p>
              <p><span className="text-[#80828d]">Response:</span> <span className="text-emerald-400 font-semibold">&lt;24 Business Hours</span></p>
            </div>
          </section>

          {/* Bottom Legal Navigation Bar */}
          <div className="pt-8 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs select-none">
            <nav
              aria-label="Footer Legal Links"
              className="flex items-center gap-4 text-xs"
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
          </div>
        </div>
      </div>
    </div>
  );
}
