'use client';

import React from 'react';
import Link from 'next/link';
import { X, RefreshCw, ArrowLeft } from 'lucide-react';
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
    <div className="relative w-full max-w-[420px] sm:max-w-[440px] mx-auto bg-[#151619] border border-white/[0.08] hover:border-white/[0.14] rounded-xl p-5 sm:p-7 select-none font-reddit text-left space-y-4 shadow-2xl transition-all">
      {/* Optional Close Button */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 text-neutral-400 hover:text-white transition-colors cursor-pointer p-1 z-20 focus:outline-none"
        >
          <X className="w-4 h-4 stroke-[2]" />
        </button>
      )}

      {/* 1. Header: Rose Circle with White Cross */}
      <div className="flex flex-col items-center text-center space-y-3 pb-1">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
          <X className="w-6 h-6 stroke-[2.5]" aria-hidden="true" />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight">
            Payment Declined
          </h2>
          <p className="text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed">
            Your transaction could not be processed.
          </p>
        </div>
      </div>

      {/* Separation Line */}
      <div className="-mx-5 sm:-mx-7 border-t border-white/[0.06]" />

      {/* 2. Course & Order Details Block */}
      <div className="pt-0.5">
        <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-lg bg-[#1b1c20] border border-white/[0.08]">
          {/* Left: Course Name & Order Ref */}
          <div className="min-w-0 flex-1 space-y-0.5">
            <span className="font-bold text-white text-sm sm:text-base block truncate">
              {displayCourse}
            </span>
            <span className="text-xs font-mono font-medium text-[#80828d] block">
              {formatDisplayOrderId(orderId)}
            </span>
          </div>

          {/* Right: Status or Amount */}
          <div className="shrink-0 text-right space-y-0.5">
            {formattedAmount ? (
              <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight leading-none block">
                ₹{formattedAmount}
              </span>
            ) : (
              <span className="inline-flex px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/25 text-rose-300 text-[11px] font-mono font-semibold uppercase tracking-wider">
                Declined
              </span>
            )}
            <span className="text-[10px] sm:text-[11px] text-[#80828d] font-medium block">
              No charge applied
            </span>
          </div>
        </div>
      </div>

      {/* 3. Failure Reason / Notice */}
      <div className="pt-1 text-center space-y-0.5">
        <p className="text-xs text-[#80828d]">
          {errorMessage || 'Payment was cancelled or rejected by your banking provider.'}
        </p>
      </div>

      {/* 4. Action Buttons */}
      <div className="space-y-2.5 pt-2">
        <Link
          href={`/checkout?course=${encodeURIComponent(displayCourse)}`}
          className="w-full h-11 bg-white hover:bg-neutral-200 active:bg-neutral-300 text-black font-semibold text-xs sm:text-sm rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Try Again &rarr;</span>
        </Link>

        <Link
          href="/dashboard"
          className="w-full h-11 border border-white/[0.08] hover:border-white/[0.14] bg-[#1b1c20] hover:bg-[#22242a] text-white font-medium text-xs sm:text-sm rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
