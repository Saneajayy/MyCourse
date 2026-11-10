'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

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
  const configs = {
    info: {
      badgeBg: 'bg-black/10 border-black/20 text-black',
      borderAccent: 'border-l-[#000000]',
      icon: <Info className="w-4 h-4 stroke-[2.5]" />,
    },
    success: {
      badgeBg: 'bg-emerald-50 border-emerald-200/70 text-emerald-600',
      borderAccent: 'border-l-emerald-500',
      icon: <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />,
    },
    error: {
      badgeBg: 'bg-rose-50 border-rose-200/70 text-rose-600',
      borderAccent: 'border-l-rose-500',
      icon: <AlertCircle className="w-4 h-4 stroke-[2.5]" />,
    },
    warning: {
      badgeBg: 'bg-amber-50 border-amber-200/70 text-amber-600',
      borderAccent: 'border-l-amber-500',
      icon: <AlertTriangle className="w-4 h-4 stroke-[2.5]" />,
    },
  };

  const config = configs[toast.type];

  return (
    <div
      role="status"
      className={`pointer-events-auto flex items-start gap-3 p-3.5 sm:p-4 bg-white/95 backdrop-blur-md border border-neutral-200/90 border-l-[3.5px] ${config.borderAccent} rounded-xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.08),0_4px_10px_-2px_rgba(0,0,0,0.04)] w-full transition-all animate-in fade-in slide-in-from-top-3 duration-200 select-none`}
    >
      <div
        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border flex items-center justify-center shrink-0 ${config.badgeBg}`}
      >
        {config.icon}
      </div>
      <div className="flex-1 text-left min-w-0 pt-0.5">
        <h4 className="text-[13px] sm:text-sm font-bold text-neutral-900 leading-tight">
          {toast.title}
        </h4>
        {toast.message && (
          <p className="text-xs text-neutral-600 mt-1 leading-relaxed break-words font-normal">
            {toast.message}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors -mr-1 -mt-1 cursor-pointer shrink-0"
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
