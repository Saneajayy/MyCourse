'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Card, Badge } from '../../../../components/ui';
import { apiClient } from '../../../../lib/api-client';
import { siteConfig } from '../../../../config/site';
import { CheckCircle2, Download, PlayCircle, Loader2 } from 'lucide-react';

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

export default function OrderSuccessPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderSuccessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-course-orange" />
        <p className="text-xs uppercase font-mono tracking-widest text-course-darkBlue">
          Loading Order Receipt...
        </p>
      </div>
    );
  }

  if (errorMsg || !order) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="p-4 border border-black bg-rose-50 text-rose-950 text-xs font-bold mb-4">
          {errorMsg || 'Order details not found'}
        </div>
        <Link href="/my-courses" className="btn-primary text-xs py-3">
          Go to My Courses
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center px-4 py-16 bg-course-white">
      <div className="w-full max-w-xl">
        <Card variant="default" padding="lg" className="border-2 text-center">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-700 inline-flex items-center justify-center border-2 border-emerald-800 mb-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-700" />
          </div>

          <div className="inline-block mb-3">
            <Badge variant="success">Payment Confirmed • Access Active</Badge>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-course-darkBlue tracking-tight mb-2">
            Enrollment Confirmed!
          </h1>
          <p className="text-xs md:text-sm text-course-navyMuted max-w-md mx-auto mb-8 leading-relaxed">
            Welcome to the course. Your course access has been activated and your official tax
            invoice is generated below.
          </p>

          {/* Receipt Breakdown Card */}
          <div className="border border-black p-6 bg-course-bg text-left space-y-3 text-xs mb-8">
            <div className="flex justify-between items-center border-b border-black/10 pb-2">
              <span className="font-bold text-course-navySubtle uppercase">Order ID</span>
              <span className="font-mono font-bold text-course-darkBlue">{order.id}</span>
            </div>
            <div className="flex justify-between items-center border-b border-black/10 pb-2">
              <span className="font-bold text-course-navySubtle uppercase">Course</span>
              <span className="font-bold text-course-darkBlue">{order.product.title}</span>
            </div>
            <div className="flex justify-between items-center border-b border-black/10 pb-2">
              <span className="font-bold text-course-navySubtle uppercase">Access Period</span>
              <span className="font-bold text-course-darkBlue">
                {order.product.validityDays} Days (1 Year)
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-course-navySubtle uppercase">Amount Paid</span>
              <span className="font-mono text-base font-black text-course-darkBlue">
                ₹{((order.totalPaise ?? order.amountPaise ?? 0) / 100).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={`/learn/${order.product.slug}`}
              className="btn-primary w-full sm:w-auto uppercase tracking-wide text-xs py-3.5 flex items-center justify-center gap-2 font-black"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Start Learning Now</span>
            </Link>

            {order.invoice && (
              <a
                href={`${siteConfig.urls.api}/api/v1/invoices/${order.invoice.id}/download`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline w-full sm:w-auto uppercase tracking-wide text-xs py-3.5 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 text-course-orange" />
                <span>Download Tax Invoice</span>
              </a>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
