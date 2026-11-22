import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

export const ROUTES = ['lifeline', 'archive', 'capsules', 'chapters', 'almanac', 'settings'] as const;
export type RouteName = (typeof ROUTES)[number];

export interface Route {
  name: RouteName;
  params: URLSearchParams;
}

export function parseHash(hash: string): Route {
  const clean = hash.replace(/^#\/?/, '');
  const [path = '', query = ''] = clean.split('?');
  const name = (ROUTES as readonly string[]).includes(path) ? (path as RouteName) : 'lifeline';
  return { name, params: new URLSearchParams(query) };
}

export function hrefFor(name: RouteName, params?: Record<string, string | number>): string {
  const q = params ? `?${new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))}` : '';
  return `#/${name === 'lifeline' ? '' : name}${q}`;
}

type ViewTransitionDoc = Document & { startViewTransition?: (cb: () => void) => unknown };

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export function navigate(name: RouteName, params?: Record<string, string | number>, opts: { replace?: boolean } = {}) {
  const href = hrefFor(name, params);
  if (window.location.hash === href) return;
  const go = () => {
    if (opts.replace) window.history.replaceState(null, '', href);
    else window.history.pushState(null, '', href);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  };
  const doc = document as ViewTransitionDoc;
  const sameView = parseHash(window.location.hash).name === name;
  if (doc.startViewTransition && !prefersReducedMotion() && !sameView) {
    doc.startViewTransition(() => flushSync(go));
  } else {
    go();
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const on = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', on);
    window.addEventListener('popstate', on);
    return () => {
      window.removeEventListener('hashchange', on);
      window.removeEventListener('popstate', on);
    };
  }, []);
  return route;
}
