'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '../../../../lib/api-client';
import { BookOpen } from 'lucide-react';
import { PaymentPendingCard } from '../../../../components/PaymentPendingCard';

interface OrderResponse {
  id: string;
  status: 'CREATED' | 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
  totalPaise?: number;
  amountPaise?: number;
  product: {
    title: string;
    slug: string;
  };
}

export default function OrderPendingPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.style.backgroundColor = '#000000';
    document.body.style.backgroundColor = '#000000';
    return () => {
      document.documentElement.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
    };
  }, []);

  useEffect(() => {
    if (!orderId) return;

    let isMounted = true;
    let timer: NodeJS.Timeout;

    async function checkOrderStatus() {
      try {
        const res = await apiClient<OrderResponse>(`/orders/${orderId}`);
        if (!isMounted) return;

        setOrder(res);

        if (res.status === 'PAID') {
          router.replace(`/order/success/${orderId}`);
          return;
        }

        if (res.status === 'FAILED' || res.status === 'CANCELLED') {
          router.replace(`/order/failed/${orderId}`);
          return;
        }

        // Still PENDING or CREATED
        setPollCount((prev) => {
          if (prev >= 15) {
            setIsTimedOut(true);
            return prev;
          }
          timer = setTimeout(checkOrderStatus, 2000);
          return prev + 1;
        });
      } catch (err: unknown) {
        if (!isMounted) return;
        setErrorMsg(err instanceof Error ? err.message : 'Failed to verify payment status');
      }
    }

    checkOrderStatus();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [orderId, router]);

  const handleManualRefresh = () => {
    setIsTimedOut(false);
    setPollCount(0);
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 w-full h-[100dvh] max-h-[100dvh] bg-black text-white p-2.5 sm:p-3 overflow-hidden font-reddit selection:bg-white selection:text-black z-10 flex flex-col lg:flex-row gap-2.5 sm:gap-3">
      {/* ============================================================== */}
      {/* LEFT CARD (Desktop Only): Signature Fractal Glass Graphic     */}
      {/* ============================================================== */}
      <div className="hidden lg:relative lg:flex lg:flex-col lg:w-1/2 h-full bg-[#101012] border border-white/[0.08] rounded-xl overflow-hidden select-none p-6 sm:p-8 shrink-0">
        {/* Full-Bleed Fractal Glass Graphic */}
        <Image
          src="/fractal-glass-5.jpg"
          alt="HydroBasics Industrial Hydraulic Engineer"
          fill
          priority
          sizes="50vw"
          className="object-cover object-center select-none"
        />
        {/* Top Vignette Gradient Overlay */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent pointer-events-none"
          aria-hidden="true"
        />

        {/* Top Header Row over Image */}
        <div className="relative z-10 w-full flex items-center justify-between">
          <Link href="/" className="flex flex-col select-none group" title="HYDRO BASICS Home">
            <span className="font-extrabold text-[15px] sm:text-[16px] text-white leading-[1.05] tracking-wider uppercase group-hover:text-white/80 transition-colors">
              HYDRO
            </span>
            <span className="font-extrabold text-[15px] sm:text-[16px] text-white leading-[1.05] tracking-wider uppercase group-hover:text-white/80 transition-colors">
              BASICS
            </span>
          </Link>
        </div>
      </div>

      {/* ============================================================== */}
      {/* RIGHT CARD: Pending Card & Navigation                          */}
      {/* ============================================================== */}
      <div className="w-full flex-1 min-h-0 lg:w-1/2 lg:h-full bg-[#101012] border border-white/[0.08] rounded-xl flex flex-col overflow-hidden relative">
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 flex items-center justify-between shrink-0">
          <Link href="/" className="lg:hidden flex flex-col select-none group" title="HYDRO BASICS Home">
            <span className="font-extrabold text-[15px] text-white leading-[1.05] tracking-wider uppercase">
              HYDRO
            </span>
            <span className="font-extrabold text-[15px] text-white leading-[1.05] tracking-wider uppercase">
              BASICS
            </span>
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-[11px] font-mono tracking-wider text-[#c2c4cc]/70 hover:text-white transition-colors ml-auto"
            title="Go to My Courses"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>My Courses &rarr;</span>
          </Link>
        </div>

        {/* Thin Stroke Separation Line */}
        <div className="border-b border-white/[0.08] w-full shrink-0" />

        {/* Scrollable Center Section */}
        <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar p-4 sm:p-6 lg:p-8 flex flex-col items-center lg:justify-center">
          <div className="w-full max-w-[420px] sm:max-w-[440px] space-y-4 py-2 pb-8 lg:py-0 lg:my-auto">
            <PaymentPendingCard
              orderId={orderId}
              courseTitle={order?.product?.title}
              pollCount={pollCount}
              maxPoll={15}
              isTimedOut={isTimedOut}
              errorMsg={errorMsg}
              onRefresh={handleManualRefresh}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
