'use client';

import React from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

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

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  color: string;
  rotation: number;
  vRotation: number;
  flutterSpeed: number;
  opacity: number;
  life: number;
  maxLife: number;
  shape: 'rect' | 'circle' | 'sparkle';
}

const CONFETTI_COLORS = [
  '#000000', // royal blue
  '#3B82F6', // sky blue
  '#10B981', // emerald
  '#F59E0B', // gold
  '#FBBF24', // yellow amber
  '#EF4444', // coral red
  '#EC4899', // hot pink
  '#8B5CF6', // purple
  '#06B6D4', // cyan teal
];

function createBurstParticles(cx: number, cy: number, count = 28): ConfettiParticle[] {
  const particles: ConfettiParticle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const spawnDist = 18 + Math.random() * 8;
    const speed = 2.4 + Math.random() * 3.8;
    const randType = Math.random();
    const shape: 'rect' | 'circle' | 'sparkle' =
      randType > 0.4 ? 'rect' : randType > 0.15 ? 'circle' : 'sparkle';

    const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)] ?? '#000000';

    particles.push({
      x: cx + Math.cos(angle) * spawnDist,
      y: cy + Math.sin(angle) * spawnDist,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.4,
      width: shape === 'rect' ? 6 + Math.random() * 4 : shape === 'sparkle' ? 7 : 4.5,
      height: shape === 'rect' ? 3 + Math.random() * 2 : shape === 'sparkle' ? 7 : 4.5,
      color,
      rotation: Math.random() * Math.PI * 2,
      vRotation: (Math.random() - 0.5) * 0.25,
      flutterSpeed: 0.08 + Math.random() * 0.1,
      opacity: 1,
      life: 0,
      maxLife: 55 + Math.random() * 35,
      shape,
    });
  }
  return particles;
}

function ConfettiBurst() {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let burstInterval: ReturnType<typeof setInterval>;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const particles: ConfettiParticle[] = [];

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const width = 260;
    const height = 190;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const cx = width / 2;
    const cy = height / 2;

    // Initial festive burst waves
    particles.push(...createBurstParticles(cx, cy, 38));
    timers.push(
      setTimeout(() => {
        particles.push(...createBurstParticles(cx, cy, 22));
      }, 350),
    );
    timers.push(
      setTimeout(() => {
        particles.push(...createBurstParticles(cx, cy, 20));
      }, 750),
    );

    // Continuous celebratory bursts
    burstInterval = setInterval(() => {
      particles.push(...createBurstParticles(cx, cy, 26));
    }, 2500);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        if (!p) continue;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.vy += 0.04;
        p.rotation += p.vRotation;
        p.life++;
        p.opacity = Math.max(0, 1 - p.life / p.maxLife);

        if (p.opacity <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.scale(Math.cos(p.life * p.flutterSpeed), 1);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
        } else if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.width / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Diamond sparkle
          ctx.beginPath();
          ctx.moveTo(0, -p.height / 2);
          ctx.lineTo(p.width / 4, -p.height / 4);
          ctx.lineTo(p.width / 2, 0);
          ctx.lineTo(p.width / 4, p.height / 4);
          ctx.lineTo(0, p.height / 2);
          ctx.lineTo(-p.width / 4, p.height / 4);
          ctx.lineTo(-p.width / 2, 0);
          ctx.lineTo(-p.width / 4, -p.height / 4);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(burstInterval);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0"
      style={{ width: '260px', height: '190px' }}
      aria-hidden="true"
    />
  );
}

export function PaymentSuccessCard({
  data,
  onDownloadInvoice,
  downloadingInvoice = false,
  onClose,
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

  const validityLabel = data.validityDays ? `${data.validityDays} Days Access` : '365 Days Access';

  return (
    <div className="relative w-full max-w-[420px] sm:max-w-[440px] mx-auto bg-white rounded-none p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-neutral-100 select-none font-reddit text-left space-y-4">
      {/* Simple Cross Icon inside top right corner */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 text-neutral-400 hover:text-black transition-colors cursor-pointer p-1 z-20 focus:outline-none"
        >
          <X className="w-5 h-5 stroke-[2]" />
        </button>
      )}

      {/* 1. Header: Blue Circle with White Tick Above Title + Confetti Burst from Behind */}
      <div className="flex flex-col items-center text-center space-y-3 pb-1">
        {/* Circle with Confetti Burst */}
        <div className="relative flex items-center justify-center">
          {/* Confetti continuously bursting outward from behind the circle */}
          <ConfettiBurst />

          {/* Blue Circle with White Tick */}
          <div className="relative z-10 w-12 h-12 rounded-none bg-black text-white flex items-center justify-center shrink-0">
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
        <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-none border border-black">
          {/* Left: Course Name & Validity */}
          <div className="min-w-0 flex-1 space-y-0.5">
            <span className="font-bold text-neutral-900 text-sm sm:text-base block truncate">
              {displayCourse}
            </span>
            <span className="text-xs font-semibold text-neutral-500 block">{validityLabel}</span>
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
        <p className="text-xs text-neutral-500 font-normal">Payment receipt has been sent to</p>
        <p className="text-xs font-semibold text-neutral-800 break-all">
          {data.studentEmail || 'your email'}
        </p>
      </div>

      {/* 4. Action Buttons (Identical dimensions, blue border on download button, no arrow) */}
      <div className="space-y-2.5 pt-2">
        {/* Primary CTA */}
        <Link
          href={`/learn/${data.courseSlug || 'hydraulic-engineering-mastery'}`}
          className="w-full h-12 bg-black hover:bg-[#262626] active:bg-[#171717] text-white font-bold text-sm sm:text-[15px] rounded-none shadow-sm hover:shadow transition-all flex items-center justify-center cursor-pointer tracking-wide"
        >
          <span>Start learning</span>
        </Link>

        {/* Secondary CTA */}
        {onDownloadInvoice && (
          <button
            type="button"
            onClick={onDownloadInvoice}
            disabled={downloadingInvoice}
            className="w-full h-12 border border-black bg-white hover:bg-neutral-100 text-black font-bold text-sm sm:text-[15px] rounded-none transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center text-center"
          >
            {downloadingInvoice ? 'Downloading Receipt...' : 'Download Receipt'}
          </button>
        )}
      </div>
    </div>
  );
}
