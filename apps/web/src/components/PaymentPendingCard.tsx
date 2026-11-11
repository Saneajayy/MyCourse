'use client';

import React from 'react';
import Link from 'next/link';
import { Loader2, RefreshCw, BookOpen, AlertCircle, Clock, X } from 'lucide-react';
import { formatDisplayOrderId } from '../lib/order';

export interface PaymentPendingCardProps {
  orderId: string;
  courseTitle?: string;
  pollCount: number;
  maxPoll?: number;
  isTimedOut?: boolean;
  errorMsg?: string | null;
  onRefresh?: () => void;
  onClose?: () => void;
}

export function PaymentPendingCard({
  orderId,
  courseTitle = 'Hydraulic System Basics',
  pollCount,
  maxPoll = 15,
  isTimedOut = false,
  errorMsg,
  onRefresh,
  onClose,
}: PaymentPendingCardProps) {
  const displayCourse =
    courseTitle === 'Industrial Hydraulic Systems & Circuit Design'
      ? 'Hydraulic System Basics'
      : courseTitle || 'Hydraulic System Basics';

  return (
    <div className="relative w-full max-w-[420px] sm:max-w-[440px] mx-auto bg-white rounded-2xl sm:rounded-[24px] p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-neutral-100 select-none font-reddit text-left space-y-4">
      {/* Optional Close Button */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white border border-neutral-200 text-neutral-600 hover:text-black hover:bg-neutral-100 flex items-center justify-center shadow-md transition-all cursor-pointer z-20"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      )}

      {/* 1. Header: Spinner Circle / Alert Circle Above Title */}
      <div className="flex flex-col items-center text-center space-y-3 pb-1">
        {isTimedOut ? (
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6 stroke-[2.5]" aria-hidden="true" />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-full bg-neutral-100 text-black flex items-center justify-center shrink-0">
            <Loader2 className="w-6 h-6 animate-spin stroke-[2.5]" aria-hidden="true" />
          </div>
        )}

        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight leading-tight">
            {isTimedOut ? 'Confirmation in Progress' : 'Verifying Payment'}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 font-normal leading-normal">
            {isTimedOut
              ? 'Awaiting final confirmation from your bank.'
              : 'Confirming transaction with bank / payment gateway...'}
          </p>
        </div>
      </div>

      {/* Separation Line */}
      <hr className="w-full border-0 border-t border-neutral-200/80 my-0.5" />

      {/* 2. Course & Order Details Block with Black Border */}
      <div className="pt-0.5">
        <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border border-black">
          {/* Left: Course Name & Order Ref */}
          <div className="min-w-0 flex-1 space-y-0.5">
            <span className="font-bold text-neutral-900 text-sm sm:text-base block truncate">
              {displayCourse}
            </span>
            <span className="text-xs font-mono font-semibold text-neutral-500 block">
              {formatDisplayOrderId(orderId)}
            </span>
          </div>

          {/* Right: Badge */}
          <div className="shrink-0 text-right space-y-0.5">
            {isTimedOut ? (
              <span className="inline-flex px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 text-xs font-mono font-bold uppercase tracking-wider">
                In Progress
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-100 text-neutral-900 text-xs font-mono font-bold uppercase tracking-wider">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Checking</span>
              </span>
            )}
            <span className="text-[10px] sm:text-[11px] text-neutral-400 font-medium block">
              {isTimedOut ? 'Bank Clearing' : `Attempt ${Math.min(pollCount + 1, maxPoll)}/${maxPoll}`}
            </span>
          </div>
        </div>
      </div>

      {/* Error Message if Present */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="leading-tight">{errorMsg}</span>
        </div>
      )}

      {/* 3. Verification Notice */}
      <div className="pt-1 text-center space-y-0.5">
        <p className="text-xs text-neutral-500 font-normal">
          {isTimedOut
            ? 'Your payment was authorized by your UPI or bank app.'
            : 'Please keep this window open while we secure the confirmation token.'}
        </p>
        <p className="text-xs text-neutral-500 font-normal">
          {isTimedOut
            ? 'Access will activate automatically once bank clearance arrives.'
            : 'You will be redirected automatically as soon as payment settles.'}
        </p>
      </div>

      {/* 4. Action Buttons */}
      <div className="space-y-2.5 pt-2">
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="w-full h-12 bg-black hover:bg-[#262626] active:bg-[#171717] text-white font-bold text-sm sm:text-[15px] rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center cursor-pointer tracking-wide gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Check Status Again</span>
          </button>
        )}

        <Link
          href="/my-courses"
          className="w-full h-12 border border-black bg-white hover:bg-neutral-100 text-black font-bold text-sm sm:text-[15px] rounded-xl transition-all cursor-pointer flex items-center justify-center text-center gap-2"
        >
          <BookOpen className="w-4 h-4" />
          <span>Go to My Courses</span>
        </Link>
      </div>
    </div>
  );
}
