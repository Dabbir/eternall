import { AUTH_SECRET, LIMITS, parseWireRecord } from '../protocol';
import type { ApiError, ApiErrorCode, PullResponse, PushResponse, WireRecord } from '../protocol';

/** The slice of Cloudflare D1 we use. Real D1 satisfies it; tests use SQLite behind the same shape. */
export interface Statement {
  bind(...values: unknown[]): Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}
export interface Db {
  prepare(sql: string): Statement;
  /** Runs the statements in order inside one transaction. */
  batch(statements: Statement[]): Promise<unknown[]>;
}
export interface Env {
  DB: Db;
}

const STATUS: Record<ApiErrorCode, number> = {
  'bad-request': 400,
  unauthorized: 401,
  'not-found': 404,
  'too-large': 413,
  quota: 429,
  method: 405,
  server: 500,
};

const HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  // Responses are per-account and secret; nothing may cache them.
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: HEADERS });
}

function fail(error: ApiErrorCode, message: string): Response {
  const body: ApiError = { error, message };
  return json(body, STATUS[error]);
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/u, '');
}

/** The account id: SHA-256 of the bearer secret, base64url. Identical to what the client computes. */
async function accountIdFrom(request: Request): Promise<string | null> {
  const match = /^Bearer ([A-Za-z0-9_-]+)$/u.exec(request.headers.get('authorization') ?? '');
  const secret = match?.[1];
  if (!secret || !AUTH_SECRET.test(secret)) return null;
  const raw = atob(secret.replace(/-/gu, '+').replace(/_/gu, '/') + '=');
  const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
  return toBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)));
}

async function readJson(request: Request): Promise<unknown | Response> {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > LIMITS.bodyBytes) return fail('too-large', 'That request is too large.');
  const text = await request.text();
  if (text.length > LIMITS.bodyBytes) return fail('too-large', 'That request is too large.');
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return fail('bad-request', 'The request body is not valid JSON.');
  }
}

interface RecordRow {
  rid: string;
  seq: number;
  updated_at: string;
  deleted: number;
  blob: string | null;
}

async function accountExists(db: Db, id: string): Promise<boolean> {
  return (await db.prepare('SELECT 1 AS ok FROM accounts WHERE id = ?').bind(id).first<{ ok: number }>()) !== null;
}

async function createAccount(env: Env, id: string, now: Date): Promise<Response> {
  if (await accountExists(env.DB, id)) return json({ created: false }, 200);
  await env.DB.prepare('INSERT OR IGNORE INTO accounts (id, seq, created_at) VALUES (?, 0, ?)').bind(id, now.toISOString()).run();
  return json({ created: true }, 201);
}

async function pull(env: Env, id: string, url: URL): Promise<Response> {
  if (!(await accountExists(env.DB, id))) return fail('unauthorized', 'No journal is stored for this sync key.');
  const since = Number(url.searchParams.get('since') ?? 0);
  if (!Number.isSafeInteger(since) || since < 0) return fail('bad-request', 'Bad cursor.');
  const { results } = await env.DB.prepare(
    'SELECT rid, seq, updated_at, deleted, blob FROM records WHERE account_id = ? AND seq > ? ORDER BY seq ASC LIMIT ?',
  )
    .bind(id, since, LIMITS.pageSize + 1)
    .all<RecordRow>();
  const page = results.slice(0, LIMITS.pageSize);
  const body: PullResponse = {
    records: page.map((r) => ({ rid: r.rid, seq: r.seq, updatedAt: r.updated_at, deleted: r.deleted === 1, blob: r.blob })),
    cursor: page.at(-1)?.seq ?? since,
    more: results.length > LIMITS.pageSize,
  };
  return json(body);
}

async function push(env: Env, id: string, request: Request, now: Date): Promise<Response> {
  if (!(await accountExists(env.DB, id))) return fail('unauthorized', 'No journal is stored for this sync key.');
  const payload = await readJson(request);
  if (payload instanceof Response) return payload;
  const list = (payload as { records?: unknown } | null)?.records;
  if (!Array.isArray(list) || list.length === 0) return fail('bad-request', 'Send a non-empty list of records.');
  if (list.length > LIMITS.recordsPerPush) return fail('too-large', `Send at most ${LIMITS.recordsPerPush} records at a time.`);

  const records: WireRecord[] = [];
  for (const raw of list) {
    const parsed = parseWireRecord(raw);
    if (!parsed.ok) return fail('bad-request', `Refused a record: ${parsed.reason}.`);
    records.push(parsed.record);
  }

  const ceiling = new Date(now.getTime() + LIMITS.clockSkewMs).toISOString();
  const rids = records.map((r) => r.rid);
  const known = await env.DB.prepare(`SELECT COUNT(*) AS n FROM records WHERE account_id = ? AND rid IN (${rids.map(() => '?').join(',')})`)
    .bind(id, ...rids)
    .first<{ n: number }>();
  const total = await env.DB.prepare('SELECT COUNT(*) AS n FROM records WHERE account_id = ?').bind(id).first<{ n: number }>();
  const fresh = records.length - (known?.n ?? 0);
  if ((total?.n ?? 0) + fresh > LIMITS.recordsPerAccount) return fail('quota', 'This journal has reached its storage limit.');

  // For each record: bump the account's change counter, then write the record with that number.
  // The WHERE keeps last-writer-wins correct even if two devices push at once, and on an exact
  // tie a live entry beats a deletion (matching the rule clients use when they merge).
  const statements = records.flatMap((r) => [
    env.DB.prepare('UPDATE accounts SET seq = seq + 1 WHERE id = ?').bind(id),
    env.DB.prepare(
      `INSERT INTO records (account_id, rid, seq, updated_at, deleted, blob)
       VALUES (?, ?, (SELECT seq FROM accounts WHERE id = ?), ?, ?, ?)
       ON CONFLICT (account_id, rid) DO UPDATE SET
         seq = excluded.seq, updated_at = excluded.updated_at, deleted = excluded.deleted, blob = excluded.blob
       WHERE excluded.updated_at > records.updated_at
          OR (excluded.updated_at = records.updated_at AND records.deleted = 1 AND excluded.deleted = 0)`,
    ).bind(id, r.rid, id, r.updatedAt > ceiling ? ceiling : r.updatedAt, r.deleted ? 1 : 0, r.blob),
  ]);
  await env.DB.batch(statements);

  const row = await env.DB.prepare('SELECT seq FROM accounts WHERE id = ?').bind(id).first<{ seq: number }>();
  const body: PushResponse = { cursor: row?.seq ?? 0 };
  return json(body);
}

async function remove(env: Env, id: string): Promise<Response> {
  await env.DB.batch([env.DB.prepare('DELETE FROM records WHERE account_id = ?').bind(id), env.DB.prepare('DELETE FROM accounts WHERE id = ?').bind(id)]);
  return json({ deleted: true });
}

/**
 * The whole API. Same-origin only (it's served beside the app), authenticated with a bearer secret
 * whose hash is the account id. Nothing here can read a journal: records are opaque to it.
 */
export async function handleRequest(request: Request, env: Env, now: () => Date = () => new Date()): Promise<Response> {
  try {
    const url = new URL(request.url);
    if (url.pathname === '/api/health') return json({ ok: true });
    if (url.pathname !== '/api/account' && url.pathname !== '/api/sync') return fail('not-found', 'Unknown endpoint.');

    const id = await accountIdFrom(request);
    if (!id) return fail('unauthorized', 'Missing or malformed credentials.');

    if (url.pathname === '/api/account') {
      if (request.method === 'POST') return await createAccount(env, id, now());
      if (request.method === 'DELETE') return (await accountExists(env.DB, id)) ? await remove(env, id) : json({ deleted: false });
      return fail('method', 'Use POST or DELETE.');
    }
    if (request.method === 'GET') return await pull(env, id, url);
    if (request.method === 'POST') return await push(env, id, request, now());
    return fail('method', 'Use GET or POST.');
  } catch (err) {
    console.error('sync api error', err instanceof Error ? err.message : err);
    return fail('server', 'Something went wrong on the server.');
  }
}
