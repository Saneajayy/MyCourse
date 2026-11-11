'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '../../../../lib/api-client';
import { X, Loader2, BookOpen } from 'lucide-react';
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
    document.documentElement.style.backgroundColor = '#FFFFFF';
    document.body.style.backgroundColor = '#FFFFFF';
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
    <div className="w-full h-screen h-[100dvh] overflow-hidden bg-white font-reddit selection:bg-black selection:text-white flex flex-col lg:flex-row">
      {/* ============================================================== */}
      {/* LEFT COLUMN (Desktop Only): Signature Halftone Graphic         */}
      {/* ============================================================== */}
      <div className="hidden lg:relative lg:flex lg:flex-col lg:justify-end lg:w-1/2 h-full bg-black overflow-hidden select-none p-6 sm:p-8">
        <Image
          src="/login-pixelated.png"
          alt="HydroBasics Industrial Hydraulic Engineer"
          fill
          priority
          sizes="50vw"
          className="object-cover object-center mix-blend-screen opacity-95 select-none"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#000000]/95 via-[#000000]/45 to-transparent pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative z-10 w-full mb-1 select-none">
          <div className="flex items-end justify-between gap-4">
            <div className="shrink-0">
              <div className="h-11 flex items-center gap-2 px-4 rounded-md bg-amber-500/25 border border-amber-400/50 backdrop-blur-sm text-amber-200 text-sm font-mono font-bold tracking-wide shadow-md">
                <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
                <span>PAYMENT VERIFYING</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* RIGHT COLUMN: Clean White Background with Centered Pop-up Card */}
      {/* ============================================================== */}
      <div className="w-full lg:w-1/2 h-full bg-white text-neutral-900 flex flex-col relative overflow-hidden">
        {/* Top Header Bar */}
        <header className="absolute top-0 inset-x-0 w-full flex items-center justify-between px-6 pt-5 sm:px-8 sm:pt-6 md:px-10 z-20 pointer-events-none">
          <div className="pointer-events-auto">
            <Link
              href="/my-courses"
              className="text-xs sm:text-sm font-bold text-neutral-600 hover:text-black flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-black" />
              <span>My Courses &rarr;</span>
            </Link>
          </div>

          <Link
            href="/"
            className="pointer-events-auto flex flex-col items-end -space-y-0.5 leading-[0.92] text-black hover:opacity-90 transition-opacity select-none text-right cursor-pointer"
            aria-label="HYDRO BASICS Home - Back to Course"
          >
            <span className="font-extrabold text-[20px] sm:text-[22px] tracking-[0.02em] uppercase leading-[0.92]">
              HYDRO
            </span>
            <span className="font-extrabold text-[20px] sm:text-[22px] tracking-[0.02em] uppercase leading-[0.92]">
              BASICS
            </span>
          </Link>
        </header>

        {/* Center Section: Pop-up Card */}
        <div className="flex-1 w-full min-h-0 overflow-y-auto relative flex flex-col justify-center items-center py-6 sm:py-8 px-4">
          <div className="my-auto w-full max-w-[460px] relative">
            {/* Pop-up close X button in top right corner of card */}
            <Link
              href="/my-courses"
              aria-label="Close"
              className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white border border-neutral-200 text-neutral-600 hover:text-black hover:bg-neutral-100 flex items-center justify-center shadow-md transition-all cursor-pointer z-20"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </Link>

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
