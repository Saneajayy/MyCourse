'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiClient, getAccessToken } from '../../../../lib/api-client';
import { siteConfig } from '../../../../config/site';
import { Loader2, BookOpen, CheckCircle2, AlertCircle } from 'lucide-react';
import { PaymentSuccessCard } from '../../../../components/PaymentSuccessCard';

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
  payments?: Array<{
    id: string;
    razorpayPaymentId?: string;
    method?: string;
  }>;
  user?: {
    name?: string;
    email?: string;
  };
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
    document.documentElement.style.backgroundColor = '#FFFFFF';
    document.body.style.backgroundColor = '#FFFFFF';
    return () => {
      document.documentElement.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
    };
  }, []);

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
      <div className="w-full h-screen h-[100dvh] flex flex-col items-center justify-center space-y-4 bg-white font-reddit">
        <Loader2 className="w-10 h-10 animate-spin text-black" />
        <p className="text-sm font-semibold tracking-wider uppercase text-neutral-600">
          Loading Order Receipt...
        </p>
      </div>
    );
  }

  if (errorMsg || !order) {
    return (
      <div className="w-full h-screen h-[100dvh] flex flex-col items-center justify-center p-4 bg-white font-reddit">
        <div className="max-w-md w-full bg-white border border-neutral-200/80 rounded-none p-7 sm:p-8 text-neutral-900 space-y-4 text-center shadow-none">
          <div className="w-12 h-12 rounded-none bg-neutral-100 text-neutral-800 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-neutral-950">Order Not Found</h2>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              We couldn&apos;t retrieve the order details for this reference. Please check your student portal or contact support.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <Link
              href="/my-courses"
              className="flex-1 inline-flex items-center justify-center h-11 px-5 bg-black text-white font-bold text-xs uppercase tracking-wider rounded-none hover:bg-neutral-800 transition-colors"
            >
              Go to My Courses
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center h-11 px-5 border border-neutral-300 text-neutral-900 font-bold text-xs uppercase tracking-wider rounded-none hover:bg-neutral-50 transition-colors"
            >
              Contact Support
            </Link>
          </div>
        </div>
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

        {/* Confirmation Badge & Amount Paid Directly on Image */}
        <div className="relative z-10 w-full mb-1 select-none">
          <div className="flex items-end justify-between gap-4">
            <div className="shrink-0">
              <div className="h-11 flex items-center gap-2 px-4 rounded-none bg-emerald-500/25 border border-emerald-400/50 backdrop-blur-sm text-emerald-200 text-sm font-mono font-bold tracking-wide shadow-md">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>PAYMENT CONFIRMED</span>
              </div>
            </div>

            <div className="flex flex-col items-end shrink-0 text-right">
              <span className="text-[11px] uppercase font-bold tracking-wider text-neutral-400 drop-shadow">
                Amount Paid
              </span>
              <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white drop-shadow-lg leading-none">
                ₹{formattedAmount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* RIGHT COLUMN: Clean White Card & Navigation                    */}
      {/* ============================================================== */}
      <div className="w-full lg:w-1/2 h-full bg-white text-neutral-900 flex flex-col relative overflow-hidden">
        {/* Desktop Top Header Bar */}
        <header className="hidden lg:flex absolute top-0 inset-x-0 w-full items-center justify-between px-6 pt-5 sm:px-8 sm:pt-6 md:px-10 z-20 pointer-events-none">
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

        {/* Mobile Upper Part: Fixed Halftone Graphic */}
        <div className="lg:hidden relative w-full h-[220px] sm:h-[250px] bg-black shrink-0 overflow-hidden select-none flex flex-col justify-between p-4 sm:p-5">
          <Image
            src="/login-pixelated.png"
            alt="HydroBasics Industrial Hydraulic Engineer"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center mix-blend-screen opacity-95 select-none"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-[#000000]/95 via-[#000000]/35 to-[#000000]/45 pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative z-10 w-full flex items-center justify-between">
            <Link
              href="/my-courses"
              className="text-xs text-neutral-300 font-semibold flex items-center gap-1 hover:text-white"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>My Courses &rarr;</span>
            </Link>
            <Link
              href="/"
              className="flex flex-col items-end -space-y-0.5 leading-[0.92] text-white hover:opacity-90 transition-opacity select-none text-right cursor-pointer"
              aria-label="HYDRO BASICS Home"
            >
              <span className="font-extrabold text-[18px] sm:text-[20px] tracking-[0.02em] uppercase leading-[0.92]">
                HYDRO
              </span>
              <span className="font-extrabold text-[18px] sm:text-[20px] tracking-[0.02em] uppercase leading-[0.92]">
                BASICS
              </span>
            </Link>
          </div>

          <div className="relative z-10 w-full">
            <div className="flex items-end justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="h-10 flex items-center gap-1.5 px-3 rounded-none bg-emerald-500/25 border border-emerald-400/50 backdrop-blur-sm text-emerald-200 text-xs font-mono font-bold tracking-wide">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">PAYMENT CONFIRMED</span>
                </div>
              </div>

              <div className="flex flex-col items-end shrink-0 text-right">
                <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 drop-shadow">
                  Amount Paid
                </span>
                <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white drop-shadow-lg leading-none">
                  ₹{formattedAmount}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Center Section with Clean White Card (Reference Design) */}
        <div className="flex-1 w-full min-h-0 overflow-y-auto relative flex flex-col justify-center items-center py-6 sm:py-8 px-4">
          <div className="my-auto w-full max-w-[460px]">
            <PaymentSuccessCard
              data={{
                orderId: order.id,
                orderNumber: order.orderNumber,
                transactionId: order.payments?.[0]?.razorpayPaymentId || order.id.slice(-8).toUpperCase(),
                invoiceId: order.invoice?.invoiceNumber,
                invoiceDbId: order.invoice?.id,
                courseTitle: displayCourseTitle,
                courseSlug: order.product.slug,
                validityDays: order.product.validityDays,
                amountPaise: amountPaise,
                studentName: order.user?.name || 'Student',
                studentEmail: order.user?.email,
                paymentMethod: order.payments?.[0]?.method || 'Online / Razorpay',
                paymentTime: order.createdAt,
              }}
              onDownloadInvoice={order.invoice ? handleDownloadInvoice : undefined}
              downloadingInvoice={downloading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
