'use client';

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description?: React.ReactNode;
  message?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose?: () => void;
  onCancel?: () => void;
  children?: React.ReactNode;
}

export function ConfirmModal({
  isOpen,
  title,
  description,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = true,
  isLoading = false,
  onConfirm,
  onClose,
  onCancel,
  children,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const handleClose = () => {
    if (onClose) onClose();
    else if (onCancel) onCancel();
  };

  const modalBody = description ?? message;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
    >
      <div className="relative w-full max-w-md bg-white border border-neutral-200/90 shadow-xl p-6 space-y-5 font-reddit">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 border flex items-center justify-center shrink-0 ${
                isDestructive
                  ? 'bg-rose-50 text-rose-600 border-rose-200'
                  : 'bg-neutral-100 text-neutral-800 border-neutral-200'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 id="confirm-modal-title" className="text-sm font-bold uppercase tracking-wider text-neutral-900">
                {title}
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">Please confirm your action</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="p-1 border border-neutral-200 hover:border-neutral-900 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 min-h-[32px] min-w-[32px] inline-flex items-center justify-center transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Description / Message */}
        {modalBody && (
          <div className="p-3 bg-neutral-50 border border-neutral-200/80 text-xs text-neutral-600 space-y-2">
            {typeof modalBody === 'string' ? (
              <p className="font-medium leading-relaxed">{modalBody}</p>
            ) : (
              modalBody
            )}
          </div>
        )}

        {/* Optional Custom Controls (like reason inputs or checkboxes) */}
        {children && <div className="space-y-3">{children}</div>}

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3 border-t border-neutral-200/80">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="min-h-[38px] px-4 py-2 border border-neutral-300 hover:border-neutral-900 text-neutral-700 hover:bg-neutral-50 text-xs font-semibold tracking-wide transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`min-h-[38px] px-5 py-2 text-xs font-semibold tracking-wide transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2 ${
              isDestructive
                ? 'bg-rose-600 text-white hover:bg-rose-700'
                : 'bg-neutral-900 text-white hover:bg-black'
            }`}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
