import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react';

const REDUCED = '(prefers-reduced-motion: reduce)';

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(REDUCED).matches;
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      if (typeof window.matchMedia !== 'function') return () => undefined;
      const mq = window.matchMedia(REDUCED);
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    prefersReducedMotion,
    () => false,
  );
}

/** Grow a textarea to fit its content. Returns the ref to attach to the textarea. */
export function useAutosize(value: string): React.RefObject<HTMLTextAreaElement | null> {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || el.value !== value) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return ref;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/**
 * Global single-key shortcuts that never fire while the user is typing or holding a modifier
 * (except where the handler opts into modifier keys itself).
 */
export function useHotkeys(map: Record<string, (e: KeyboardEvent) => void>, enabled = true): void {
  const mapRef = useRef(map);
  useLayoutEffect(() => {
    mapRef.current = map;
  });
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      if (document.querySelector('dialog[open]')) return;
      // Letters match regardless of Caps Lock / Shift; other keys (ArrowLeft, '/', …) match exactly.
      const handler = mapRef.current[e.key] ?? (e.key.length === 1 ? mapRef.current[e.key.toLowerCase()] : undefined);
      if (handler) {
        handler(e);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}

export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title ? `${title} — AMAZEEN` : 'AMAZEEN';
  }, [title]);
}
