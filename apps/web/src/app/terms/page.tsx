'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { siteConfig } from '../../config/site';
import { ArrowLeft, Shield, AlertTriangle } from 'lucide-react';

export default function TermsPage() {
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
            Legal &amp; Compliance
          </span>
        </div>

        {/* Bottom Highlights over Left Card Image */}
        <div className="relative z-10 w-full space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
            <Shield className="w-3.5 h-3.5" />
            <span>DPDP Act 2023 Compliant</span>
          </div>
          <p className="text-xs text-[#c2c4cc]/80 leading-relaxed max-w-sm">
            Official enrollment agreement, single-student licensing, and engineering safety protocol.
          </p>
        </div>
      </div>

      {/* ============================================================== */}
      {/* RIGHT CARD: Full Scrollable Terms (Starts Top-Left)           */}
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

        {/* Main Terms Document Body */}
        <div className="pt-6 pb-12 space-y-8 max-w-2xl text-left">
          {/* Document Header */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono text-white/80 px-2.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08]">
                Effective: November 2026
              </span>
              <span className="text-[11px] font-mono text-[#80828d]">
                Version 2.4 • Standard Enrollment Terms
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
              Terms of Service &amp; Enrollment Agreement
            </h1>

            <p className="text-xs sm:text-sm text-[#c2c4cc] leading-relaxed">
              These Terms of Service (&ldquo;Agreement&rdquo;, &ldquo;Terms&rdquo;) constitute a legally binding agreement between you (&ldquo;Student&rdquo;, &ldquo;User&rdquo;, or &ldquo;Licensee&rdquo;) and <strong>{siteConfig.brandName}</strong> (&ldquo;Company&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;). By accessing our website, purchasing an enrollment, or streaming instructional lecture content, you acknowledge that you have read, understood, and agreed to be bound by all provisions set forth below.
            </p>
          </div>

          <div className="border-t border-white/[0.08]" />

          {/* Section 1 */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white/40">01.</span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Acceptance of Terms &amp; Eligibility
              </h2>
            </div>
            <p className="text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed">
              To enroll in any Hydro Basics curriculum or access platform resources, you must be at least eighteen (18) years of age or possess legal parental or guardian authorization. If you are entering into this agreement on behalf of an enterprise, industrial plant, or educational institution, you represent and warrant that you hold full legal authority to bind that corporate body to these Terms.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white/40">02.</span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Educational License Grant &amp; 365-Day Validity
              </h2>
            </div>
            <p className="text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed">
              Upon successful payment verification, Hydro Basics grants you a limited, personal, non-exclusive, non-transferable, revocable single-user license to access and stream the enrolled course video modules, circuit diagrams, and instructional documentation.
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed pl-1">
              <li>
                <strong className="text-white">Duration:</strong> Access remains valid for <strong>365 calendar days</strong> from the official payment confirmation date.
              </li>
              <li>
                <strong className="text-white">Single-User Restriction:</strong> Sublicensing, sharing credentials, screen sharing in group training sessions, or reselling course access is strictly prohibited and constitutes copyright infringement.
              </li>
              <li>
                <strong className="text-white">No Downloading:</strong> Video streams are delivered via secure adaptive HLS protocol. Storing or caching videos locally using unauthorized scrapers or browser extensions is strictly forbidden.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white/40">03.</span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Cryptographic Watermarking &amp; Anti-Piracy DRM
              </h2>
            </div>
            <p className="text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed">
              To prevent illegal piracy and intellectual property theft, all video streams are processed through dynamic digital rights management (DRM) and embed invisible cryptographic session hashes alongside visible floating identifiers bearing your registered Student ID and email.
            </p>
            <p className="text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed">
              If course materials bearing your identification are discovered on torrent networks, Telegram channels, file-sharing repositories, or video portals, your access will be permanently revoked immediately without notice or refund, and Hydro Basics will initiate civil and criminal proceedings under the Indian Copyright Act, 1957.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white/40">04.</span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Single Concurrent Streaming &amp; Device Concurrency
              </h2>
            </div>
            <p className="text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed">
              In accordance with our anti-credential-sharing security policy, simultaneous streaming across multiple web browsers, computers, or mobile devices from a single account is blocked.
            </p>
            <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed space-y-1">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Session Concurrency Notice</span>
              </div>
              <p>
                If playback is initiated on a second device while a video is playing, our automated heartbeat monitor will terminate the first stream immediately. You can resume playback on your active device with one click.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white/40">05.</span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                High-Pressure Hydraulic Safety Disclaimer
              </h2>
            </div>
            <p className="text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed">
              Course modules demonstrate real-world industrial fluid power systems operating under extreme hydraulic pressures exceeding <strong>200 to 350 bar (3,000–5,000 PSI)</strong>. Fluid injection hazards, stored accumulator energy, high thermal levels, and sudden mechanical movement present severe risks of catastrophic injury or death.
            </p>
            <div className="p-3.5 rounded-lg bg-[#18191d] border border-white/[0.08] text-xs text-[#c2c4cc] leading-relaxed space-y-1.5">
              <p className="text-white font-medium">Mandatory Plant Safety Rules:</p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>Demonstrations are strictly for educational analysis and conceptual understanding.</li>
                <li>Never calibrate, modify, or dismantle live hydraulic machinery without OEM factory schematics and verified manufacturer service manuals.</li>
                <li>Enforce rigorous Lockout/Tagout (LOTO) protocols and depressurize all accumulators and pilot lines before commencing physical maintenance.</li>
                <li>Hydro Basics and the instructor explicitly disclaim any liability for equipment downtime, valve failure, personal injury, or financial loss incurred from applying course concepts in industrial plants.</li>
              </ul>
            </div>
          </section>

          {/* Section 6 */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white/40">06.</span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Payments, GST Tax Invoices &amp; Billing
              </h2>
            </div>
            <p className="text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed">
              Course fees are charged as a one-time tuition payment processed via RBI-authorized payment aggregators (including Razorpay, UPI, Net Banking, and Credit/Debit Cards). There are no recurring auto-debits or subscription retainers.
            </p>
            <p className="text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed">
              All transactions comply with Indian Goods and Services Tax (GST) laws. If you provide a valid GSTIN during checkout, B2B tax invoices featuring your corporate legal entity name will be generated automatically and remain downloadable in your student dashboard.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white/40">07.</span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                7-Day Money-Back Guarantee &amp; Refund Terms
              </h2>
            </div>
            <p className="text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed">
              We stand behind the engineering quality of our curriculum. Students who enroll and determine that the material does not suit their requirements may request a 100% refund within seven (7) calendar days of purchase, subject to having watched less than 20% of the course lectures.
            </p>
            <p className="text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed">
              For complete eligibility guidelines, exclusions, and settlement turnaround times (5–7 business days via original payment method), refer to our dedicated <Link href="/refunds" className="text-white font-medium underline hover:text-white/80">Refund Policy</Link>.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white/40">08.</span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Account Security &amp; Prohibited Conduct
              </h2>
            </div>
            <p className="text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed">
              You are responsible for maintaining the confidentiality of your login credentials and two-factor authentication (2FA) verification codes. You agree not to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed pl-1">
              <li>Probe, scan, or test the vulnerability of platform APIs or authentication endpoints.</li>
              <li>Use automated bots, web spiders, or scrapers to extract curriculum data.</li>
              <li>Introduce malicious scripts, viruses, or packet-sniffing tools into user community features.</li>
              <li>Impersonate any person or engineering entity in discussion boards or direct communications.</li>
            </ul>
          </section>

          {/* Section 9 */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white/40">09.</span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Limitation of Liability &amp; Warranty Disclaimer
              </h2>
            </div>
            <p className="text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed">
              The services and instructional materials are provided strictly on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without warranties of any kind, whether express or implied. Under no circumstances shall Hydro Basics, its instructors, engineers, directors, or technology partners be liable for indirect, incidental, special, punitive, or consequential damages resulting from platform downtime or application of curriculum techniques.
            </p>
            <p className="text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed">
              In any event, our total cumulative liability under this Agreement shall not exceed the actual tuition amount paid by you for the specific course enrollment.
            </p>
          </section>

          {/* Section 10 */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white/40">10.</span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Governing Law &amp; Dispute Resolution
              </h2>
            </div>
            <p className="text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed">
              This Agreement shall be governed by, interpreted, and construed in accordance with the substantive laws of the Republic of India. Any legal action, suit, or proceeding arising out of or related to these Terms shall be instituted exclusively in the competent courts located in <strong>{siteConfig.contact.jurisdiction}</strong>.
            </p>
          </section>

          {/* Section 11 */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white/40">11.</span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Modifications to Terms
              </h2>
            </div>
            <p className="text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed">
              We reserve the right to revise or update these Terms periodically to reflect changes in regulatory standards, tax rates, or platform security updates. The updated version will be indicated by an updated &ldquo;Effective Date&rdquo; at the top of this document. Continued platform usage after amendments signifies your acceptance.
            </p>
          </section>

          {/* Section 12 */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white/40">12.</span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Legal Inquiries &amp; Official Contact
              </h2>
            </div>
            <p className="text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed">
              For corporate enterprise agreements, formal legal notices, or clarification regarding these Terms, contact our administration desk:
            </p>
            <div className="p-4 rounded-lg bg-[#151619] border border-white/[0.08] text-xs text-[#c2c4cc] space-y-1.5 font-mono">
              <p><span className="text-[#80828d]">Email:</span> <a href={`mailto:${siteConfig.supportEmail}`} className="text-white underline">{siteConfig.supportEmail}</a></p>
              <p><span className="text-[#80828d]">Phone:</span> <a href={`tel:${siteConfig.contact.phone.replace(/\s+/g, '')}`} className="text-white">{siteConfig.contact.phone}</a></p>
              <p><span className="text-[#80828d]">Address:</span> <span className="text-white">{siteConfig.contact.address}</span></p>
              <p><span className="text-[#80828d]">Jurisdiction:</span> <span className="text-white">{siteConfig.contact.jurisdiction}</span></p>
            </div>
          </section>

          {/* Bottom Legal Navigation Bar */}
          <div className="pt-8 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs select-none">
            <nav
              aria-label="Footer Legal Links"
              className="flex items-center gap-4 text-xs"
            >
              <Link href="/terms" className="text-white font-semibold">
                Terms
              </Link>
              <Link href="/privacy" className="text-[#80828d] hover:text-white transition-colors">
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
