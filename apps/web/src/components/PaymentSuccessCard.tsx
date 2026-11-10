'use client';

import React, { useMemo } from 'react';
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

// Subtle, delightful CSS confetti burst around the top celebration badge
function ConfettiParticles() {
  const particles = useMemo(() => {
    const colors = ['#0033FF', '#10B981', '#38BDF8', '#F59E0B', '#EC4899', '#8B5CF6'];
    const angles = [
      -150, -125, -100, -75, -50, -25, 0, 25, 50, 75, 100, 125, 150, 175, -175,
      -135, -90, -45, 45, 90, 135,
    ];
    return angles.map((deg, i) => {
      const rad = (deg * Math.PI) / 180;
      const distance = 45 + (i % 3) * 22;
      const dx = Math.cos(rad) * distance;
      const dy = Math.sin(rad) * distance;
      const color = colors[i % colors.length];
      const isRect = i % 2 === 0;
      const size = isRect ? (i % 3 === 0 ? 'w-2 h-1' : 'w-2.5 h-1.5') : 'w-2 h-2 rounded-full';
      const delay = (i % 4) * 0.04;
      return { id: i, dx, dy, color, isRect, size, delay, dr: (i % 2 === 0 ? 1 : -1) * (180 + i * 30) };
    });
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-start justify-center pt-8" aria-hidden="true">
      <style>{`
        @keyframes confetti-burst {
          0% {
            transform: translate(0, 0) scale(0) rotate(0deg);
            opacity: 0;
          }
          25% {
            opacity: 1;
            transform: translate(calc(var(--dx) * 0.5px), calc(var(--dy) * 0.5px)) scale(1.2) rotate(calc(var(--dr) * 0.4deg));
          }
          85% {
            opacity: 0.9;
          }
          100% {
            transform: translate(calc(var(--dx) * 1px), calc(var(--dy) * 1px + 12px)) scale(0.9) rotate(calc(var(--dr) * 1deg));
            opacity: 0;
          }
        }
      `}</style>
      <div className="relative w-1 h-1">
        {particles.map((p) => (
          <div
            key={p.id}
            className={`absolute ${p.size}`}
            style={
              {
                backgroundColor: p.color,
                '--dx': p.dx,
                '--dy': p.dy,
                '--dr': p.dr,
                animation: `confetti-burst 1.3s cubic-bezier(0.2, 0.8, 0.3, 1) forwards`,
                animationDelay: `${p.delay}s`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </div>
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

  const displayCourse =
    data.courseTitle === 'Industrial Hydraulic Systems & Circuit Design'
      ? 'Hydraulic System Basics'
      : data.courseTitle || 'Hydraulic System Basics';

  const validityLabel = data.validityDays
    ? `${data.validityDays} Days Access`
    : '365 Days Access';

  const firstLetter = displayCourse.charAt(0).toUpperCase() || 'H';

  return (
    <div className="relative w-full max-w-[440px] sm:max-w-[460px] mx-auto bg-white rounded-[28px] p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.18)] border border-neutral-100 select-none font-reddit text-left overflow-hidden">
      {/* Confetti Particles radiating from celebration top */}
      <ConfettiParticles />

      {/* 1. Header Section (INSIDE the card with confetti) */}
      <div className="text-center relative z-10 space-y-1.5 pb-4">
        {/* Pulsing Success Ring + Blue Circle with Checkmark */}
        <div className="relative inline-flex items-center justify-center mb-1">
          <div className="w-14 h-14 rounded-full bg-[#0033FF] text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
            <svg
              className="w-7 h-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h2 className="text-2xl sm:text-[26px] font-extrabold text-neutral-900 tracking-tight">
          Payment Successful!
        </h2>
        <p className="text-xs sm:text-sm text-neutral-500 font-normal">
          Your course access has been activated.
        </p>
      </div>

      {/* 2. Course Details Row (Letter Avatar + Title + Validity Badge, NO icons) */}
      <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-neutral-50/80 border border-neutral-100 my-2">
        {/* Blue Initial Letter Badge */}
        <div className="w-12 h-12 rounded-xl bg-[#0033FF] text-white font-extrabold text-xl flex items-center justify-center shrink-0 shadow-xs">
          {firstLetter}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="font-bold text-neutral-900 text-sm sm:text-base leading-snug truncate">
            {displayCourse}
          </h3>
          <div className="inline-block px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0033FF] text-[11px] font-bold tracking-tight">
            {validityLabel}
          </div>
        </div>
      </div>

      {/* 3. Final Price Box (Show ONLY final price + Inclusive of all taxes & GST) */}
      <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100/70 my-3">
        <div className="flex items-baseline justify-between">
          <span className="font-bold text-neutral-700 text-sm sm:text-base">
            Total Paid
          </span>
          <span className="font-mono text-2xl sm:text-[28px] font-black text-[#0033FF] tracking-tight">
            ₹{formattedAmount}
          </span>
        </div>
        <div className="text-[11px] text-neutral-500 font-medium mt-0.5 text-right">
          Including all taxes &amp; GST
        </div>
      </div>

      {/* 4. Confirmation Email Notice (Clean text, NO icons) */}
      <div className="my-4 text-center">
        <p className="text-xs sm:text-[13px] text-neutral-500 font-normal leading-relaxed">
          Payment receipt has been sent to{' '}
          <strong className="font-semibold text-neutral-900 break-all">
            {data.studentEmail || 'your email'}
          </strong>
        </p>
      </div>

      {/* 5. Minimal Action Buttons */}
      <div className="space-y-2 pt-1">
        {/* Primary Button: Go to My Courses */}
        <Link
          href="/my-courses"
          className="w-full h-12 bg-[#0033FF] hover:bg-[#0028D6] active:bg-[#0020b8] text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 tracking-wide cursor-pointer uppercase"
        >
          <span>Go to My Courses &rarr;</span>
        </Link>

        {/* Secondary Button: Download Receipt */}
        {onDownloadInvoice && (
          <button
            type="button"
            onClick={onDownloadInvoice}
            disabled={downloadingInvoice}
            className="w-full h-11 border border-neutral-200 hover:border-neutral-400 bg-white hover:bg-neutral-50 text-neutral-700 font-semibold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
          >
            <span>{downloadingInvoice ? 'Downloading Receipt...' : 'Download Receipt'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
