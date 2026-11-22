import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

const NowContext = createContext<Date | null>(null);
const TICK_MS = 30_000;

/**
 * A ticking clock in its own context, so countdowns and greetings stay live without
 * re-rendering every store consumer on each tick.
 */
export function NowProvider({ children }: { children: ReactNode }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), TICK_MS);
    // Catch up immediately when the tab comes back after sleeping.
    const onVisible = (): void => {
      if (document.visibilityState === 'visible') setNow(new Date());
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  return <NowContext.Provider value={now}>{children}</NowContext.Provider>;
}

export function useNow(): Date {
  const now = useContext(NowContext);
  if (!now) throw new Error('useNow must be used inside <NowProvider>.');
  return now;
}
