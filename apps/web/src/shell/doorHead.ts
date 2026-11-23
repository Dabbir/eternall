import { useEffect } from 'react';
import type { ImprintDefinition } from '@eternall/core';

/** The house's own head, as `apps/web/index.html` ships it. */
export const HOUSE_HEAD = { icon: '/favicon.svg', png: '/brand/icon-192.png', apple: '/apple-touch-icon.png', manifest: '/site.webmanifest', light: '#F2EDE3', dark: '#121110' } as const;

/** What an app shows in the browser: its icons, manifest and theme colours. */
export function headFor(def: ImprintDefinition | null) {
  if (!def) return HOUSE_HEAD;
  const base = def.brand.icon.replace(/\.svg$/u, '');
  return { icon: def.brand.icon, png: `${base}-192.png`, apple: `${base}-180.png`, manifest: `/manifests/${def.id}.webmanifest`, light: def.brand.themeColor.light, dark: def.brand.themeColor.dark };
}

/**
 * Each app wears its own identity in the browser (docs/adr/0011): `<body data-imprint>` so its
 * tokens reach the page background, dialogs and toasts (and every theme's `:root … [data-imprint]`
 * dark-mode selectors still match), plus its tab icon, theme colours and manifest.
 * Back in the house, the house's head returns.
 */
export function applyDoorHead(def: ImprintDefinition | null): void {
  if (def) document.body.dataset.imprint = def.id;
  else delete document.body.dataset.imprint;
  const h = headFor(def);
  for (const el of document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]')) el.setAttribute('href', el.getAttribute('type') === 'image/svg+xml' ? h.icon : h.png);
  document.querySelector('link[rel="apple-touch-icon"]')?.setAttribute('href', h.apple);
  document.querySelector('link[rel="manifest"]')?.setAttribute('href', h.manifest);
  for (const el of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) el.setAttribute('content', (el.getAttribute('media') ?? '').includes('dark') ? h.dark : h.light);
}

export function useDoorHead(def: ImprintDefinition | null): void {
  useEffect(() => {
    applyDoorHead(def);
  }, [def]);
}
