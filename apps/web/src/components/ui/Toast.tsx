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
  const bgColors: Record<ToastType, string> = {
    error: 'bg-[#ef5543]',
    success: 'bg-[#10b981]',
    warning: 'bg-[#f59e0b]',
    info: 'bg-[#3b82f6]',
  };
  const bgClass = bgColors[toast.type] || 'bg-[#ef5543]';

  return (
    <div
      role="alert"
      className={`pointer-events-auto w-max max-w-full rounded-none ${bgClass} text-white text-xs font-medium flex items-center shadow-lg animate-in fade-in slide-in-from-top-3 duration-200 select-none overflow-hidden`}
    >
      <button
        type="button"
        onClick={onDismiss}
        className="px-3 self-stretch flex items-center justify-center text-white/90 hover:text-white hover:bg-black/10 transition-colors cursor-pointer outline-none focus:outline-none shrink-0"
        title="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <div className="w-[1px] self-stretch bg-white/40 shrink-0" />
      <span className="py-2.5 pl-3.5 pr-4 leading-normal">{toast.message || toast.title}</span>
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
}

export function ToastTab({
  message,
  onDismiss,
  className = '',
  variant = 'error',
}: ToastTabProps) {
  if (!message) return null;

  const bgColors: Record<string, string> = {
    error: 'bg-[#ef5543]',
    success: 'bg-[#10b981]',
    warning: 'bg-[#f59e0b]',
    info: 'bg-[#3b82f6]',
  };
  const bgClass = bgColors[variant] || 'bg-[#ef5543]';

  return (
    <div
      role="alert"
      className={`w-max max-w-full rounded-none ${bgClass} text-white text-xs font-medium flex items-center shadow-lg animate-in fade-in duration-200 pointer-events-auto overflow-hidden ${className}`}
    >
      <button
        type="button"
        onClick={onDismiss}
        className="px-3 self-stretch flex items-center justify-center text-white/90 hover:text-white hover:bg-black/10 transition-colors cursor-pointer outline-none focus:outline-none shrink-0"
        title="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <div className="w-[1px] self-stretch bg-white/40 shrink-0" />
      <span className="py-2.5 pl-3.5 pr-4 leading-normal">{message}</span>
    </div>
  );
}
