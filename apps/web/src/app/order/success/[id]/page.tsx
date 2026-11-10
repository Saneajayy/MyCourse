'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiClient, getAccessToken } from '../../../../lib/api-client';
import { formatDisplayOrderId } from '../../../../lib/order';
import { siteConfig } from '../../../../config/site';
import {
  Download,
  Play,
  Loader2,
  ArrowRight,
  BookOpen,
} from 'lucide-react';

interface OrderSuccessData {
  id: string;
  orderNumber?: string;
  status: string;
  totalPaise?: number;
  amountPaise?: number;
  currency: string;
  createdAt: string;
  product: {
    title: string;
    slug: string;
    validityDays: number;
  };
  invoice?: {
    id: string;
    invoiceNumber: string;
  } | null;
}

function OrderSuccessNavbar() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 w-full figma-glass-nav font-reddit select-none">
      <nav
        aria-label="Order Confirmation Navigation"
        className="w-full h-20 md:h-[84px] flex items-stretch justify-between"
      >
        {/* Left: Brand Logo + Quick Links */}
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

          <div className="hidden sm:flex items-center gap-6">
            <Link
              href="/#syllabus"
              className="text-white/80 hover:text-white font-semibold text-sm tracking-normal transition-colors py-2"
            >
              Course Overview
            </Link>
          </div>
        </div>

        {/* Right: Student Dashboard Action */}
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

export default function OrderSuccessPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderSuccessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    async function fetchOrder() {
      try {
        const res = await apiClient<OrderSuccessData>(`/orders/${orderId}`);
        if (res.status !== 'PAID') {
          // Not verified yet; send to pending
          router.replace(`/order/pending/${orderId}`);
          return;
        }
        setOrder(res);
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Could not retrieve order details');
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
  }, [orderId, router]);

  const handleDownloadInvoice = async (e: React.MouseEvent) => {
    if (!order?.invoice?.id) return;
    e.preventDefault();
    try {
      setDownloading(true);
      const token = getAccessToken();
      const invoiceUrl = `${siteConfig.urls.api}/api/v1/invoices/${order.invoice.id}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`;

      const res = await fetch(invoiceUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });

      if (!res.ok) {
        // Fallback directly to browser window with token
        window.open(invoiceUrl, '_blank');
        return;
      }

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `Invoice-${order.invoice.invoiceNumber.replace(/[\/\\]/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Invoice download failed:', err);
      // Fallback
      const token = getAccessToken();
      const fallbackUrl = `${siteConfig.urls.api}/api/v1/invoices/${order.invoice.id}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      window.open(fallbackUrl, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#0033FF] min-h-screen text-white font-reddit relative selection:bg-white selection:text-[#0033FF] overflow-x-hidden pt-20 md:pt-[84px] flex flex-col justify-between">
        <div className="noise-texture" aria-hidden="true" />
        <OrderSuccessNavbar />
        <div className="w-full flex-1 flex flex-col items-center justify-center py-28 space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-white" />
          <p className="text-sm font-semibold tracking-wider uppercase text-white/80">
            Loading Order Receipt...
          </p>
        </div>
      </div>
    );
  }

  if (errorMsg || !order) {
    return (
      <div className="bg-[#0033FF] min-h-screen text-white font-reddit relative selection:bg-white selection:text-[#0033FF] overflow-x-hidden pt-20 md:pt-[84px] flex flex-col justify-between">
        <div className="noise-texture" aria-hidden="true" />
        <OrderSuccessNavbar />
        <main className="relative z-10 flex-1 w-full max-w-[1440px] mx-auto py-12 sm:py-16 px-4 flex items-center justify-center">
          <div className="max-w-md bg-white p-8 rounded-lg text-neutral-900 space-y-4 text-center">
            <h2 className="text-xl font-bold text-rose-600">Order Notice</h2>
            <p className="text-sm text-neutral-600">
              {errorMsg || 'Order details not found.'}
            </p>
            <Link
              href="/my-courses"
              className="inline-flex items-center justify-center h-11 px-6 bg-[#0033FF] text-white font-bold text-sm uppercase rounded-md hover:bg-[#0028D6] transition-colors"
            >
              Go to My Courses
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const amountPaise = order.totalPaise ?? order.amountPaise ?? 0;
  const amountRupees = amountPaise / 100;
  const formattedAmount =
    amountRupees % 1 === 0
      ? amountRupees.toLocaleString('en-IN')
      : amountRupees.toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  const displayCourseTitle =
    order.product.title === 'Industrial Hydraulic Systems & Circuit Design'
      ? 'Hydraulic System Basics'
      : order.product.title || 'Hydraulic System Basics';

  return (
    <div className="bg-[#0033FF] min-h-screen text-white font-reddit relative selection:bg-white selection:text-[#0033FF] overflow-x-hidden pt-20 md:pt-[84px] flex flex-col justify-between">
      {/* Background Noise Texture Overlay */}
      <div className="noise-texture" aria-hidden="true" />

      {/* Floating Glass Navbar */}
      <OrderSuccessNavbar />

      {/* SVG Filters for Deckled Torn-Paper Texture Effect */}
      <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
        <defs>
          <filter
            id="figma-texture-order-success"
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

      {/* Main Content Area: Centered horizontally and vertically */}
      <main className="relative z-10 flex-1 w-full max-w-[1440px] mx-auto py-10 sm:py-14 md:py-16 pb-16 sm:pb-24 px-4 sm:px-6 md:px-8 flex flex-col items-center justify-center">
        {/* Signature Deckled Torn-Paper Receipt Card Centered on Screen */}
        <div className="relative w-full max-w-xl sm:max-w-2xl p-7 sm:p-9 md:p-10 select-none drop-shadow-[0_20px_35px_rgba(0,0,60,0.35)] my-auto">
          {/* Textured White Card Background via SVG Filter */}
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
                filter="url(#figma-texture-order-success)"
              />
            </svg>
          </div>

          {/* Card Content in Clean Dark Typography */}
          <div className="relative z-10 w-full text-neutral-900 space-y-6 text-left">
            {/* Top Title: Blue PAYMENT CONFIRMED. */}
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0033FF] uppercase tracking-tight">
                PAYMENT CONFIRMED.
              </h1>
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-normal">
                Welcome to the course. Your course access has been activated and your official tax invoice is generated below.
              </p>
            </div>

            {/* Receipt Table: Plain White with Edge-to-Edge Border Lines & Square Corners */}
            <div className="w-full border border-neutral-300 bg-white rounded-none">
              <div className="flex flex-col px-4 py-3 sm:px-5 sm:py-3.5 border-b border-neutral-300 gap-1">
                <span className="font-bold text-neutral-500 uppercase tracking-wider text-xs">
                  Order ID
                </span>
                <span className="font-mono font-bold text-neutral-900 text-xs sm:text-sm break-all">
                  {formatDisplayOrderId(order.orderNumber || order.id)}
                </span>
              </div>

              <div className="flex flex-col px-4 py-3 sm:px-5 sm:py-3.5 border-b border-neutral-300 gap-1">
                <span className="font-bold text-neutral-500 uppercase tracking-wider text-xs">
                  Course
                </span>
                <span className="font-bold text-neutral-900 text-xs sm:text-sm text-left uppercase">
                  {displayCourseTitle}
                </span>
              </div>

              <div className="flex flex-col px-4 py-3 sm:px-5 sm:py-3.5 border-b border-neutral-300 gap-1">
                <span className="font-bold text-neutral-500 uppercase tracking-wider text-xs">
                  Access Period
                </span>
                <span className="font-bold text-neutral-900 text-xs sm:text-sm text-left uppercase">
                  {order.product.validityDays} Days (1 Year)
                </span>
              </div>

              <div className="flex flex-col px-4 py-3 sm:px-5 sm:py-3.5 gap-1">
                <span className="font-bold text-neutral-500 uppercase tracking-wider text-xs">
                  Amount Paid
                </span>
                <span className="font-mono text-xl sm:text-2xl font-black text-[#0033FF]">
                  ₹{formattedAmount}
                </span>
              </div>
            </div>

            {/* Action Buttons: Equal full-width heights and solid proportions on mobile & desktop */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link
                href={`/learn/${order.product.slug}`}
                className="w-full sm:flex-1 h-12 min-h-[48px] bg-[#0033FF] hover:bg-[#0028D6] active:bg-[#0020b8] text-white font-bold text-sm rounded-md sm:rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer uppercase tracking-wider shrink-0"
              >
                <Play className="w-4 h-4 fill-white text-white" />
                <span>Start Learning Now</span>
              </Link>

              {order.invoice && (
                <button
                  type="button"
                  onClick={handleDownloadInvoice}
                  disabled={downloading}
                  className="w-full sm:flex-1 h-12 min-h-[48px] px-6 rounded-md sm:rounded-lg border border-neutral-300 hover:border-black bg-white hover:bg-neutral-50 text-neutral-900 font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-60 shrink-0"
                >
                  {downloading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#0033FF]" />
                  ) : (
                    <Download className="w-4 h-4 text-[#0033FF]" />
                  )}
                  <span>{downloading ? 'Downloading...' : 'Download Tax Invoice'}</span>
                </button>
              )}
            </div>

            {/* Quick Link to My Courses */}
            <div className="pt-1">
              <Link
                href="/my-courses"
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-neutral-500 hover:text-neutral-900 transition-colors"
              >
                <span>View all your courses in My Courses</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
