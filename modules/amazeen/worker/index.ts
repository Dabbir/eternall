import { handleRequest } from '../src/sync/server/handler';
import type { Env } from '../src/sync/server/handler';

/**
 * The Worker behind the app. Cloudflare serves the built app (dist/) as static assets and only
 * sends `/api/*` here (see `run_worker_first` in wrangler.jsonc), so pages never wait on this code.
 * The logic lives in src/sync/server/handler.ts so it can be tested without Cloudflare.
 */
export default {
  fetch: (request: Request, env: Env): Promise<Response> => handleRequest(request, env),
};
