import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './Icon';
import ui from './ui.module.css';

export interface ToastInput {
  message: string;
  tone?: 'default' | 'error';
  action?: { label: string; onAction: () => void };
  /** ms before auto-dismiss. Default 5000. */
  duration?: number;
}

interface ToastItem extends ToastInput {
  id: number;
}

interface ToastApi {
  push: (toast: ToastInput) => void;
}

const ToastContext = createContext<ToastApi | null>(null);
const MAX_VISIBLE = 3;

function ToastView({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const timer = useRef<number | undefined>(undefined);
  const start = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => onDismiss(toast.id), toast.duration ?? 5000);
  }, [onDismiss, toast.id, toast.duration]);

  useEffect(() => {
    start();
    return () => window.clearTimeout(timer.current);
  }, [start]);

  return (
    <div
      className={ui.toast}
      data-tone={toast.tone ?? 'default'}
      onMouseEnter={() => window.clearTimeout(timer.current)}
      onMouseLeave={start}
      onFocus={() => window.clearTimeout(timer.current)}
      onBlur={start}
    >
      <span className={ui.toastMsg}>{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          className={ui.toastAction}
          onClick={() => {
            toast.action?.onAction();
            onDismiss(toast.id);
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button type="button" className={ui.toastClose} aria-label="Dismiss" onClick={() => onDismiss(toast.id)}>
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((ts) => ts.filter((t) => t.id !== id)), []);
  const push = useCallback((toast: ToastInput) => {
    const id = nextId.current++;
    setToasts((ts) => [...ts, { ...toast, id }].slice(-MAX_VISIBLE));
  }, []);
  const api = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Live regions exist up front and items carry no roles, so each toast is announced exactly once. */}
      <div className={ui.toasts}>
        <div aria-live="polite" className={ui.toastStack}>
          {toasts.filter((t) => t.tone !== 'error').map((t) => (
            <ToastView key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>
        <div aria-live="assertive" className={ui.toastStack}>
          {toasts.filter((t) => t.tone === 'error').map((t) => (
            <ToastView key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside <ToastProvider>.');
  return api;
}
