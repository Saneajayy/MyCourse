'use client';

import React from 'react';
import Link from 'next/link';
import { Loader2, RefreshCw, BookOpen, Clock, X } from 'lucide-react';
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

      {/* 1. Header: Spinner Circle / Alert Circle */}
      <div className="flex flex-col items-center text-center space-y-3 pb-1">
        {isTimedOut ? (
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6 stroke-[2.5]" aria-hidden="true" />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-full bg-white/[0.06] border border-white/[0.08] text-white flex items-center justify-center shrink-0">
            <Loader2 className="w-6 h-6 animate-spin stroke-[2.5]" aria-hidden="true" />
          </div>
        )}

        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight">
            {isTimedOut ? 'Confirmation in Progress' : 'Verifying Payment'}
          </h2>
          <p className="text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed">
            {isTimedOut
              ? 'Awaiting final confirmation from your bank.'
              : 'Confirming transaction with bank / payment gateway...'}
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

          {/* Right: Badge */}
          <div className="shrink-0 text-right space-y-0.5">
            {isTimedOut ? (
              <span className="inline-flex px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/25 text-amber-300 text-[11px] font-mono font-semibold uppercase tracking-wider">
                In Progress
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.08] text-white text-[11px] font-mono font-semibold uppercase tracking-wider">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Checking</span>
              </span>
            )}
            <span className="text-[10px] sm:text-[11px] text-[#80828d] font-medium block">
              Attempt {pollCount}/{maxPoll}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Error or Timed Out message */}
      {errorMsg ? (
        <div className="p-3 rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-300 text-xs text-center">
          {errorMsg}
        </div>
      ) : isTimedOut ? (
        <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-300 text-xs text-center space-y-1">
          <p className="font-semibold">Taking longer than usual?</p>
          <p className="text-[11px] text-amber-400/80 leading-normal">
            If money was debited from your bank, your course access will activate automatically once
            confirmed.
          </p>
        </div>
      ) : null}

      {/* 4. Action Buttons */}
      <div className="space-y-2.5 pt-2">
        {isTimedOut && onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            className="w-full h-11 bg-white hover:bg-neutral-200 active:bg-neutral-300 text-black font-semibold text-xs sm:text-sm rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Check Status Again</span>
          </button>
        ) : null}

        <Link
          href="/dashboard"
          className="w-full h-11 border border-white/[0.08] hover:border-white/[0.14] bg-[#1b1c20] hover:bg-[#22242a] text-white font-medium text-xs sm:text-sm rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Go to My Courses &rarr;</span>
        </Link>
      </div>
    </div>
  );
}
