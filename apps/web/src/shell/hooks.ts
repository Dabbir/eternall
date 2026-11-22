import { useEffect, useState } from 'react';
import { todayISO, type HouseProfile, type ISODate } from '@eternall/core';
import { useCollection } from '@eternall/vault';
import { DEFAULT_SETTINGS, PROFILE_PATH, SETTINGS_PATH, type HouseSettings } from '../house/domain/house';

/** Today's civil date, kept correct across midnight so letters unseal without a reload. */
export function useToday(override?: ISODate): ISODate {
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

export function useProfile(): HouseProfile | null {
  const { col } = useCollection<HouseProfile>(PROFILE_PATH);
  return col.get('me') ?? null;
}

export function useSettings(): [HouseSettings, (patch: Partial<HouseSettings>) => void] {
  const { col } = useCollection<HouseSettings>(SETTINGS_PATH);
  const settings = { ...DEFAULT_SETTINGS, ...col.get('prefs') };
  return [settings, (patch) => col.put({ ...settings, ...patch, id: 'prefs' })];
}
