import React from 'react';
import { siteConfig } from '../../config/site';
import { AlertTriangle } from 'lucide-react';

export const metadata = {
  title: `Privacy Policy | ${siteConfig.brandName}`,
  description: `Privacy policy and data protection guidelines for students of ${siteConfig.brandName}.`,
};

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 space-y-8">
      {/* Legal Review Advisory Banner */}
      <div className="border-2 border-black p-4 bg-amber-50 text-amber-950 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <strong>LEGAL NOTICE FOR PRODUCTION ACTIVATION:</strong> This is template policy text
          prepared for platform launch. The course instructor and business owner must review these
          terms with a qualified legal professional prior to live commercial activation to ensure
          full compliance with the Digital Personal Data Protection Act (DPDP), 2023.
        </div>
      </div>

      <div>
        <div className="text-xs font-mono font-bold uppercase tracking-wider text-course-darkBlue mb-1">
          Data Protection &amp; Privacy
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-course-darkBlue tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-xs font-mono text-course-navySubtle mt-2">
          Effective Date: October 2026 • Compliant with Indian Information Technology Rules
        </p>
      </div>

      <div className="prose prose-neutral max-w-none space-y-6 text-sm text-course-darkBlue leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-lg font-black text-course-darkBlue">1. Information We Collect</h2>
          <p>
            When you create an account, purchase courses, or stream video content, we collect the
            following categories of information:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Account Information:</strong> Your full name, email address, password hash
              (stored via argon2id encryption), and phone number.
            </li>
            <li>
              <strong>Billing &amp; Tax Information:</strong> Name, billing address, and optional
              GSTIN provided for tax invoice generation.
            </li>
            <li>
              <strong>Technical &amp; Telemetry Data:</strong> IP address, device user agent, video
              playback timestamps, and progress checkpoints to enable continuous streaming and
              prevent account hijacking.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-black text-course-darkBlue">2. Payment Security</h2>
          <p>
            We do NOT store or process your credit/debit card numbers, UPI PINs, or bank netbanking
            credentials on our servers. All financial transactions are processed directly by our
            PCI-DSS compliant payment aggregator (Razorpay Software Private Limited).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-black text-course-darkBlue">
            3. Cookie &amp; Storage Architecture
          </h2>
          <p>
            In strict adherence to modern security practices (ADR 001), session access tokens are
            maintained in volatile browser memory only and never written to localStorage.
            Authentication refresh tokens are stored in secure, encrypted <code>httpOnly</code>{' '}
            cookies protected by <code>SameSite=Lax</code> policies to prevent Cross-Site Scripting
            (XSS).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-black text-course-darkBlue">4. Student Data Rights</h2>
          <p>
            You have the right to request access to your personal data, update your profile
            information, download your tax invoices, or request account deletion. Inquiries can be
            directed to our support team at{' '}
            <a
              href={`mailto:${siteConfig.supportEmail}`}
              className="font-bold underline text-course-darkBlue hover:text-course-orange"
            >
              {siteConfig.supportEmail}
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
