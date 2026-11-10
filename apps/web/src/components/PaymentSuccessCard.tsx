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
      {/* 1. Header: Bright Blue PAYMENT SUCCESSFUL & Subtitle */}
      <div className="text-center space-y-1 pb-1">
        <h2 className="text-xl sm:text-[22px] font-black text-[#0033FF] tracking-tight uppercase">
          PAYMENT SUCCESSFUL
        </h2>
        <p className="text-xs sm:text-[13px] text-[#0055FF]/90 font-medium">
          Your course access has been activated.
        </p>
      </div>

      {/* 2. Order Summary Section */}
      <div className="pt-1 space-y-3">
        <div className="text-center sm:text-left font-bold text-sm sm:text-base text-neutral-900">
          Order Summary
        </div>

        {/* Course Details Block */}
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-neutral-50/80 border border-neutral-100">
          <div className="min-w-0 flex-1 space-y-0.5">
            <span className="font-bold text-neutral-900 text-sm block truncate">
              {displayCourse}
            </span>
            <span className="text-[11px] font-semibold text-neutral-500 block">
              {validityLabel}
            </span>
          </div>
        </div>

        {/* Amount Paid Block (Only Final Price + Taxes Note) */}
        <div className="flex flex-col items-end pt-1">
          <span className="text-xs font-semibold text-neutral-500">
            Amount Paid
          </span>
          <span className="text-3xl sm:text-4xl font-black text-neutral-900 font-mono tracking-tight leading-none my-1">
            ₹{formattedAmount}
          </span>
          <span className="text-[11px] text-neutral-400 font-medium">
            Including all taxes &amp; GST
          </span>
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
