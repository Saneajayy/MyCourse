'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { X, Check } from 'lucide-react';

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
  '#FFFFFF',
  '#34D399', // emerald
  '#60A5FA', // sky blue
  '#FBBF24', // amber
  '#A78BFA', // purple
  '#F472B6', // pink
  '#2DD4BF', // teal
];

function createBurstParticles(cx: number, cy: number, count = 28): ConfettiParticle[] {
  const particles: ConfettiParticle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
    const speed = 2.2 + Math.random() * 3.5;
    const shapes: ('rect' | 'circle' | 'sparkle')[] = ['rect', 'circle', 'sparkle'];
    const chosenShape = shapes[Math.floor(Math.random() * shapes.length)] || 'rect';
    const chosenColor = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)] || '#FFFFFF';

    particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.8,
      width: chosenShape === 'rect' ? 5 + Math.random() * 5 : 4 + Math.random() * 3,
      height: chosenShape === 'rect' ? 8 + Math.random() * 6 : 4 + Math.random() * 3,
      color: chosenColor,
      rotation: Math.random() * Math.PI * 2,
      vRotation: (Math.random() - 0.5) * 0.25,
      flutterSpeed: 0.05 + Math.random() * 0.08,
      opacity: 1,
      life: 0,
      maxLife: 60 + Math.random() * 40,
      shape: chosenShape,
    });
  }
  return particles;
}

function ConfettiBurst() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let particles: ConfettiParticle[] = [];

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const w = 260;
    const h = 190;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const burst = () => {
      particles = createBurstParticles(w / 2, h / 2 - 10, 24);
    };

    burst();
    const timers = [
      setTimeout(burst, 800),
      setTimeout(burst, 2200),
      setTimeout(burst, 4200),
    ];
    const burstInterval = setInterval(burst, 6000);

    const render = () => {
      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!p) continue;

        p.life++;
        p.x += p.vx;
        p.vy += 0.08; // subtle gravity
        p.rotation += p.vRotation;

        const progress = p.life / p.maxLife;
        if (progress > 0.6) {
          p.opacity = Math.max(0, 1 - (progress - 0.6) / 0.4);
        }

        if (p.opacity <= 0 || p.y > h + 10) {
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
    <div className="relative w-full max-w-[420px] sm:max-w-[440px] mx-auto bg-[#151619] border border-white/[0.08] hover:border-white/[0.14] rounded-xl p-5 sm:p-7 select-none font-reddit text-left space-y-4 shadow-2xl transition-all">
      {/* Simple Cross Icon inside top right corner */}
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

      {/* 1. Header: Emerald Badge with White Tick Above Title + Confetti Burst */}
      <div className="flex flex-col items-center text-center space-y-3 pb-1">
        <div className="relative flex items-center justify-center">
          <ConfettiBurst />
          <div className="relative z-10 w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Check className="w-6 h-6 stroke-[2.5]" aria-hidden="true" />
          </div>
        </div>

        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight">
            Payment Successful
          </h2>
          <p className="text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed">
            Your course access has been activated.
          </p>
        </div>
      </div>

      {/* Separation Line */}
      <div className="-mx-5 sm:-mx-7 border-t border-white/[0.06]" />

      {/* 2. Combined Course & Price Box */}
      <div className="pt-0.5">
        <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-lg bg-[#1b1c20] border border-white/[0.08]">
          {/* Left: Course Name & Validity */}
          <div className="min-w-0 flex-1 space-y-0.5">
            <span className="font-bold text-white text-sm sm:text-base block truncate">
              {displayCourse}
            </span>
            <span className="text-xs font-mono font-medium text-emerald-400 block">
              {validityLabel}
            </span>
          </div>

          {/* Right: Price & Taxes note */}
          <div className="shrink-0 text-right space-y-0.5">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight leading-none block">
              ₹{formattedAmount}
            </span>
            <span className="text-[10px] sm:text-[11px] text-[#80828d] font-medium block">
              Including all taxes &amp; GST
            </span>
          </div>
        </div>
      </div>

      {/* 3. Confirmation Notice */}
      <div className="pt-1 text-center space-y-0.5">
        <p className="text-xs text-[#80828d]">Payment receipt has been sent to</p>
        <p className="text-xs font-semibold text-white break-all">
          {data.studentEmail || 'your email'}
        </p>
      </div>

      {/* 4. Action Buttons */}
      <div className="space-y-2.5 pt-2">
        {/* Primary CTA */}
        <Link
          href={`/learn/${data.courseSlug || 'hydraulic-system-basics'}`}
          className="w-full h-11 bg-white hover:bg-neutral-200 active:bg-neutral-300 text-black font-semibold text-xs sm:text-sm rounded-lg transition-colors flex items-center justify-center cursor-pointer shadow-sm"
        >
          <span>Start Learning &rarr;</span>
        </Link>

        {/* Secondary CTA */}
        {onDownloadInvoice && (
          <button
            type="button"
            onClick={onDownloadInvoice}
            disabled={downloadingInvoice}
            className="w-full h-11 border border-white/[0.08] hover:border-white/[0.14] bg-[#1b1c20] hover:bg-[#22242a] text-white font-medium text-xs sm:text-sm rounded-lg transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center text-center"
          >
            {downloadingInvoice ? 'Downloading Receipt...' : 'Download Receipt'}
          </button>
        )}
      </div>
    </div>
  );
}
