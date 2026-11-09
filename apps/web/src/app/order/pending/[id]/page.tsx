'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '../../../../lib/api-client';
import { formatDisplayOrderId } from '../../../../lib/order';
import { Loader2, AlertCircle, RefreshCw, BookOpen } from 'lucide-react';

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

function OrderPendingNavbar() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 w-full figma-glass-nav font-reddit select-none">
      <nav
        aria-label="Order Status Navigation"
        className="w-full h-20 md:h-[84px] flex items-stretch justify-between"
      >
        <div className="flex items-center pl-8 sm:pl-12 md:pl-16 lg:pl-20 xl:pl-24 gap-6 sm:gap-8 lg:gap-12">
          <Link
            href="/"
            className="flex flex-col justify-center -space-y-0.5 leading-[0.92] text-white hover:opacity-90 transition-opacity"
            aria-label="HYDRO BASICS Home"
          >
            <span className="font-extrabold text-[20px] tracking-[0.02em] uppercase leading-[0.92]">
              HYDRO
            </span>
            <span className="font-extrabold text-[20px] tracking-[0.02em] uppercase leading-[0.92]">
              BASICS
            </span>
          </Link>
        </div>

        <div className="flex items-stretch">
          <Link
            href="/my-courses"
            className="figma-glass-divider border-r border-white/20 h-full flex items-center justify-center px-6 sm:px-8 text-white font-bold text-sm sm:text-[15px] hover:bg-white/10 transition-colors gap-2"
          >
            <BookOpen className="w-4 h-4 text-white/80" />
            <span>My Courses</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}

export default function OrderPendingPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [, setOrder] = useState<OrderResponse | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

        if (res.status === 'FAILED') {
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
  };

  return (
    <div className="bg-[#0033FF] min-h-screen text-white font-reddit relative selection:bg-white selection:text-[#0033FF] overflow-x-hidden pt-20 md:pt-[84px] flex flex-col justify-between">
      <div className="noise-texture" aria-hidden="true" />
      <OrderPendingNavbar />

      <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
        <defs>
          <filter
            id="figma-texture-order-pending"
            x="-10%"
            y="-15%"
            width="120%"
            height="130%"
            filterUnits="objectBoundingBox"
            primitiveUnits="userSpaceOnUse"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.25"
              numOctaves="3"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="5.5"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <main className="relative z-10 flex-1 w-full max-w-[1440px] mx-auto py-10 sm:py-14 md:py-16 pb-16 sm:pb-24 pl-8 sm:pl-12 md:pl-16 lg:pl-20 xl:pl-24 pr-6 sm:pr-8 md:pr-12 lg:pr-16">
        <div className="mb-8 sm:mb-10 select-none">
          <h1 className="font-extrabold text-white uppercase leading-[0.88] tracking-[-0.02em] text-5xl sm:text-6xl md:text-7xl lg:text-[76px] xl:text-[84px] select-none">
            <span className="block">PAYMENT</span>
            <span className="block">VERIFYING.</span>
          </h1>
        </div>

        <div className="relative w-full max-w-xl sm:max-w-2xl p-7 sm:p-9 md:p-10 select-none drop-shadow-[0_20px_35px_rgba(0,0,60,0.35)] my-6">
          <div className="absolute inset-0 pointer-events-none overflow-visible">
            <svg className="w-full h-full overflow-visible" xmlns="http://www.w3.org/2000/svg">
              <rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                rx="5.1"
                ry="5.1"
                fill="white"
                filter="url(#figma-texture-order-pending)"
              />
            </svg>
          </div>

          <div className="relative z-10 w-full text-neutral-900 space-y-6 text-left">
            {!isTimedOut && !errorMsg && (
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-[#0033FF]/10 text-[#0033FF] inline-flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin stroke-[2.5]" />
                </div>
                <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">
                  Confirming Payment with Gateway
                </h2>
                <p className="text-sm text-neutral-600 leading-relaxed">
                  We are validating the payment signature with the payment provider. Please do not close or refresh this tab.
                </p>
                <div className="p-3 bg-neutral-50 rounded-md border border-neutral-200 text-xs font-mono text-neutral-600">
                  Verifying Order: {formatDisplayOrderId(orderId)} (Attempt {pollCount + 1}/15)
                </div>
              </div>
            )}

            {isTimedOut && (
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 border border-amber-300 inline-flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 stroke-[2.5]" />
                </div>
                <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">
                  Payment Confirmation in Progress
                </h2>
                <p className="text-sm text-neutral-600 leading-relaxed">
                  Your bank or UPI app has completed the transaction, but we have not received the webhook confirmation yet.
                </p>
                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <button
                    type="button"
                    onClick={handleManualRefresh}
                    className="h-11 px-6 bg-[#0033FF] hover:bg-[#0028D6] text-white font-bold text-sm uppercase rounded-md shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Check Status Again</span>
                  </button>
                  <Link
                    href="/my-courses"
                    className="h-11 px-6 rounded-md border border-neutral-300 hover:border-black bg-white hover:bg-neutral-50 text-neutral-900 font-bold text-sm uppercase flex items-center justify-center transition-colors"
                  >
                    Go to My Courses
                  </Link>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="space-y-4">
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-md text-rose-900 text-sm font-semibold">
                  {errorMsg}
                </div>
                <Link
                  href="/checkout"
                  className="inline-flex items-center justify-center h-11 px-6 bg-[#0033FF] hover:bg-[#0028D6] text-white font-bold text-sm uppercase rounded-md transition-colors"
                >
                  Return to Checkout
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
