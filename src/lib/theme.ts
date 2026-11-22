import { useEffect, useState } from 'react';
import type { ThemePreference } from '../domain/types';

/** Reflect the stored preference on <html>. `system` removes the attribute so CSS media queries decide. */
export function useApplyTheme(pref: ThemePreference) {
  useEffect(() => {
    const root = document.documentElement;
    if (pref === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', pref);
  }, [pref]);
}

/** Increments whenever the effective colour scheme changes — canvases use it to repaint. */
export function useThemeVersion(): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    const bump = () => setV((x) => x + 1);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener?.('change', bump);
    const mo = new MutationObserver(bump);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    // Fonts load late; repaint once they are ready so canvas labels use the right face.
    document.fonts?.ready.then(bump).catch(() => {});
    return () => {
      mq.removeEventListener?.('change', bump);
      mo.disconnect();
    };
  }, []);
  return v;
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}
