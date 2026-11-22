import { useSyncExternalStore } from 'react';
import { prefersReducedMotion } from '../state/hooks';

/**
 * Day / Night editions. The preference is a per-device convenience (localStorage); "system"
 * follows the OS setting live. public/theme-init.js applies the same logic before first paint
 * so the page never flashes the wrong theme. Keep the two in sync.
 */
export type ThemePreference = 'system' | 'light' | 'dark';
export type Theme = 'light' | 'dark';

export const THEME_KEY = 'amazeen:theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';
const THEME_COLOR: Record<Theme, string> = { light: '#15130f', dark: '#070605' };

const listeners = new Set<() => void>();
const notify = (): void => listeners.forEach((l) => l());

function isPreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function readPreference(): ThemePreference {
  try {
    const value = window.localStorage.getItem(THEME_KEY);
    return isPreference(value) ? value : 'system';
  } catch {
    return 'system';
  }
}

function systemTheme(): Theme {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

export function resolveTheme(preference: ThemePreference): Theme {
  return preference === 'system' ? systemTheme() : preference;
}

function apply(theme: Theme): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
}

let preference: ThemePreference = typeof window === 'undefined' ? 'system' : readPreference();

if (typeof window !== 'undefined') {
  apply(resolveTheme(preference));
  // Follow the OS live while on "system".
  if (typeof window.matchMedia === 'function') {
    window.matchMedia(DARK_QUERY).addEventListener('change', () => {
      if (preference === 'system') {
        apply(systemTheme());
        notify();
      }
    });
  }
  // Keep other tabs in step.
  window.addEventListener('storage', (e) => {
    if (e.key === THEME_KEY) {
      preference = readPreference();
      apply(resolveTheme(preference));
      notify();
    }
  });
}

type ViewTransitionDocument = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };

/**
 * Change the preference. With an origin point (the switch's centre), the new edition spills out
 * from it as a growing circle of ink, where the View Transitions API exists and motion is allowed.
 */
export function setPreference(next: ThemePreference, origin?: { x: number; y: number }): void {
  const before = resolveTheme(preference);
  preference = next;
  try {
    if (next === 'system') window.localStorage.removeItem(THEME_KEY);
    else window.localStorage.setItem(THEME_KEY, next);
  } catch {
    /* storage unavailable: the choice still applies for this visit */
  }
  const after = resolveTheme(next);
  const doc = document as ViewTransitionDocument;
  const root = document.documentElement;

  if (after !== before && origin && typeof doc.startViewTransition === 'function' && !prefersReducedMotion()) {
    const radius = Math.hypot(Math.max(origin.x, window.innerWidth - origin.x), Math.max(origin.y, window.innerHeight - origin.y));
    root.style.setProperty('--theme-x', `${origin.x}px`);
    root.style.setProperty('--theme-y', `${origin.y}px`);
    root.style.setProperty('--theme-r', `${radius}px`);
    root.dataset.vt = 'theme';
    const transition = doc.startViewTransition(() => apply(after));
    void transition.finished.finally(() => {
      delete root.dataset.vt;
    });
  } else {
    apply(after);
  }
  notify();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Current preference and the theme actually showing. */
export function useTheme(): { preference: ThemePreference; theme: Theme } {
  const pref = useSyncExternalStore(subscribe, () => preference, () => 'system' as ThemePreference);
  const theme = useSyncExternalStore(subscribe, () => resolveTheme(preference), () => 'light' as Theme);
  return { preference: pref, theme };
}
