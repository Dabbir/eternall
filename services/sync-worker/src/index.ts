import { handleRequest, type Env } from './handler';

interface AssetsEnv extends Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

// Retired doors (envoi, folio, almanack, prologue) fall through to the house page, which redirects them (docs/adr/0011).
const DOORS = new Set(['amazeen', 'refrain', 'kindred', 'marginalia']);

/**
 * One Worker for the whole house: `/api/*` is the sync and licence API; everything else is the
 * built app. Deep links fall back to their door's own HTML (`/amazeen/issue/…` → `/amazeen/index.html`),
 * so each door keeps its manifest and installs as its own app (docs/ARCHITECTURE.md §2).
 */
export default {
  async fetch(request: Request, env: AssetsEnv): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return handleRequest(request, env);
    const res = await env.ASSETS.fetch(request);
    if (res.status !== 404 || request.method !== 'GET' || !(request.headers.get('accept') ?? '').includes('text/html')) return res;
    const door = url.pathname.split('/')[1] ?? '';
    const fallback = new URL(DOORS.has(door) ? `/${door}/index.html` : '/index.html', url);
    return env.ASSETS.fetch(new Request(fallback, request));
  },
};
