'use client';

import React from 'react';
import Link from 'next/link';

export interface PaymentSuccessData {
  orderId: string;
  orderNumber?: string;
  transactionId?: string;
  invoiceId?: string;
  invoiceDbId?: string;
  courseTitle: string;
  courseSlug: string;
  validityDays?: number;
  amountPaise: number;
  studentName?: string;
  studentEmail?: string;
  paymentMethod?: string;
  paymentTime?: string | Date;
}

interface PaymentSuccessCardProps {
  data: PaymentSuccessData;
  onDownloadInvoice?: (e: React.MouseEvent) => void;
  downloadingInvoice?: boolean;
  onClose?: () => void;
}

export function PaymentSuccessCard({
  data,
  onDownloadInvoice,
  downloadingInvoice = false,
}: PaymentSuccessCardProps) {
  const amountRupees = (data.amountPaise || 0) / 100;
  const formattedAmount =
    amountRupees % 1 === 0
      ? amountRupees.toLocaleString('en-IN')
      : amountRupees.toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

  const displayCourse =
    data.courseTitle === 'Industrial Hydraulic Systems & Circuit Design'
      ? 'Hydraulic System Basics'
      : data.courseTitle || 'Hydraulic System Basics';

  const validityLabel = data.validityDays
    ? `${data.validityDays} Days Access`
    : '365 Days Access';

  return (
    <div className="relative w-full max-w-[420px] sm:max-w-[440px] mx-auto bg-white rounded-2xl sm:rounded-[24px] p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-neutral-100 select-none font-reddit text-left space-y-4">
      {/* 1. Header: Blue Circle with White Tick Above Title & Tagline */}
      <div className="flex flex-col items-center text-center space-y-3 pb-1">
        <div className="w-12 h-12 rounded-full bg-[#0033FF] text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
          <svg
            className="w-6 h-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight leading-tight">
            Payment Successful
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 font-normal leading-normal">
            Your course access has been activated.
          </p>
        </div>
      </div>

      {/* 2. Order Summary Section (Course, Validity, and Price in Same Tab without grey fill) */}
      <div className="pt-1 space-y-2.5">
        <div className="text-left font-bold text-sm sm:text-base text-neutral-900">
          Order Summary
        </div>

        {/* Combined Course & Price Block */}
        <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border border-neutral-200">
          {/* Left: Course Name & Validity */}
          <div className="min-w-0 flex-1 space-y-0.5">
            <span className="font-bold text-neutral-900 text-sm sm:text-base block truncate">
              {displayCourse}
            </span>
            <span className="text-xs font-semibold text-neutral-500 block">
              {validityLabel}
            </span>
          </div>

          {/* Right: Price & Taxes note */}
          <div className="shrink-0 text-right space-y-0.5">
            <span className="text-2xl sm:text-3xl font-black text-neutral-900 font-mono tracking-tight leading-none block">
              ₹{formattedAmount}
            </span>
            <span className="text-[10px] sm:text-[11px] text-neutral-400 font-medium block">
              Including all taxes &amp; GST
            </span>
          </div>
        </div>
      </div>

      {/* 3. Confirmation Notice (Clean text, no icons) */}
      <div className="pt-1 text-center">
        <p className="text-xs text-neutral-500 leading-relaxed font-normal">
          Payment receipt has been sent to{' '}
          <strong className="font-semibold text-neutral-800 break-all">
            {data.studentEmail || 'your email'}
          </strong>
        </p>
      </div>

      {/* 4. Action Buttons */}
      <div className="space-y-2 pt-2">
        {/* Primary CTA */}
        <Link
          href={`/learn/${data.courseSlug || 'hydraulic-engineering-mastery'}`}
          className="w-full h-12 bg-[#0033FF] hover:bg-[#0028D6] active:bg-[#0020b8] text-white font-bold text-sm sm:text-[15px] rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer tracking-wide"
        >
          <span>Start learning &rarr;</span>
        </Link>

        {/* Secondary CTA */}
        {onDownloadInvoice && (
          <button
            type="button"
            onClick={onDownloadInvoice}
            disabled={downloadingInvoice}
            className="w-full h-10 border border-neutral-200 hover:border-neutral-400 bg-white hover:bg-neutral-50 text-neutral-600 font-semibold text-xs sm:text-[13px] rounded-xl transition-all cursor-pointer disabled:opacity-60 block text-center"
          >
            {downloadingInvoice ? 'Downloading Receipt...' : 'Download Receipt'}
          </button>
        )}
      </div>
    </div>
  );
}
