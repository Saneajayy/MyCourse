import { siteConfig } from '../../config/site';
import { AlertTriangle } from 'lucide-react';

export const metadata = {
  title: `Refund & Cancellation Policy | ${siteConfig.brandName}`,
  description: `Refund and cancellation terms for course enrollments on ${siteConfig.brandName}.`,
};

export default function RefundPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 space-y-8">
      {/* Legal Review Advisory Banner */}
      <div className="border-2 border-black p-4 bg-amber-50 text-amber-950 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <strong>LEGAL NOTICE FOR PRODUCTION ACTIVATION:</strong> This is template policy text
          prepared for Razorpay merchant onboarding. The course instructor and business owner must
          review these terms with a professional accountant/lawyer to align with business
          operational capacity and banking rules before taking live commercial orders.
        </div>
      </div>

      <div>
        <div className="text-xs font-mono font-bold uppercase tracking-wider text-course-darkBlue mb-1">
          Consumer Protection
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-course-darkBlue tracking-tight">
          Refund &amp; Cancellation Policy
        </h1>
        <p className="text-xs font-mono text-course-navySubtle mt-2">
          Required by Payment Aggregators • Clear, Fair, Engineering-Focused Policy
        </p>
      </div>

      <div className="prose prose-neutral max-w-none space-y-6 text-sm text-course-darkBlue leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-lg font-black text-course-darkBlue">
            1. Free Previews Before Purchase
          </h2>
          <p>
            We provide free preview lessons on our homepage for all prospective students. We
            strongly encourage you to watch the free preview videos, inspect the curriculum, and
            verify video streaming on your device prior to completing enrollment.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-black text-course-darkBlue">
            2. 7-Day Money-Back Evaluation Window
          </h2>
          <p>
            We want you to be completely confident in the practical value of this industrial
            training. If you determine that the course does not meet your engineering expectations,
            you are eligible for a <strong>100% full refund</strong> within{' '}
            <strong>7 calendar days</strong> of your purchase, subject to the following fair usage
            criteria:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Your refund request is submitted within 7 days of the payment timestamp.</li>
            <li>
              You have watched less than <strong>20% of the total course video duration</strong>.
            </li>
            <li>
              You have not downloaded all supplementary blueprint files or design calculators.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-black text-course-darkBlue">3. How to Request a Refund</h2>
          <p>
            To initiate a refund, please send an email to{' '}
            <a
              href={`mailto:${siteConfig.supportEmail}`}
              className="font-bold underline text-course-darkBlue hover:text-course-orange"
            >
              {siteConfig.supportEmail}
            </a>{' '}
            from your registered student email address with the subject line:{' '}
            <code>Refund Request - [Your Order ID]</code>.
          </p>
          <p>
            Please include your registered phone number and a brief description of why the material
            did not suit your needs so we can continue improving the course curriculum.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-black text-course-darkBlue">
            4. Processing Time &amp; Settlement
          </h2>
          <p>
            Once approved by our administration, refunds are initiated immediately through Razorpay.
            The refund is automatically credited back to your original payment method (Bank Account,
            Credit/Debit Card, or UPI handle) within <strong>5 to 7 business days</strong> depending
            on your issuing bank&apos;s settlement schedule.
          </p>
          <p>
            Upon refund issuance, course access will be deactivated, active streaming sessions will
            be terminated, and a credit note will be issued against the original tax invoice.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-black text-course-darkBlue">
            5. Cancellation of Subscription / Renewals
          </h2>
          <p>
            The standard course enrollment is a single one-time payment for 365 days of access.
            There are no recurring auto-debits or unauthorized recurring charges. You are not locked
            into any automatic subscription.
          </p>
        </section>
      </div>
    </div>
  );
}
