'use client';

import React, { useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { PaymentSuccessCard, PaymentSuccessData } from './PaymentSuccessCard';
export type { PaymentSuccessData };

export interface PaymentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: 'verifying' | 'success';
  data?: PaymentSuccessData | null;
  onDownloadInvoice?: (e: React.MouseEvent) => void;
  downloadingInvoice?: boolean;
}

export function PaymentSuccessModal({
  isOpen,
  onClose,
  status,
  data,
  onDownloadInvoice,
  downloadingInvoice = false,
}: PaymentSuccessModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 overflow-y-auto select-none transition-all duration-200"
    >
      {/* Click backdrop to close */}
      <div className="fixed inset-0" aria-hidden="true" onClick={onClose} />

      {/* Modal Dialog Content */}
      <div className="relative z-10 w-full max-w-[460px] my-auto">
        {status === 'verifying' ? (
          <div className="relative bg-white rounded-none p-8 sm:p-10 shadow-2xl border border-neutral-100 text-center space-y-4">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 text-neutral-400 hover:text-black transition-colors cursor-pointer p-1 z-20 focus:outline-none"
            >
              <X className="w-5 h-5 stroke-[2]" />
            </button>
            <Loader2 className="w-12 h-12 animate-spin text-black mx-auto" />
            <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight">
              Verifying Payment...
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed max-w-sm mx-auto">
              Please wait while we confirm your transaction and activate your course enrollment with
              the bank.
            </p>
          </div>
        ) : data ? (
          <PaymentSuccessCard
            data={data}
            onDownloadInvoice={onDownloadInvoice}
            downloadingInvoice={downloadingInvoice}
            onClose={onClose}
          />
        ) : null}
      </div>
    </div>
  );
}
