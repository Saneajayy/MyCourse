'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Card, Button } from '../../../../components/ui';
import { apiClient } from '../../../../lib/api-client';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

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
          // Server confirmed payment!
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
          // Schedule next poll in 2 seconds
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
    <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center px-4 py-16 bg-course-white">
      <div className="w-full max-w-lg">
        <Card variant="default" padding="lg" className="border-2 text-center">
          {!isTimedOut && !errorMsg && (
            <div className="py-8 space-y-4">
              <div className="w-14 h-14 bg-course-orangeSubtle text-course-orange inline-flex items-center justify-center border border-black">
                <Loader2 className="w-8 h-8 animate-spin text-course-orange" />
              </div>
              <h1 className="text-2xl font-black text-course-darkBlue tracking-tight">
                Confirming Payment with Gateway
              </h1>
              <p className="text-xs md:text-sm text-course-navyMuted max-w-sm mx-auto leading-relaxed">
                We are validating the cryptographic signature from Razorpay. Please do not close or
                refresh this tab.
              </p>
              <div className="text-[11px] font-mono text-course-navySubtle">
                Verifying Order: {orderId} (Attempt {pollCount + 1}/15)
              </div>
            </div>
          )}

          {isTimedOut && (
            <div className="py-6 space-y-4">
              <div className="w-14 h-14 bg-amber-50 text-amber-700 inline-flex items-center justify-center border border-amber-800">
                <AlertCircle className="w-8 h-8 text-amber-700" />
              </div>
              <h1 className="text-2xl font-black text-course-darkBlue tracking-tight">
                Payment Confirmation in Progress
              </h1>
              <p className="text-xs md:text-sm text-course-navyMuted leading-relaxed">
                Your bank or UPI app has received the transaction, but we have not received the
                final webhook confirmation yet.
              </p>
              <p className="text-xs font-bold text-course-darkBlue">
                Access is not granted until the server confirms the transaction.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-black">
                <Button variant="primary" size="sm" onClick={handleManualRefresh}>
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                  Check Status Again
                </Button>
                <Link href="/my-courses" className="btn-outline text-xs">
                  Go to My Courses
                </Link>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="py-6 space-y-4">
              <div className="p-3 border border-black bg-rose-50 text-rose-950 text-xs font-bold">
                {errorMsg}
              </div>
              <Link href="/checkout" className="btn-primary block text-xs py-3">
                Return to Checkout
              </Link>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
