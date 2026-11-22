import type { ApiError, ApiErrorCode, PullResponse, PushResponse, WireRecord } from './protocol';

export type SyncFailure = ApiErrorCode | 'network' | 'unexpected';

/** A failed call to the sync API. `network` means we couldn't reach it at all (offline, DNS, timeout). */
export class SyncApiError extends Error {
  override name = 'SyncApiError';
  constructor(
    readonly code: SyncFailure,
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface SyncTransport {
  /** Create the account if it doesn't exist yet. Resolves true if it was just created. */
  register(): Promise<boolean>;
  pull(since: number): Promise<PullResponse>;
  push(records: WireRecord[]): Promise<PushResponse>;
  /** Delete the cloud copy of the journal. */
  remove(): Promise<void>;
}

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;
const TIMEOUT_MS = 20_000;

/** The browser transport: same-origin `/api/*`, authenticated with the derived auth secret. */
export function createHttpTransport(authSecret: string, fetchImpl: FetchLike = (u, i) => fetch(u, i)): SyncTransport {
  async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    let response: Response;
    try {
      response = await fetchImpl(path, {
        method,
        headers: { authorization: `Bearer ${authSecret}`, ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        cache: 'no-store',
        credentials: 'omit',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      throw new SyncApiError('network', 0, 'Couldn’t reach the sync service.');
    }
    if (!response.ok) {
      let parsed: Partial<ApiError> = {};
      try {
        parsed = (await response.json()) as Partial<ApiError>;
      } catch {
        /* a proxy or outage page rather than our API */
      }
      throw new SyncApiError(parsed.error ?? 'unexpected', response.status, parsed.message ?? `The sync service answered ${response.status}.`);
    }
    try {
      return (await response.json()) as T;
    } catch {
      throw new SyncApiError('unexpected', response.status, 'The sync service sent something unreadable.');
    }
  }

  return {
    register: async () => (await call<{ created: boolean }>('POST', '/api/account')).created,
    pull: (since) => call<PullResponse>('GET', `/api/sync?since=${since}`),
    push: (records) => call<PushResponse>('POST', '/api/sync', { records }),
    remove: async () => {
      await call<{ deleted: boolean }>('DELETE', '/api/account');
    },
  };
}
