import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { isKind } from '../domain/entries';
import { isWeekKey } from '../domain/dates';
import type { EntryKind } from '../domain/types';
import { prefersReducedMotion } from '../state/hooks';

export type Route =
  | { name: 'desk' }
  | { name: 'write'; kind: EntryKind }
  | { name: 'edit'; id: string }
  | { name: 'issue'; key: string; page: number }
  | { name: 'shelf'; query: string }
  | { name: 'settings' }
  | { name: 'privacy' }
  | { name: 'not-found' };

/** Map a URL path + search string onto a typed route. Pure, so it can be unit-tested. */
export function matchRoute(pathname: string, search = ''): Route {
  const params = new URLSearchParams(search);
  const parts = pathname.replace(/\/+$/u, '').split('/').filter(Boolean).map(decodeURIComponent);
  const [head, arg, ...rest] = parts;
  if (rest.length > 0) return { name: 'not-found' };
  if (!head) return { name: 'desk' };
  switch (head) {
    case 'write':
      return isKind(arg ?? 'story') ? { name: 'write', kind: (arg ?? 'story') as EntryKind } : { name: 'not-found' };
    case 'edit':
      return arg ? { name: 'edit', id: arg } : { name: 'not-found' };
    case 'issue': {
      if (!arg || !isWeekKey(arg)) return { name: 'not-found' };
      const page = Number.parseInt(params.get('p') ?? '1', 10);
      return { name: 'issue', key: arg, page: Number.isFinite(page) && page > 0 ? page : 1 };
    }
    case 'shelf':
      return arg ? { name: 'not-found' } : { name: 'shelf', query: params.get('q') ?? '' };
    case 'settings':
      return arg ? { name: 'not-found' } : { name: 'settings' };
    case 'privacy':
      return arg ? { name: 'not-found' } : { name: 'privacy' };
    default:
      return { name: 'not-found' };
  }
}

export const paths = {
  desk: () => '/',
  write: (kind: EntryKind = 'story') => `/write/${kind}`,
  edit: (id: string) => `/edit/${encodeURIComponent(id)}`,
  issue: (key: string, page = 1) => `/issue/${key}${page > 1 ? `?p=${page}` : ''}`,
  shelf: (query = '') => `/shelf${query ? `?q=${encodeURIComponent(query)}` : ''}`,
  settings: () => '/settings',
  privacy: () => '/privacy',
};

interface NavigateOptions {
  replace?: boolean;
  /** Animate with the View Transitions API where supported. Default true. */
  transition?: boolean;
}

interface RouterValue {
  route: Route;
  path: string;
  navigate: (to: string, options?: NavigateOptions) => void;
  back: (fallback?: string) => void;
}

const RouterContext = createContext<RouterValue | null>(null);

/**
 * Inside ETERNALL, AMAZEEN lives under a base path (e.g. `/amazeen`). Routes and `paths` stay
 * base-free; the base is added when writing URLs and removed when reading them.
 */
let BASE = '';
export function setRouterBase(base: string): void {
  BASE = base.replace(/\/+$/u, '');
}
export const withBase = (to: string): string => (BASE && to.startsWith('/') && !to.startsWith(`${BASE}/`) && to !== BASE ? `${BASE}${to}` : to);
const stripBase = (path: string): string => (BASE && (path === BASE || path.startsWith(`${BASE}/`)) ? path.slice(BASE.length) || '/' : path);

function currentLocation(): { path: string; search: string } {
  return { path: stripBase(window.location.pathname), search: window.location.search };
}

type ViewTransitionDocument = Document & { startViewTransition?: (cb: () => void) => unknown };

function withTransition(update: () => void, enabled: boolean): void {
  const doc = document as ViewTransitionDocument;
  if (enabled && typeof doc.startViewTransition === 'function' && !prefersReducedMotion()) {
    doc.startViewTransition(() => flushSync(update));
  } else {
    update();
  }
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [loc, setLoc] = useState(currentLocation);

  useEffect(() => {
    const onPop = (): void => withTransition(() => setLoc(currentLocation()), true);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to: string, options: NavigateOptions = {}) => {
    const url = new URL(withBase(to), window.location.origin);
    if (url.origin !== window.location.origin) return; // never navigate off-site via the router
    const target = `${url.pathname}${url.search}`;
    if (target === `${window.location.pathname}${window.location.search}`) return;
    const samePath = url.pathname === window.location.pathname;
    withTransition(() => {
      const state = { idx: ((window.history.state as { idx?: number } | null)?.idx ?? 0) + (options.replace ? 0 : 1) };
      if (options.replace) window.history.replaceState(state, '', target);
      else window.history.pushState(state, '', target);
      setLoc(currentLocation());
      if (!samePath) window.scrollTo({ top: 0 });
    }, options.transition ?? true);
  }, []);

  const back = useCallback(
    (fallback = '/') => {
      const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
      if (idx > 0) window.history.back();
      else navigate(fallback, { replace: true });
    },
    [navigate],
  );

  const value = useMemo<RouterValue>(
    () => ({ route: matchRoute(loc.path, loc.search), path: loc.path, navigate, back }),
    [loc, navigate, back],
  );
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterValue {
  const value = useContext(RouterContext);
  if (!value) throw new Error('useRouter must be used inside <RouterProvider>.');
  return value;
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { to: string; replace?: boolean };

/** An anchor that navigates client-side, preserving normal browser behaviour for modified clicks. */
export function Link({ to, replace, onClick, ...rest }: LinkProps) {
  const { navigate } = useRouter();
  const handle = (e: MouseEvent<HTMLAnchorElement>): void => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || rest.target) return;
    e.preventDefault();
    navigate(to, replace ? { replace } : {});
  };
  return <a href={withBase(to)} onClick={handle} {...rest} />;
}
