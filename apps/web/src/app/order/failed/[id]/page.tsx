'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card } from '../../../../components/ui';
import { XCircle, RefreshCw, ArrowLeft } from 'lucide-react';

export default function OrderFailedPage() {
  const params = useParams();
  const orderId = params.id as string;

  return (
    <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center px-4 py-16 bg-course-white">
      <div className="w-full max-w-lg">
        <Card variant="default" padding="lg" className="border-2 text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-700 inline-flex items-center justify-center border-2 border-rose-800 mb-4">
            <XCircle className="w-10 h-10 text-rose-700" />
          </div>

          <h1 className="text-2xl font-black text-course-darkBlue tracking-tight mb-2">
            Payment Not Completed
          </h1>
          <p className="text-xs md:text-sm text-course-navyMuted max-w-sm mx-auto mb-6 leading-relaxed">
            The transaction was declined by your bank or cancelled before completion. No money was
            debited, or any pending debit will be reversed by your bank within 2-4 business days.
          </p>

          <div className="border border-black p-4 bg-course-bg text-left text-xs mb-8">
            <div className="flex justify-between items-center">
              <span className="font-bold text-course-navySubtle uppercase">Order Reference</span>
              <span className="font-mono text-course-darkBlue">{orderId}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/checkout"
              className="btn-primary w-full sm:w-auto uppercase tracking-wide text-xs py-3.5 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Payment</span>
            </Link>
            <Link
              href="/"
              className="btn-outline w-full sm:w-auto uppercase tracking-wide text-xs py-3.5 flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Homepage</span>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
