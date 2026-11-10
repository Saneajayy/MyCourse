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
      <style>{`
        @keyframes confetti-burst {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          60% {
            transform: scale(1.1);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-confetti-burst {
          animation: confetti-burst 0.5s cubic-bezier(0.17, 0.89, 0.32, 1.25) forwards;
          transform-origin: center;
        }
      `}</style>

      {/* 1. Header: Blue Circle with White Tick Above Title + Confetti Burst from Behind */}
      <div className="flex flex-col items-center text-center space-y-3 pb-1">
        {/* Circle with Confetti Burst */}
        <div className="relative flex items-center justify-center">
          {/* Confetti coming out from behind the circle */}
          <svg
            className="absolute w-28 h-28 pointer-events-none z-0 animate-confetti-burst"
            viewBox="0 0 120 120"
            fill="none"
            aria-hidden="true"
          >
            {/* Colorful Confetti Ribbons */}
            <rect x="88" y="48" width="7" height="3" rx="1.5" transform="rotate(25 91.5 49.5)" fill="#FF3B30" />
            <rect x="80" y="22" width="7" height="3" rx="1.5" transform="rotate(-30 83.5 23.5)" fill="#FF9500" />
            <rect x="48" y="12" width="7" height="3" rx="1.5" transform="rotate(20 51.5 13.5)" fill="#0033FF" />
            <rect x="22" y="28" width="7" height="3" rx="1.5" transform="rotate(-40 25.5 29.5)" fill="#34C759" />
            <rect x="14" y="58" width="7" height="3" rx="1.5" transform="rotate(15 17.5 59.5)" fill="#AF52DE" />
            <rect x="26" y="86" width="7" height="3" rx="1.5" transform="rotate(45 29.5 87.5)" fill="#FFCC00" />
            <rect x="58" y="104" width="7" height="3" rx="1.5" transform="rotate(-15 61.5 105.5)" fill="#00C7BE" />
            <rect x="88" y="86" width="7" height="3" rx="1.5" transform="rotate(35 91.5 87.5)" fill="#FF2D55" />

            {/* Confetti Dots */}
            <circle cx="98" cy="36" r="2.5" fill="#34C759" />
            <circle cx="72" cy="12" r="2" fill="#FF2D55" />
            <circle cx="36" cy="16" r="2.5" fill="#FF9500" />
            <circle cx="12" cy="44" r="2" fill="#0033FF" />
            <circle cx="16" cy="76" r="2.5" fill="#FFCC00" />
            <circle cx="44" cy="108" r="2" fill="#AF52DE" />
            <circle cx="76" cy="108" r="2.5" fill="#34C759" />
            <circle cx="104" cy="68" r="2" fill="#FF9500" />

            {/* Sparkles */}
            <path d="M96 22 L97 25 L100 26 L97 27 L96 30 L95 27 L92 26 L95 25 Z" fill="#FFCC00" />
            <path d="M22 72 L23 74 L25 75 L23 76 L22 78 L21 76 L19 75 L21 74 Z" fill="#00C7BE" />
          </svg>

          {/* Blue Circle with White Tick */}
          <div className="relative z-10 w-12 h-12 rounded-full bg-[#0033FF] text-white flex items-center justify-center shrink-0">
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

      {/* Separation Line between Payment Successful section and Price Tab section */}
      <hr className="w-full border-0 border-t border-neutral-200/80 my-0.5" />

      {/* 2. Combined Course & Price Block with Blue Boundary (Order Summary text removed) */}
      <div className="pt-0.5">
        <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border border-[#0033FF]">
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

      {/* 3. Confirmation Notice (Email on second line) */}
      <div className="pt-1 text-center space-y-0.5">
        <p className="text-xs text-neutral-500 font-normal">
          Payment receipt has been sent to
        </p>
        <p className="text-xs font-semibold text-neutral-800 break-all">
          {data.studentEmail || 'your email'}
        </p>
      </div>

      {/* 4. Action Buttons (Identical dimensions, blue border on download button, no arrow) */}
      <div className="space-y-2.5 pt-2">
        {/* Primary CTA */}
        <Link
          href={`/learn/${data.courseSlug || 'hydraulic-engineering-mastery'}`}
          className="w-full h-12 bg-[#0033FF] hover:bg-[#0028D6] active:bg-[#0020b8] text-white font-bold text-sm sm:text-[15px] rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center cursor-pointer tracking-wide"
        >
          <span>Start learning</span>
        </Link>

        {/* Secondary CTA */}
        {onDownloadInvoice && (
          <button
            type="button"
            onClick={onDownloadInvoice}
            disabled={downloadingInvoice}
            className="w-full h-12 border border-[#0033FF] bg-white hover:bg-blue-50/50 text-[#0033FF] font-bold text-sm sm:text-[15px] rounded-xl transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center text-center"
          >
            {downloadingInvoice ? 'Downloading Receipt...' : 'Download Receipt'}
          </button>
        )}
      </div>
    </div>
  );
}
