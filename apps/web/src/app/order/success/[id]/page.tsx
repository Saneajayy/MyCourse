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
    document.documentElement.style.backgroundColor = '#000000';
    document.body.style.backgroundColor = '#000000';
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
      <div className="fixed inset-0 w-full h-[100dvh] flex flex-col items-center justify-center space-y-3 bg-black text-white font-reddit">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
        <p className="text-xs font-mono tracking-wider uppercase text-[#c2c4cc]">
          Loading Order Receipt...
        </p>
      </div>
    );
  }

  if (errorMsg || !order) {
    return (
      <div className="fixed inset-0 w-full h-[100dvh] flex flex-col items-center justify-center p-4 bg-black text-white font-reddit">
        <div className="max-w-md w-full bg-[#151619] border border-white/[0.08] rounded-xl p-7 sm:p-8 space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6 stroke-[2]" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white tracking-tight">Order Not Found</h2>
            <p className="text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed">
              We couldn&apos;t retrieve the order details for this reference. Please check your student portal or contact support.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <Link
              href="/dashboard"
              className="flex-1 inline-flex items-center justify-center h-11 px-5 bg-white text-black font-semibold text-xs rounded-lg hover:bg-neutral-200 transition-colors"
            >
              Go to My Courses
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center h-11 px-5 border border-white/[0.08] hover:border-white/[0.14] bg-[#1b1c20] text-white font-medium text-xs rounded-lg hover:bg-[#22242a] transition-colors"
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
    <div className="fixed inset-0 w-full h-[100dvh] max-h-[100dvh] bg-black text-white p-2.5 sm:p-3 overflow-hidden font-reddit selection:bg-white selection:text-black z-10 flex flex-col lg:flex-row gap-2.5 sm:gap-3">
      {/* ============================================================== */}
      {/* LEFT CARD (Desktop Only): Signature Fractal Glass Graphic     */}
      {/* ============================================================== */}
      <div className="hidden lg:relative lg:flex lg:flex-col lg:justify-between lg:w-1/2 h-full bg-[#101012] border border-white/[0.08] rounded-xl overflow-hidden select-none p-6 sm:p-8 shrink-0">
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
        {/* Bottom Gradient for Text Legibility while keeping image vivid */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#101012] via-[#101012]/35 to-transparent pointer-events-none"
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

        {/* Bottom Details over Image */}
        <div className="relative z-10 w-full space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[11px] font-mono font-medium tracking-wider uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>PAYMENT CONFIRMED</span>
            </span>
          </div>

          <div className="flex items-end justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
                {displayCourseTitle}
              </h2>
              <p className="text-xs sm:text-[13px] text-[#c2c4cc]">
                12 Months Full Access Activated
              </p>
            </div>
            <div className="flex flex-col items-end shrink-0 text-right">
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#80828d]">
                Amount Paid
              </span>
              <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white leading-none">
                ₹{formattedAmount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* RIGHT CARD: Success Card & Navigation                          */}
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
            <PaymentSuccessCard
              data={{
                orderId: order.id,
                orderNumber: order.orderNumber,
                transactionId:
                  order.payments?.[0]?.razorpayPaymentId || order.id.slice(-8).toUpperCase(),
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
