'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';

export type ToastType = 'info' | 'success' | 'error' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  info: (title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, title: string, message?: string, duration = 5000) => {
      // Toasts are strictly reserved for admin workflows; user interfaces use inline banners/states
      if (!isAdmin) return;

      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newToast: Toast = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [isAdmin, removeToast],
  );

  const info = useCallback(
    (title: string, msg?: string) => showToast('info', title, msg),
    [showToast],
  );
  const success = useCallback(
    (title: string, msg?: string) => showToast('success', title, msg),
    [showToast],
  );
  const error = useCallback(
    (title: string, msg?: string) => showToast('error', title, msg),
    [showToast],
  );
  const warning = useCallback(
    (title: string, msg?: string) => showToast('warning', title, msg),
    [showToast],
  );

  const contextValue = React.useMemo(
    () => ({ showToast, info, success, error, warning, removeToast }),
    [showToast, info, success, error, warning, removeToast],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {isAdmin && toasts.length > 0 && (
        <div
          aria-live="polite"
          className="fixed top-4 sm:top-5 right-0 sm:right-5 z-[9999] flex flex-col items-center sm:items-end gap-2.5 max-w-[380px] sm:max-w-[400px] w-full px-4 sm:px-0 pointer-events-none"
        >
          {toasts.map((toast) => (
            <ToastCard key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const iconConfigs: Record<ToastType, { bg: string; symbol: string }> = {
    error: { bg: 'bg-[#ed5d00]', symbol: '!' },
    warning: { bg: 'bg-[#f59e0b]', symbol: '!' },
    success: { bg: 'bg-[#10b981]', symbol: '✓' },
    info: { bg: 'bg-[#3b82f6]', symbol: 'i' },
  };
  const { bg: iconBg, symbol: iconSymbol } = iconConfigs[toast.type] || iconConfigs.error;

  return (
    <div
      role="alert"
      className="pointer-events-auto relative w-max max-w-[90vw] sm:max-w-md bg-white text-black text-xs sm:text-[13px] rounded-[4px] shadow-[0_4px_18px_rgba(0,0,0,0.35)] border border-black/10 px-3.5 py-2.5 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3 duration-200 select-none"
    >
      <div
        className={`w-4 h-4 rounded-[2.5px] ${iconBg} text-white flex items-center justify-center shrink-0 font-bold text-[11px] leading-none select-none`}
      >
        {iconSymbol}
      </div>
      <span className="leading-snug break-words font-normal text-neutral-900">
        {toast.message || toast.title}
      </span>
      <button
        type="button"
        onClick={onDismiss}
        className="text-neutral-400 hover:text-black transition-colors cursor-pointer outline-none focus:outline-none p-0.5 -mr-1 shrink-0 ml-1"
        title="Dismiss notification"
      >
        <X className="w-3.5 h-3.5 stroke-[2.2]" />
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export interface ToastTabProps {
  message: string | null;
  onDismiss?: () => void;
  className?: string;
  variant?: 'error' | 'success' | 'warning' | 'info';
  notch?: 'bottom' | 'top' | 'none';
}

export function ToastTab({
  message,
  onDismiss,
  className = '',
  variant = 'error',
  notch = 'bottom',
}: ToastTabProps) {
  if (!message) return null;

  const iconConfigs: Record<ToastType, { bg: string; symbol: string }> = {
    error: { bg: 'bg-[#ed5d00]', symbol: '!' },
    warning: { bg: 'bg-[#f59e0b]', symbol: '!' },
    success: { bg: 'bg-[#10b981]', symbol: '✓' },
    info: { bg: 'bg-[#3b82f6]', symbol: 'i' },
  };
  const config = (variant && iconConfigs[variant]) ? iconConfigs[variant] : iconConfigs.error;
  const { bg: iconBg, symbol: iconSymbol } = config;

  return (
    <div
      role="alert"
      className={`w-max max-w-[90vw] sm:max-w-md bg-white text-black text-xs sm:text-[13px] rounded-[4px] shadow-[0_4px_18px_rgba(0,0,0,0.35)] border border-black/10 px-3.5 py-2.5 flex items-center gap-2.5 animate-in fade-in zoom-in-95 duration-200 pointer-events-auto select-none ${className}`}
    >
      <div
        className={`w-4 h-4 rounded-[2.5px] ${iconBg} text-white flex items-center justify-center shrink-0 font-bold text-[11px] leading-none select-none`}
      >
        {iconSymbol}
      </div>
      <span className="leading-snug break-words font-normal text-neutral-900">{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-neutral-400 hover:text-black transition-colors cursor-pointer outline-none focus:outline-none p-0.5 -mr-1 shrink-0 ml-1"
          title="Dismiss notification"
        >
          <X className="w-3.5 h-3.5 stroke-[2.2]" />
        </button>
      )}
      {notch === 'bottom' && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[0.5px] w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.12)] pointer-events-none" />
      )}
      {notch === 'top' && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-[0.5px] w-0 h-0 border-x-[6px] border-x-transparent border-b-[6px] border-b-white drop-shadow-[0_-1px_1px_rgba(0,0,0,0.12)] pointer-events-none" />
      )}
    </div>
  );
}
