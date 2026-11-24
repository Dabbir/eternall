import { cleanupOutdatedCaches, matchPrecache, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

/**
 * ETERNALL's one service worker, scoped to `/`, shared by every installed door (docs/ARCHITECTURE.md §2).
 * Navigations are answered with their own door's HTML, so `/amazeen/…` opens AMAZEEN offline with
 * AMAZEEN's manifest; the API is never answered from cache.
 */
declare const self: {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
  skipWaiting(): Promise<void>;
  addEventListener(type: 'message', listener: (e: { data?: { type?: string } }) => void): void;
  addEventListener(type: 'notificationclick', listener: (e: NotificationClick) => void): void;
  clients: {
    matchAll(o: { type: 'window'; includeUncontrolled: boolean }): Promise<Array<{ url: string; focus(): Promise<unknown>; navigate(url: string): Promise<unknown> }>>;
    openWindow(url: string): Promise<unknown>;
  };
  location: { origin: string };
};
interface NotificationClick {
  notification: { data?: { href?: string }; close(): void };
  waitUntil(p: Promise<unknown>): void;
}

// Retired doors (envoi, folio, almanack, prologue, ledger, renamed casheen, and marginalia, folded into amazeen) fall through to the house page, which redirects them (docs/adr/0011).
const DOORS = new Set(['amazeen', 'refrain', 'kindred', 'casheen']);

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  new NavigationRoute(
    async ({ url }) => {
      const door = url.pathname.split('/')[1] ?? '';
      const page = DOORS.has(door) ? `/${door}/index.html` : '/index.html';
      return (await matchPrecache(page)) ?? fetch(page);
    },
    { denylist: [/^\/api\//] },
  ),
);

// Ask before activating a new version, so nobody loses a half-written page mid-update.
self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') void self.skipWaiting();
});

// A local reminder was tapped: focus an open window on its page, or open one. Same-origin paths only.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const raw = e.notification.data?.href ?? '/';
  const href = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
  e.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const win = wins.find((w) => w.url.startsWith(self.location.origin));
      if (win) {
        await win.navigate(href).catch(() => undefined);
        await win.focus();
      } else await self.clients.openWindow(href);
    })(),
  );
});
