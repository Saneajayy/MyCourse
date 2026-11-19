'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { siteConfig } from '../../config/site';
import { ArrowLeft, Shield, Lock } from 'lucide-react';

export default function PrivacyPage() {
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
            Privacy &amp; Data Protection
          </span>
        </div>

        {/* Bottom Highlights over Left Card Image */}
        <div className="relative z-10 w-full space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
            <Shield className="w-3.5 h-3.5" />
            <span>DPDP Act 2023 &amp; IT Rules Compliant</span>
          </div>
          <p className="text-xs text-[#c2c4cc]/80 leading-relaxed max-w-sm">
            Zero third-party data selling, RBI-compliant payment processing, and end-to-end session security.
          </p>
        </div>
      </div>

      {/* ============================================================== */}
      {/* RIGHT CARD: Full Scrollable Privacy Policy (Starts Top-Left)  */}
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
                Version 2.4 • DPDP Act 2023 Charter
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
              Privacy Policy &amp; Data Protection Charter
            </h1>

            <p className="text-xs sm:text-sm text-[#c2c4cc] leading-relaxed">
              At <strong>{siteConfig.brandName}</strong>, we are committed to safeguarding the privacy and personal information of our students and corporate engineering partners. This Privacy Policy outlines our standards regarding data collection, processing security, cookie management, and student rights under the <strong>Digital Personal Data Protection (DPDP) Act, 2023</strong> and the <strong>Information Technology Act, 2000</strong>.
            </p>
          </div>

          <div className="border-t border-white/[0.08]" />

          {/* Section 1 */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white/40">01.</span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Information We Collect
              </h2>
            </div>
            <p className="text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed">
              We collect only the minimum personal data strictly necessary to authenticate course access, fulfill taxation compliance, and ensure platform security:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed pl-1">
              <li>
                <strong className="text-white">Identity &amp; Contact:</strong> Full legal name, verified email address, and mobile phone number for authentication and OTP verification.
              </li>
              <li>
                <strong className="text-white">Commercial &amp; Invoicing:</strong> Optional Goods &amp; Services Tax Identification Number (GSTIN) and registered company name for business tax credit.
              </li>
              <li>
                <strong className="text-white">Technical &amp; Telemetry:</strong> Anonymized browser agent, IP address, playback timestamps, and completed lesson progress for session resumption and anti-piracy validation.
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white/40">02.</span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Payment Security &amp; RBI Compliance
              </h2>
            </div>
            <p className="text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed">
              All payment transactions are handled exclusively through RBI-authorized payment aggregator <strong>Razorpay</strong>, operating under strict <strong>PCI-DSS Level 1</strong> compliance.
            </p>
            <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 leading-relaxed space-y-1">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero Financial Credential Storage</span>
              </div>
              <p>
                Hydro Basics never stores, logs, or views your credit/debit card numbers, CVVs, expiration dates, bank net banking passwords, or UPI PINs. All sensitive tokenization occurs within Razorpay&apos;s isolated vault.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white/40">03.</span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Zero Third-Party Data Selling
              </h2>
            </div>
            <p className="text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed">
              We uphold a strict zero-compromise policy: <strong>we do not sell, rent, monetize, or trade your personal information or contact details</strong> with third-party marketing networks, telemarketers, or advertisement brokers. Your information is used strictly to deliver educational course services.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white/40">04.</span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Session Protection, Cookies &amp; Token Security
              </h2>
            </div>
            <p className="text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed">
              Our authentication architecture protects your account against Cross-Site Scripting (XSS) and Session Hijacking:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed pl-1">
              <li>
                <strong className="text-white">Volatile Memory Tokens:</strong> Short-lived JWT access tokens reside in client memory and are never persisted in accessible browser local storage.
              </li>
              <li>
                <strong className="text-white">HttpOnly Cookies:</strong> Session refresh tokens are transmitted with <code className="text-white font-mono text-[11px] bg-white/[0.06] px-1 py-0.5 rounded">HttpOnly; Secure; SameSite=Strict</code> attributes, rendering them inaccessible to malicious client scripts.
              </li>
              <li>
                <strong className="text-white">No Tracking Cookies:</strong> We do not deploy third-party advertising pixels, behavioral retargeting trackers, or invasive cross-site beacons.
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white/40">05.</span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Anti-Piracy Watermarking Telemetry
              </h2>
            </div>
            <p className="text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed">
              During video playback, our platform logs heartbeat telemetry (lesson position, playback state, and dynamic DRM token authorization). A semi-transparent overlay displays your registered Student ID to deter illegal screen recording. This processing is strictly justified under our legitimate interest in protecting intellectual property.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white/40">06.</span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Your Rights Under the DPDP Act, 2023
              </h2>
            </div>
            <p className="text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed">
              As a student enrolled with Hydro Basics, Indian privacy legislation grants you clear rights regarding your personal data:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-[#151619] border border-white/[0.08] space-y-1">
                <span className="font-semibold text-white block">Right to Access &amp; Summary</span>
                <p className="text-[#c2c4cc]">Request a full summary of your processed data and enrolled curriculum history.</p>
              </div>
              <div className="p-3 rounded-lg bg-[#151619] border border-white/[0.08] space-y-1">
                <span className="font-semibold text-white block">Right to Correction &amp; Update</span>
                <p className="text-[#c2c4cc]">Update your phone number, name spelling, or billing address in your dashboard.</p>
              </div>
              <div className="p-3 rounded-lg bg-[#151619] border border-white/[0.08] space-y-1">
                <span className="font-semibold text-white block">Right to Erasure</span>
                <p className="text-[#c2c4cc]">Request deletion of your account and personal records (subject to statutory GST tax retention).</p>
              </div>
              <div className="p-3 rounded-lg bg-[#151619] border border-white/[0.08] space-y-1">
                <span className="font-semibold text-white block">Right to Grievance Redressal</span>
                <p className="text-[#c2c4cc]">Lodge questions directly with our designated Data Protection Officer.</p>
              </div>
            </div>
          </section>

          {/* Section 7 */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white/40">07.</span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Data Retention Standards
              </h2>
            </div>
            <p className="text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed">
              We retain account data for the duration of your 365-day access license plus any period necessary to maintain certificate verification authenticity. Transaction invoices and GST tax records are retained for seven (7) years in compliance with Section 36 of the Central Goods and Services Tax Act, 2017.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white/40">08.</span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Data Protection Officer &amp; Privacy Contact
              </h2>
            </div>
            <p className="text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed">
              To exercise your privacy rights, request data exports, or report security concerns, contact our privacy desk:
            </p>
            <div className="p-4 rounded-lg bg-[#151619] border border-white/[0.08] text-xs text-[#c2c4cc] space-y-1.5 font-mono">
              <p><span className="text-[#80828d]">Email:</span> <a href={`mailto:${siteConfig.supportEmail}`} className="text-white underline">{siteConfig.supportEmail}</a></p>
              <p><span className="text-[#80828d]">Desk:</span> <span>Data Protection &amp; Compliance Office</span></p>
              <p><span className="text-[#80828d]">Address:</span> <span className="text-white">{siteConfig.contact.address}</span></p>
              <p><span className="text-[#80828d]">Turnaround:</span> <span className="text-emerald-400 font-semibold">&lt;48 Business Hours</span></p>
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
              <Link href="/privacy" className="text-white font-semibold">
                Privacy
              </Link>
              <Link href="/refunds" className="text-[#80828d] hover:text-white transition-colors">
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
