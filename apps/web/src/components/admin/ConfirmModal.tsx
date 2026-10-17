'use client';

import React from 'react';
import { Button } from '../ui/Button';
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-course-darkBlue/75"
    >
      <div className="relative w-full max-w-lg bg-course-white border-2 border-black p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 border border-black flex items-center justify-center shrink-0 ${
                isDestructive ? 'bg-rose-100 text-rose-700' : 'bg-course-orangeSubtle text-course-orange'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 id="confirm-modal-title" className="text-base font-black text-course-darkBlue">
                {title}
              </h3>
              <p className="text-xs text-course-navySubtle mt-0.5">Please confirm your action</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="p-1 border border-black hover:bg-neutral-100 min-h-[32px] min-w-[32px] inline-flex items-center justify-center"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4 text-course-darkBlue" />
          </button>
        </div>

        {/* Description / Message */}
        {modalBody && (
          <div className="p-3 bg-neutral-50 border border-black text-xs text-course-navyMuted space-y-2">
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
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2 border-t border-black">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="text-xs font-bold uppercase tracking-wider py-2.5"
          >
            {cancelText}
          </Button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`min-h-[44px] px-5 py-2.5 border border-black font-black text-xs uppercase tracking-wider transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2 ${
              isDestructive
                ? 'bg-rose-600 text-white hover:bg-rose-700'
                : 'bg-course-orange text-white hover:bg-course-orangeHover'
            }`}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
