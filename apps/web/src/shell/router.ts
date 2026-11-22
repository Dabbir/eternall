import { useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import type { ImprintId } from '@eternall/core';

/**
 * Path-based routing on one origin (docs/ARCHITECTURE.md §2, §6).
 * The shell owns the first path segment: an imprint id, or a house page.
 */

export const HOUSE_PAGES = ['', 'inscriptions', 'settings', 'welcome', 'begin', 'patron'] as const;
export type HousePage = (typeof HOUSE_PAGES)[number];

export type Location =
  | { kind: 'house'; page: HousePage; search: URLSearchParams }
  | { kind: 'imprint'; id: ImprintId; path: string; search: URLSearchParams };

export function parseLocation(pathname: string, search: string, imprints: readonly ImprintId[]): Location {
  const params = new URLSearchParams(search);
  const segments = pathname.replace(/^\/+/, '').split('/');
  const first = segments[0] ?? '';
  if ((imprints as readonly string[]).includes(first)) {
    const rest = segments.slice(1).join('/');
    return { kind: 'imprint', id: first as ImprintId, path: `/${rest}`.replace(/\/+$/, '') || '/', search: params };
  }
  const page = (HOUSE_PAGES as readonly string[]).includes(first) ? (first as HousePage) : '';
  return { kind: 'house', page, search: params };
}

/** Read straight from the location each time; equal strings compare equal, so React stays stable. */
const current = () => `${window.location.pathname}${window.location.search}`;
const listeners = new Set<() => void>();
const notify = () => {
  for (const l of listeners) l();
};
window.addEventListener('popstate', notify);

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useHref(): string {
  return useSyncExternalStore(subscribe, current, current);
}

type ViewTransitionDoc = Document & { startViewTransition?: (cb: () => void) => unknown };
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const firstSegment = (href: string) => href.replace(/^\/+/, '').split(/[/?#]/)[0] ?? '';

export function navigate(href: string, options: { replace?: boolean } = {}) {
  const current = `${window.location.pathname}${window.location.search}`;
  if (href === current) return;
  const go = () => {
    if (options.replace) window.history.replaceState(null, '', href);
    else window.history.pushState(null, '', href);
    // A popstate tells every router on the page, including an imprint's own (AMAZEEN has one).
    window.dispatchEvent(new PopStateEvent('popstate'));
  };
  const doc = document as ViewTransitionDoc;
  // A view transition marks a change of publication; moves within one imprint stay instant.
  const changesImprint = firstSegment(href) !== firstSegment(current);
  if (changesImprint && doc.startViewTransition && !reducedMotion()) doc.startViewTransition(() => flushSync(go));
  else go();
  if (!options.replace && changesImprint) window.scrollTo({ top: 0 });
}

/** Props for an <a> that navigates in-app but still works with modifiers and middle-click. */
export function linkProps(href: string) {
  return {
    href,
    onClick: (e: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; button: number; preventDefault(): void }) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      navigate(href);
    },
  };
}
