'use client';

import React from 'react';
import Link from 'next/link';
import { Play, Download, Loader2, Check, ArrowRight } from 'lucide-react';
import { formatDisplayOrderId } from '../lib/order';

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

function MastercardIcon({ className = 'h-5 w-auto' }: { className?: string }) {
  return (
    <svg className={className} viewBox="2 2 34 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Mastercard">
      <circle cx="12" cy="12" r="10" fill="#EB001B" />
      <circle cx="26" cy="12" r="10" fill="#F79E1B" />
      <path
        d="M19 5.35C20.9 6.9 22.1 9.3 22.1 12C22.1 14.7 20.9 17.1 19 18.65C17.1 17.1 15.9 14.7 15.9 12C15.9 9.3 17.1 6.9 19 5.35Z"
        fill="#FF5F00"
      />
    </svg>
  );
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

  // Format validity dates: e.g. "12 Aug, 2026 to 12 Aug, 2027"
  const createdDate = data.paymentTime ? new Date(data.paymentTime) : new Date();
  const validDays = data.validityDays || 365;
  const expiryDate = new Date(createdDate.getTime() + validDays * 24 * 60 * 60 * 1000);

  const formatDateShort = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const formatPaymentDateTime = (d: Date) => {
    try {
      const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
      const datePart = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      return `${timeStr}, ${weekday}, ${datePart}`;
    } catch {
      return formatDateShort(d);
    }
  };

  const displayCourse =
    data.courseTitle === 'Industrial Hydraulic Systems & Circuit Design'
      ? 'Hydraulic System Basics'
      : data.courseTitle || 'Hydraulic System Basics';

  const refId = formatDisplayOrderId(data.orderNumber || data.orderId || 'ORD-000000');
  const txId = data.transactionId
    ? data.transactionId.length > 14
      ? data.transactionId.slice(-10).toUpperCase()
      : data.transactionId
    : data.orderId ? data.orderId.slice(-8).toUpperCase() : '2342138';
  const invId = data.invoiceId || (data.orderNumber ? `INV-${data.orderNumber.replace(/[^0-9A-Z]/gi, '')}` : 'INV-345467');

  return (
    <div className="w-full max-w-[500px] mx-auto select-none font-reddit text-center">
      {/* Top Header Badge & Text */}
      <div className="mb-4 sm:mb-5">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 mx-auto mb-3">
          <Check className="w-6 h-6 sm:w-7 sm:h-7 stroke-[3]" />
        </div>
        <h1 className="text-2xl sm:text-[28px] font-extrabold text-neutral-900 tracking-tight">
          Payment Success
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-sm mx-auto font-normal">
          You have successfully subscribed to {displayCourse}
        </p>
      </div>

      {/* Clean White Card */}
      <div className="bg-white rounded-[24px] sm:rounded-[28px] p-5 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-neutral-100 text-left space-y-4 sm:space-y-5">
        {/* Course Tier Banner (Pro Highlight with Crown and Cyan Checkmark) */}
        <div className="bg-gradient-to-r from-[#e0f7fa]/70 via-[#e0f2fe]/60 to-[#f0f9ff]/80 border border-sky-100 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3 shadow-xs">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-base select-none" role="img" aria-label="Crown">
                👑
              </span>
              <span className="font-bold text-sky-600 text-sm sm:text-base truncate">
                {displayCourse}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-neutral-500 font-medium truncate">
              Effective from {formatDateShort(createdDate)} to {formatDateShort(expiryDate)}
            </p>
          </div>
          <div className="w-7 h-7 rounded-full bg-[#06b6d4] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Check className="w-4 h-4 stroke-[3]" />
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="space-y-3.5 pt-1">
          {/* Row 1: Reference ID, Transaction ID, Invoice ID */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="space-y-1 min-w-0">
              <span className="text-[11px] font-medium text-neutral-400 block tracking-tight">
                Reference ID
              </span>
              <span className="text-xs sm:text-[13px] font-bold text-neutral-900 block truncate font-mono">
                {refId}
              </span>
            </div>

            <div className="space-y-1 min-w-0">
              <span className="text-[11px] font-medium text-neutral-400 block tracking-tight">
                Transaction ID
              </span>
              <span className="text-xs sm:text-[13px] font-bold text-neutral-900 block truncate font-mono">
                {txId}
              </span>
            </div>

            <div className="space-y-1 min-w-0">
              <span className="text-[11px] font-medium text-neutral-400 block tracking-tight">
                Invoice ID
              </span>
              <span className="text-xs sm:text-[13px] font-bold text-neutral-900 block truncate font-mono">
                {invId}
              </span>
            </div>
          </div>

          {/* Row 2: Payment Method, Payment Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
            <div className="space-y-1 min-w-0">
              <span className="text-[11px] font-medium text-neutral-400 block tracking-tight">
                Payment Method
              </span>
              <span className="text-xs sm:text-[13px] font-bold text-neutral-900 block truncate">
                {data.paymentMethod || 'Online / Razorpay'}
              </span>
            </div>

            <div className="space-y-1 min-w-0">
              <span className="text-[11px] font-medium text-neutral-400 block tracking-tight">
                Payment Time
              </span>
              <span className="text-xs sm:text-[13px] font-bold text-neutral-900 block truncate">
                {formatPaymentDateTime(createdDate)}
              </span>
            </div>
          </div>
        </div>

        {/* Divider Line */}
        <div className="border-t border-neutral-100 my-1" />

        {/* Bottom Row: Student Card / Account & Amount Paid */}
        <div className="flex items-center justify-between gap-3 pt-0.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <MastercardIcon className="h-6 w-auto shrink-0" />
            <div className="min-w-0">
              <span className="text-xs sm:text-sm font-bold text-neutral-900 block truncate leading-tight">
                {data.studentName || 'Student'}
              </span>
              <span className="text-[11px] text-neutral-500 font-mono block truncate">
                {data.studentEmail ? `**** ${data.studentEmail.slice(-14)}` : '**** **** 9087'}
              </span>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <span className="text-[11px] font-medium text-neutral-400 block tracking-tight">
              Paid
            </span>
            <span className="text-base sm:text-lg font-black text-neutral-900 block tracking-tight">
              ₹{formattedAmount}
            </span>
          </div>
        </div>

        {/* Action Buttons: Start Learning Now & Download Tax Invoice */}
        <div className="pt-2 sm:pt-3 space-y-2.5">
          <Link
            href={`/learn/${data.courseSlug || 'hydraulic-engineering-mastery'}`}
            className="w-full h-11 sm:h-12 bg-[#0033FF] hover:bg-[#0028D6] active:bg-[#0020b8] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white text-white" />
            <span>Start Learning Now</span>
          </Link>

          {onDownloadInvoice && (
            <button
              type="button"
              onClick={onDownloadInvoice}
              disabled={downloadingInvoice}
              className="w-full h-11 sm:h-12 border border-neutral-200 hover:border-neutral-400 bg-white hover:bg-neutral-50 text-neutral-800 font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-60 uppercase tracking-wider"
            >
              {downloadingInvoice ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#0033FF]" />
              ) : (
                <Download className="w-4 h-4 text-[#0033FF]" />
              )}
              <span>{downloadingInvoice ? 'Downloading...' : 'Download Tax Invoice'}</span>
            </button>
          )}

          <div className="pt-1 text-center">
            <Link
              href="/my-courses"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              <span>View all your courses in My Courses</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
