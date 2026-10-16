import React from 'react';
import Link from 'next/link';
import { siteConfig } from '../config/site';
import { Mail, Youtube } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-black bg-course-white text-course-darkBlue">
      <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-course-orange inline-block border border-black" />
              <span className="font-black text-lg tracking-tight">{siteConfig.brandName}</span>
            </div>
            <p className="text-sm text-course-navyMuted max-w-md leading-relaxed">
              {siteConfig.tagline}
            </p>
            <div className="text-xs text-course-navySubtle">
              Taught by {siteConfig.instructor.name} • {siteConfig.instructor.credentials}
            </div>
            <div className="flex items-center gap-4 pt-2">
              <a
                href={siteConfig.instructor.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-course-darkBlue hover:underline border border-black px-3 py-1.5 min-h-[44px]"
              >
                <Youtube className="w-4 h-4 text-course-orange" />
                <span>70k+ on YouTube</span>
              </a>
              <a
                href={`mailto:${siteConfig.supportEmail}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-course-darkBlue hover:underline border border-black px-3 py-1.5 min-h-[44px]"
              >
                <Mail className="w-4 h-4 text-course-orange" />
                <span>Support Email</span>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-course-darkBlue">
              Navigation
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/#syllabus"
                  className="hover:text-course-orange min-h-[32px] inline-flex items-center"
                >
                  Full Curriculum
                </Link>
              </li>
              <li>
                <Link
                  href="/#instructor"
                  className="hover:text-course-orange min-h-[32px] inline-flex items-center"
                >
                  Instructor Profile
                </Link>
              </li>
              <li>
                <Link
                  href="/#pricing"
                  className="hover:text-course-orange min-h-[32px] inline-flex items-center"
                >
                  Pricing & Enrollment
                </Link>
              </li>
              <li>
                <Link
                  href="/my-courses"
                  className="hover:text-course-orange min-h-[32px] inline-flex items-center"
                >
                  Student Portal
                </Link>
              </li>
              <li>
                <Link
                  href="/styleguide"
                  className="hover:text-course-orange min-h-[32px] inline-flex items-center text-xs text-course-navySubtle font-mono"
                >
                  [Dev] Styleguide
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Policies */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-course-darkBlue">
              Legal & Policies
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/terms"
                  className="hover:text-course-orange min-h-[32px] inline-flex items-center"
                >
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-course-orange min-h-[32px] inline-flex items-center"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/refunds"
                  className="hover:text-course-orange min-h-[32px] inline-flex items-center"
                >
                  Refund & Cancellation
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="hover:text-course-orange min-h-[32px] inline-flex items-center"
                >
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-black pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-course-navySubtle">
          <p>
            © {new Date().getFullYear()} {siteConfig.brandName}. All rights reserved.
          </p>
          <p className="text-right">GST compliant invoicing • Secure Razorpay payment processing</p>
        </div>
      </div>
    </footer>
  );
}
