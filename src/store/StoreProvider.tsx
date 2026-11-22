import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, type Dispatch, type ReactNode } from 'react';
import { buildLifeline, type LifelineModel } from '../domain/lifeline';
import { computeAlmanac, type Almanac } from '../domain/stats';
import { todayISO } from '../domain/time';
import { EMPTY_DATA, type AppData, type ISODate } from '../domain/types';
import { saveArchive, type SaveResult } from './persistence';
import { reducer, type Action } from './reducer';

interface StoreValue {
  data: AppData;
  dispatch: Dispatch<Action>;
  today: ISODate;
  lifeline: LifelineModel | null;
  almanac: Almanac | null;
  saveStatus: SaveResult;
}

const StoreContext = createContext<StoreValue | null>(null);

/** Keeps `today` correct across midnight so capsules unseal without a reload. */
function useToday(override?: ISODate): ISODate {
  const [today, setToday] = useState(() => override ?? todayISO());
  useEffect(() => {
    if (override) return;
    const tick = () => setToday((prev) => (prev === todayISO() ? prev : todayISO()));
    const id = window.setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [override]);
  return today;
}

interface ProviderProps {
  /** Starting data, or a loader evaluated on every mount (so remounts never start from stale data). */
  initial?: AppData | (() => AppData);
  /** Fixed date for tests. */
  today?: ISODate;
  /** Disable writes (tests, read-only recovery). */
  persist?: boolean;
  children: ReactNode;
}

export function StoreProvider({ initial = EMPTY_DATA, today: fixedToday, persist = true, children }: ProviderProps) {
  const [data, dispatch] = useReducer(reducer, initial, (i) => (typeof i === 'function' ? i() : i));
  const today = useToday(fixedToday);
  const [saveStatus, setSaveStatus] = useState<SaveResult>({ ok: true });
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!persist) return;
    const id = window.setTimeout(() => setSaveStatus(saveArchive(data)), 250);
    return () => window.clearTimeout(id);
  }, [data, persist]);

  // Flush pending writes when the tab is hidden or closed.
  const latest = useRef(data);
  latest.current = data;
  useEffect(() => {
    if (!persist) return;
    const flush = () => saveArchive(latest.current);
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [persist]);

  const lifeline = useMemo(() => buildLifeline(data, today), [data, today]);
  const almanac = useMemo(() => computeAlmanac(data, today), [data, today]);
  const value = useMemo(
    () => ({ data, dispatch, today, lifeline, almanac, saveStatus }),
    [data, today, lifeline, almanac, saveStatus],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}

/** For screens that only render once a profile exists. */
export function useProfileStore() {
  const store = useStore();
  const { profile } = store.data;
  if (!profile || !store.lifeline || !store.almanac) throw new Error('Profile required');
  return { ...store, profile, lifeline: store.lifeline, almanac: store.almanac };
}
