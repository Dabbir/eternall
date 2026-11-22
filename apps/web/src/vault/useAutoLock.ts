import { useEffect } from 'react';

/** Lock after `minutes` without interaction, or 5 minutes after the tab is hidden (docs/PRIVACY.md §4). */
export function useAutoLock(enabled: boolean, minutes: number, onLock: () => void) {
  useEffect(() => {
    if (!enabled || minutes <= 0) return;
    let idle = window.setTimeout(onLock, minutes * 60_000);
    let hidden: number | null = null;
    const bump = () => {
      window.clearTimeout(idle);
      idle = window.setTimeout(onLock, minutes * 60_000);
    };
    const onVisibility = () => {
      if (document.hidden) hidden = window.setTimeout(onLock, Math.min(minutes, 5) * 60_000);
      else if (hidden !== null) {
        window.clearTimeout(hidden);
        hidden = null;
        bump();
      }
    };
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
    for (const e of events) window.addEventListener(e, bump, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearTimeout(idle);
      if (hidden !== null) window.clearTimeout(hidden);
      for (const e of events) window.removeEventListener(e, bump);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, minutes, onLock]);
}
