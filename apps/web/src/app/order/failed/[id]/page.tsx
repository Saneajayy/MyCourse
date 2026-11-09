'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { formatDisplayOrderId } from '../../../../lib/order';
import { XCircle, RefreshCw, ArrowLeft, BookOpen } from 'lucide-react';

function OrderFailedNavbar() {
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

export default function OrderFailedPage() {
  const params = useParams();
  const orderId = params.id as string;

  return (
    <div className="bg-[#0033FF] min-h-screen text-white font-reddit relative selection:bg-white selection:text-[#0033FF] overflow-x-hidden pt-20 md:pt-[84px] flex flex-col justify-between">
      <div className="noise-texture" aria-hidden="true" />
      <OrderFailedNavbar />

      <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
        <defs>
          <filter
            id="figma-texture-order-failed"
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
            <span className="block">DECLINED.</span>
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
                filter="url(#figma-texture-order-failed)"
              />
            </svg>
          </div>

          <div className="relative z-10 w-full text-neutral-900 space-y-6 text-left">
            <div>
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-sm">
                <XCircle className="w-4 h-4 text-rose-700 stroke-[2.5]" />
                <span>Transaction Incomplete</span>
              </span>
            </div>

            <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">
              Payment Not Completed
            </h2>

            <p className="text-sm text-neutral-600 leading-relaxed font-normal">
              The transaction was declined by your bank or cancelled before completion. If any amount was debited, it will be automatically reversed by your bank within 2-4 business days.
            </p>

            <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-4 text-xs font-mono text-neutral-700 flex justify-between items-center">
              <span className="font-bold text-neutral-500 uppercase">Order Reference</span>
              <span className="font-bold text-neutral-900">{formatDisplayOrderId(orderId)}</span>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link
                href="/checkout"
                className="flex-1 h-12 bg-[#0033FF] hover:bg-[#0028D6] active:bg-[#0020b8] text-white font-bold text-sm uppercase rounded-md sm:rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer tracking-wider"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry Payment</span>
              </Link>
              <Link
                href="/"
                className="h-12 px-6 rounded-md sm:rounded-lg border border-neutral-300 hover:border-black bg-white hover:bg-neutral-50 text-neutral-900 font-bold text-sm uppercase flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Homepage</span>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
