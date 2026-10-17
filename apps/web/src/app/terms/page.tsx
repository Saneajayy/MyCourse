import React from 'react';
import { siteConfig } from '../../config/site';
import { AlertTriangle } from 'lucide-react';

export const metadata = {
  title: `Terms & Conditions | ${siteConfig.brandName}`,
  description: `Terms of service and student enrollment agreement for ${siteConfig.brandName}.`,
};

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 space-y-8">
      {/* Legal Review Advisory Banner */}
      <div className="border-2 border-black p-4 bg-amber-50 text-amber-950 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <strong>LEGAL NOTICE FOR PRODUCTION ACTIVATION:</strong> This is template policy text
          prepared for platform launch. The course instructor and business owner must review these
          terms with a qualified legal professional prior to live commercial activation to ensure
          full compliance with Indian IT laws and consumer protection regulations.
        </div>
      </div>

      <div>
        <div className="text-xs font-mono font-bold uppercase tracking-wider text-course-darkBlue mb-1">
          Legal Agreement
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-course-darkBlue tracking-tight">
          Terms &amp; Conditions
        </h1>
        <p className="text-xs font-mono text-course-navySubtle mt-2">
          Last Updated: October 2026 • Governing Law: Jurisdiction of{' '}
          {siteConfig.contact.jurisdiction}
        </p>
      </div>

      <div className="prose prose-neutral max-w-none space-y-6 text-sm text-course-darkBlue leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-lg font-black text-course-darkBlue">1. Acceptance of Terms</h2>
          <p>
            By registering for an account or enrolling in courses provided by{' '}
            <strong>{siteConfig.brandName}</strong> (&quot;we&quot;, &quot;us&quot;, or
            &quot;our&quot;), you agree to be bound by these Terms and Conditions. If you do not
            agree to these terms, please do not purchase or access the course content.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-black text-course-darkBlue">
            2. Course Access &amp; Validity
          </h2>
          <p>
            Enrolling in the course grants you a single-user, non-exclusive, non-transferable
            license to access and stream the instructional videos, circuit blueprints, and reference
            guides for a period of <strong>365 days (1 year)</strong> from the timestamp of payment
            confirmation, unless lifetime access was explicitly purchased.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-black text-course-darkBlue">
            3. Anti-Piracy &amp; Dynamic Watermarking
          </h2>
          <p>
            All video lectures are dynamically embedded with cryptographic watermarks displaying the
            enrolled student&apos;s registered email address. Screen-recording, ripping,
            downloading, sharing credentials, or publicly distributing course materials is strictly
            prohibited and constitutes a copyright violation punishable under the Indian Copyright
            Act, 1957.
          </p>
          <p>
            Single-device concurrent streaming is strictly enforced. Sharing accounts will result in
            automatic session revocation or permanent account ban without refund.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-black text-course-darkBlue">
            4. Pricing, Payments &amp; Taxes
          </h2>
          <p>
            All prices are quoted in Indian Rupees (INR) and are inclusive of Goods and Services Tax
            (GST) where applicable. Payments are processed securely via RBI-authorized payment
            aggregators (Razorpay). Valid GST invoices are generated upon payment confirmation and
            available in your student dashboard.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-black text-course-darkBlue">
            5. Engineering Safety Disclaimer
          </h2>
          <p>
            Industrial hydraulic machinery operates under extreme fluid pressures exceeding 200–350
            bar. The instructions and circuits taught in this course are educational demonstrations.
            Students and engineers must follow manufacturer safety manuals, plant isolation (LOTO)
            protocols, and pressure relief checks before performing live maintenance. We assume no
            liability for equipment damage or personal injury resulting from improper application.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-black text-course-darkBlue">6. Contact &amp; Grievances</h2>
          <p>
            For any billing inquiries, account issues, or legal notices, contact our support desk at{' '}
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
