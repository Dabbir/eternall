import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import type { AlmanacFact, HouseProfile, ISODate, ImprintId, Memory, RedLetterDay } from '@eternall/core';

/**
 * The imprint SDK: everything an imprint may ask of the house.
 * Imprints import from here; the shell provides the implementation.
 */

export interface ToastInput {
  message: string;
  tone?: 'neutral' | 'accent' | 'error';
  action?: { label: string; run: () => void };
  duration?: number;
}

export interface PrimaryAction {
  label: string;
  icon?: string | undefined;
  run: () => void;
}

/** Optional cross-imprint capabilities (docs/ARCHITECTURE.md §5). */
export interface Capabilities {
  'people.mention': {
    search(query: string): { id: string; name: string }[];
    nameOf(id: string): string | null;
    href(id: string): string;
  };
  'quotes.offer': {
    offered(): { id: string; text: string; by: string; workTitle: string }[];
  };
  'chapters.at': {
    at(date: ISODate): { id: string; title: string; color: string; href: string } | null;
  };
  'letters.compose': {
    compose(prefill: { title?: string; body?: string }): void;
  };
  'rituals.list': {
    list(): { id: string; name: string; href: string }[];
  };
  'rituals.week': {
    /** How a 7-day window went, e.g. for "Visit Dad · kept 3 of the last 4 weeks". */
    week(ritualId: string, start: ISODate): { kept: boolean; notes: number } | null;
  };
}
export type CapabilityId = keyof Capabilities;

export interface House {
  today: ISODate;
  profile: HouseProfile | null;
  /** The imprint currently hosting this tree, or null in the house. */
  imprint: ImprintId | null;
  /** Navigate to an absolute in-app href, e.g. "/amazeen/letters" or "/". */
  navigate(href: string, options?: { replace?: boolean }): void;
  /** Absolute href for a path inside the current imprint. */
  href(subpath: string): string;
  toast(t: ToastInput): void;
  setPrimaryAction(action: PrimaryAction | null): void;
  capability<K extends CapabilityId>(id: K): Capabilities[K] | null;
  isEnabled(id: ImprintId): boolean;
  /** Read-only aggregates across the other enabled imprints (for the Almanac and search). */
  gather: {
    memories(): Memory[];
    facts(): AlmanacFact[];
    redLetterDays(): RedLetterDay[];
  };
  /** Mark a one-time hint or suggestion as seen. */
  dismiss(key: string): void;
  isDismissed(key: string): boolean;
  /** The action the current screen registered (usePrimaryAction); an app's own chrome renders it. */
  primaryAction: PrimaryAction | null;
  /** Back to the ETERNALL house (an app's small exit). */
  leave(): void;
  /** Lock the vault now, when a lock is set (⌘⇧L does the same). */
  lock(): void;
  canLock: boolean;
  /** Open search (⌘K), scoped to the current app. */
  openSearch(): void;
  /** How many things wait elsewhere (other apps' badges), for a quiet dot on the exit. */
  notices: number;
  /** Whether 3D/immersive modes may run (capability + preference + licence). */
  immersive: { allowed: boolean; reason: 'ok' | 'flat-pages' | 'reduced-motion' | 'no-webgl' | 'low-power' | 'patron' };
}

const HouseContext = createContext<House | null>(null);

export function HouseProvider({ value, children }: { value: House; children: ReactNode }) {
  return <HouseContext.Provider value={value}>{children}</HouseContext.Provider>;
}

export function useHouse(): House {
  const h = useContext(HouseContext);
  if (!h) throw new Error('useHouse must be used inside <HouseProvider>');
  return h;
}

/** The primary action registered by the current screen, for an app's own chrome to render. */
export function usePrimaryActionValue(): PrimaryAction | null {
  return useHouse().primaryAction;
}

/** Register the screen's primary action while the calling screen is mounted. */
export function usePrimaryAction(action: PrimaryAction | null) {
  const house = useHouse();
  const ref = useRef(action);
  ref.current = action;
  const label = action?.label ?? null;
  useEffect(() => {
    if (label === null) {
      house.setPrimaryAction(null);
      return;
    }
    house.setPrimaryAction({ label, icon: ref.current?.icon, run: () => ref.current?.run() });
    return () => house.setPrimaryAction(null);
    // Re-register only when the label changes; `run` is read through the ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label]);
}
