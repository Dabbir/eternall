import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';

interface ToastInput {
  message: string;
  tone?: 'neutral' | 'accent' | 'error';
  action?: { label: string; run: () => void };
  duration?: number;
}
interface ToastItem extends ToastInput {
  id: number;
}

const ToastContext = createContext<((t: ToastInput) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(1);
  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const push = useCallback((t: ToastInput) => {
    const id = next.current++;
    setItems((xs) => [...xs.slice(-2), { ...t, id }]);
  }, []);
  const value = useMemo(() => push, [push]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" role="region" aria-label="Notifications" aria-live="polite">
        {items.map((t) => (
          <Toast key={t.id} item={t} onDone={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ item, onDone }: { item: ToastItem; onDone: () => void }) {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const id = window.setTimeout(onDone, item.duration ?? (item.action ? 7000 : 4200));
    return () => window.clearTimeout(id);
  }, [paused, item, onDone]);
  return (
    <div
      className={`toast toast--${item.tone ?? 'neutral'}`}
      role={item.tone === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span className="toast__dot" aria-hidden="true" />
      <span className="toast__msg">{item.message}</span>
      {item.action && (
        <button
          type="button"
          className="toast__action"
          onClick={() => {
            item.action?.run();
            onDone();
          }}
        >
          {item.action.label}
        </button>
      )}
      <button type="button" className="toast__close" onClick={onDone} aria-label="Dismiss">
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
