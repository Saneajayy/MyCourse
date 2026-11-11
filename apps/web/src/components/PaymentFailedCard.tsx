'use client';

import React from 'react';
import Link from 'next/link';
import { X, RefreshCw, ArrowLeft, AlertCircle } from 'lucide-react';
import { formatDisplayOrderId } from '../lib/order';

export interface PaymentFailedCardProps {
  orderId: string;
  courseTitle?: string;
  amountPaise?: number;
  errorMessage?: string | null;
  onClose?: () => void;
}

export function PaymentFailedCard({
  orderId,
  courseTitle = 'Hydraulic System Basics',
  amountPaise,
  errorMessage,
  onClose,
}: PaymentFailedCardProps) {
  const displayCourse =
    courseTitle === 'Industrial Hydraulic Systems & Circuit Design'
      ? 'Hydraulic System Basics'
      : courseTitle || 'Hydraulic System Basics';

  const amountRupees = amountPaise ? amountPaise / 100 : null;
  const formattedAmount = amountRupees
    ? amountRupees % 1 === 0
      ? amountRupees.toLocaleString('en-IN')
      : amountRupees.toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
    : null;

  return (
    <div className="relative w-full max-w-[420px] sm:max-w-[440px] mx-auto bg-white rounded-none p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-neutral-100 select-none font-reddit text-left space-y-4">
      {/* Optional Close Button */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 w-9 h-9 sm:w-10 sm:h-10 rounded-none bg-white border border-neutral-200 text-neutral-600 hover:text-black hover:bg-neutral-100 flex items-center justify-center shadow-md transition-all cursor-pointer z-20"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      )}

      {/* 1. Header: Rose Circle with White Cross */}
      <div className="flex flex-col items-center text-center space-y-3 pb-1">
        <div className="w-12 h-12 rounded-none bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
          <X className="w-6 h-6 stroke-[2.5]" aria-hidden="true" />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight leading-tight">
            Payment Declined
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 font-normal leading-normal">
            Your transaction could not be processed.
          </p>
        </div>
      </div>

      {/* Separation Line */}
      <hr className="w-full border-0 border-t border-neutral-200/80 my-0.5" />

      {/* 2. Course & Order Details Block with Black Border */}
      <div className="pt-0.5">
        <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-none border border-black">
          {/* Left: Course Name & Order Ref */}
          <div className="min-w-0 flex-1 space-y-0.5">
            <span className="font-bold text-neutral-900 text-sm sm:text-base block truncate">
              {displayCourse}
            </span>
            <span className="text-xs font-mono font-semibold text-neutral-500 block">
              {formatDisplayOrderId(orderId)}
            </span>
          </div>

          {/* Right: Status or Amount */}
          <div className="shrink-0 text-right space-y-0.5">
            {formattedAmount ? (
              <span className="text-2xl sm:text-3xl font-black text-neutral-900 font-mono tracking-tight leading-none block">
                ₹{formattedAmount}
              </span>
            ) : (
              <span className="inline-flex px-2.5 py-1 rounded-none bg-rose-100 text-rose-800 text-xs font-bold uppercase tracking-wider">
                Declined
              </span>
            )}
            <span className="text-[10px] sm:text-[11px] text-neutral-400 font-medium block">
              No charge applied
            </span>
          </div>
        </div>
      </div>

      {/* Error Message if Present */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-none text-xs text-rose-800 font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="leading-tight">{errorMessage}</span>
        </div>
      )}

      {/* 3. Reversal Notice */}
      <div className="pt-1 text-center space-y-0.5">
        <p className="text-xs text-neutral-500 font-normal">
          The transaction was declined by your bank or payment app.
        </p>
        <p className="text-xs text-neutral-500 font-normal">
          Any deducted amount will be reversed within 2–4 business days.
        </p>
      </div>

      {/* 4. Action Buttons */}
      <div className="space-y-2.5 pt-2">
        <Link
          href="/checkout"
          className="w-full h-12 bg-black hover:bg-[#262626] active:bg-[#171717] text-white font-bold text-sm sm:text-[15px] rounded-none shadow-sm hover:shadow transition-all flex items-center justify-center cursor-pointer tracking-wide gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Payment</span>
        </Link>

        <Link
          href="/"
          className="w-full h-12 border border-black bg-white hover:bg-neutral-100 text-black font-bold text-sm sm:text-[15px] rounded-none transition-all cursor-pointer flex items-center justify-center text-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Home</span>
        </Link>
      </div>
    </div>
  );
}
