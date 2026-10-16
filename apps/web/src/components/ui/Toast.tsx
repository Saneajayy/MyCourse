'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
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
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, title: string, message?: string, duration = 5000) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newToast: Toast = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast],
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
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const icons = {
    info: <Info className="w-5 h-5 text-course-darkBlue shrink-0" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-700 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
  };

  const borderClasses = {
    info: 'border-l-4 border-l-course-darkBlue',
    success: 'border-l-4 border-l-emerald-600',
    error: 'border-l-4 border-l-rose-600',
    warning: 'border-l-4 border-l-amber-500',
  };

  return (
    <div
      role="status"
      className={`pointer-events-auto flex items-start gap-3 p-4 bg-course-white border border-black ${borderClasses[toast.type]}`}
    >
      {icons[toast.type]}
      <div className="flex-1 text-left min-w-0">
        <h4 className="text-sm font-bold text-course-darkBlue leading-tight">{toast.title}</h4>
        {toast.message && (
          <p className="text-xs text-course-navySubtle mt-1 leading-relaxed break-words">
            {toast.message}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-course-darkBlue hover:bg-course-orangeSubtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-black -mr-2 -mt-2"
      >
        <X className="w-4 h-4" />
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
