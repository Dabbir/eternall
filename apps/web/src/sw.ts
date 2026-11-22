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
};

const DOORS = new Set(['amazeen', 'envoi', 'folio', 'almanack', 'refrain', 'prologue', 'kindred', 'marginalia']);

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
