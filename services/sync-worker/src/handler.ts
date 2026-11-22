import { AUTH_SECRET_RE, SYNC_LIMITS, parseSyncRecord, signLicence, verifyLicence, type ApiError, type ApiErrorCode, type LicencePayload, type PullResponse, type SyncWireRecord } from '@eternall/vault/protocol';
import { handleRequest as handleAmazeenLegacy, type Db } from '@eternall/amazeen/sync/server/handler';

/**
 * ETERNALL's API (docs/PRIVACY.md §6, §8; docs/BUSINESS.md §4–5): encrypted vault sync,
 * anonymous licences, and a read-only door into AMAZEEN's old sync for moving in (F15 path 2).
 * Generalised from AMAZEEN's handler; nothing here can read a vault.
 */
export interface Env {
  DB: Db;
  /** AMAZEEN's old sync database, bound read-only for F15 path 2 (optional). */
  LEGACY_DB?: Db;
  /** ECDSA P-256 private JWK (JSON) that signs licences. A secret. */
  LICENCE_PRIVATE_JWK: string;
  /** Shared secret for payment-provider webhooks. */
  WEBHOOK_SECRET?: string;
  /** 'dev' simulates checkout locally; a real merchant of record plugs in via the webhook. */
  PAYMENT_PROVIDER?: 'dev' | 'webhook';
  /** Where a provider sends people back after checkout, e.g. https://eternall.app */
  PUBLIC_ORIGIN?: string;
}

const STATUS: Record<ApiErrorCode, number> = {
  'bad-request': 400,
  unauthorized: 401,
  'patron-required': 402,
  'not-found': 404,
  method: 405,
  conflict: 409,
  'too-large': 413,
  quota: 429,
  server: 500,
};
const HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
const DAY = 86_400_000;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: HEADERS });
const fail = (error: ApiErrorCode, message: string) => json({ error, message } satisfies ApiError, STATUS[error]);

const b64u = (bytes: Uint8Array) => {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/u, '');
};
const sha256 = async (bytes: Uint8Array) => b64u(new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(bytes))));
const randomId = (n = 18) => b64u(crypto.getRandomValues(new Uint8Array(n)));

async function vaultIdFrom(request: Request): Promise<string | null> {
  const secret = /^Bearer ([A-Za-z0-9_-]+)$/u.exec(request.headers.get('authorization') ?? '')?.[1];
  if (!secret || !AUTH_SECRET_RE.test(secret)) return null;
  const raw = atob(secret.replace(/-/gu, '+').replace(/_/gu, '/') + '=');
  return sha256(Uint8Array.from(raw, (c) => c.charCodeAt(0)));
}

async function readJson(request: Request): Promise<unknown | Response> {
  const text = await request.text();
  if (text.length > SYNC_LIMITS.bodyBytes) return fail('too-large', 'That request is too large.');
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return fail('bad-request', 'The request body is not valid JSON.');
  }
}

/* ---------- licences ---------- */

interface LicenceRow {
  id: string;
  tier: string;
  status: string;
  period_end: string;
}

const publicJwkOf = (env: Env): JsonWebKey => {
  const { d: _d, ...pub } = JSON.parse(env.LICENCE_PRIVATE_JWK) as JsonWebKey;
  return { ...pub, key_ops: ['verify'] };
};

/** A licence keeps its features through the paid period plus the grace window. */
const featuresUntil = (l: LicenceRow) => Date.parse(l.period_end) + SYNC_LIMITS.graceDays * DAY;
const readableUntil = (l: LicenceRow) => featuresUntil(l) + SYNC_LIMITS.retentionDays * DAY;
const usable = (l: LicenceRow | null, now: Date) => !!l && l.status !== 'cancelled' && featuresUntil(l) > now.getTime();

async function issueToken(env: Env, l: LicenceRow, now: Date): Promise<string> {
  const payload: LicencePayload = { v: 1, lid: l.id, tier: 'patron', exp: new Date(featuresUntil(l)).toISOString(), iat: now.toISOString() };
  return signLicence(payload, JSON.parse(env.LICENCE_PRIVATE_JWK) as JsonWebKey);
}

const getLicence = (db: Db, id: string) => db.prepare('SELECT id, tier, status, period_end FROM licences WHERE id = ?').bind(id).first<LicenceRow>();

async function createClaim(db: Db, licenceId: string, now: Date): Promise<string> {
  const code = randomId(24);
  await db
    .prepare('INSERT INTO claims (code_hash, licence_id, expires_at) VALUES (?, ?, ?)')
    .bind(await sha256(new TextEncoder().encode(code)), licenceId, new Date(now.getTime() + DAY).toISOString())
    .run();
  return code;
}

async function checkout(env: Env, request: Request, now: Date): Promise<Response> {
  const body = await readJson(request);
  if (body instanceof Response) return body;
  const plan = (body as { plan?: unknown } | null)?.plan;
  if (plan !== 'monthly' && plan !== 'yearly') return fail('bad-request', 'Choose monthly or yearly.');
  if ((env.PAYMENT_PROVIDER ?? 'dev') !== 'dev') {
    // A real merchant of record redirects to its own checkout and confirms through the webhook.
    return fail('server', 'Checkout isn’t configured yet. (Set the payment provider; see docs/BUSINESS.md §4.)');
  }
  // Development: simulate a successful purchase so every flow can be exercised end to end.
  const id = randomId();
  const end = new Date(now);
  if (plan === 'monthly') end.setUTCMonth(end.getUTCMonth() + 1);
  else end.setUTCFullYear(end.getUTCFullYear() + 1);
  await env.DB.prepare('INSERT INTO licences (id, tier, status, period_end, provider_ref, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, 'patron', 'active', end.toISOString(), 'dev', now.toISOString())
    .run();
  const code = await createClaim(env.DB, id, now);
  return json({ url: `/patron?claim=${code}` });
}

/** Provider → us. Signed with the shared secret: hex HMAC-SHA256 of the raw body. */
async function webhook(env: Env, request: Request, now: Date): Promise<Response> {
  if (!env.WEBHOOK_SECRET) return fail('not-found', 'Unknown endpoint.');
  const raw = await request.text();
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.WEBHOOK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const sigHex = request.headers.get('x-eternall-signature') ?? '';
  const sig = Uint8Array.from(sigHex.match(/../g) ?? [], (h) => parseInt(h, 16));
  if (!(await crypto.subtle.verify('HMAC', key, sig, new TextEncoder().encode(raw)))) return fail('unauthorized', 'Bad signature.');
  const e = JSON.parse(raw) as { type?: string; ref?: string; periodEnd?: string; status?: string };
  if (!e.ref || !e.type) return fail('bad-request', 'Missing event fields.');
  const existing = await env.DB.prepare('SELECT id, tier, status, period_end FROM licences WHERE provider_ref = ?').bind(e.ref).first<LicenceRow>();
  if (e.type === 'subscription.created' && !existing) {
    const id = randomId();
    await env.DB.prepare('INSERT INTO licences (id, tier, status, period_end, provider_ref, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, 'patron', 'active', e.periodEnd ?? now.toISOString(), e.ref, now.toISOString())
      .run();
    // The provider shows this code on its success page / receipt; the app redeems it.
    return json({ claimCode: await createClaim(env.DB, id, now) }, 201);
  }
  if (!existing) return fail('not-found', 'Unknown subscription.');
  if (e.type === 'subscription.updated') {
    await env.DB.prepare('UPDATE licences SET status = ?, period_end = ? WHERE id = ?').bind(e.status ?? existing.status, e.periodEnd ?? existing.period_end, existing.id).run();
  } else if (e.type === 'subscription.cancelled') {
    await env.DB.prepare('UPDATE licences SET status = ? WHERE id = ?').bind('cancelled', existing.id).run();
  } else if (e.type === 'claim.reissue') {
    // "Restore purchase": the provider confirmed the payer; issue a fresh claim code.
    return json({ claimCode: await createClaim(env.DB, existing.id, now) });
  }
  return json({ ok: true });
}

async function claim(env: Env, request: Request, now: Date): Promise<Response> {
  const body = await readJson(request);
  if (body instanceof Response) return body;
  const code = (body as { code?: unknown } | null)?.code;
  if (typeof code !== 'string' || !/^[A-Za-z0-9_-]{16,64}$/u.test(code)) return fail('bad-request', 'That isn’t a claim code.');
  const hash = await sha256(new TextEncoder().encode(code));
  const row = await env.DB.prepare('SELECT licence_id, expires_at, used_at FROM claims WHERE code_hash = ?').bind(hash).first<{ licence_id: string; expires_at: string; used_at: string | null }>();
  if (!row) return fail('not-found', 'That claim code wasn’t recognised.');
  if (row.used_at) return fail('conflict', 'This code was already redeemed. If that wasn’t you, contact us with your receipt.');
  if (Date.parse(row.expires_at) < now.getTime()) return fail('conflict', 'This code has expired. Restore your purchase to get a new one.');
  const l = await getLicence(env.DB, row.licence_id);
  if (!usable(l, now)) return fail('patron-required', 'That subscription isn’t active.');
  await env.DB.prepare('UPDATE claims SET used_at = ? WHERE code_hash = ?').bind(now.toISOString(), hash).run();
  return json({ token: await issueToken(env, l!, now) });
}

async function refresh(env: Env, request: Request, now: Date): Promise<Response> {
  const body = await readJson(request);
  if (body instanceof Response) return body;
  const token = (body as { token?: unknown } | null)?.token;
  const p = typeof token === 'string' ? await verifyLicence(token, publicJwkOf(env)) : null;
  if (!p) return fail('unauthorized', 'That licence isn’t valid.');
  const l = await getLicence(env.DB, p.lid);
  if (!usable(l, now)) return fail('patron-required', 'Your Patron subscription has ended. Your data is untouched.');
  return json({ token: await issueToken(env, l!, now) });
}

/* ---------- vaults and sync ---------- */

interface VaultRow {
  id: string;
  licence_id: string | null;
}
const getVault = (db: Db, id: string) => db.prepare('SELECT id, licence_id FROM vaults WHERE id = ?').bind(id).first<VaultRow>();

async function registerVault(env: Env, id: string, request: Request, now: Date): Promise<Response> {
  const body = await readJson(request);
  if (body instanceof Response) return body;
  const token = (body as { token?: unknown } | null)?.token;
  const p = typeof token === 'string' ? await verifyLicence(token, publicJwkOf(env)) : null;
  if (!p) return fail('patron-required', 'Sync is part of ETERNALL Patron.');
  const l = await getLicence(env.DB, p.lid);
  if (!usable(l, now)) return fail('patron-required', 'Your Patron subscription isn’t active.');
  const holder = await env.DB.prepare('SELECT id FROM vaults WHERE licence_id = ?').bind(l!.id).first<{ id: string }>();
  if (holder && holder.id !== id) return fail('conflict', 'This licence is already syncing another vault. Turn sync off there (or rotate keys) first.');
  const existing = await getVault(env.DB, id);
  if (existing) {
    if (existing.licence_id !== l!.id) await env.DB.prepare('UPDATE vaults SET licence_id = ? WHERE id = ?').bind(l!.id, id).run();
    return json({ created: false });
  }
  await env.DB.prepare('INSERT INTO vaults (id, seq, licence_id, created_at) VALUES (?, 0, ?, ?)').bind(id, l!.id, now.toISOString()).run();
  return json({ created: true }, 201);
}

async function licenceOfVault(env: Env, v: VaultRow) {
  return v.licence_id ? getLicence(env.DB, v.licence_id) : null;
}

async function pull(env: Env, v: VaultRow, url: URL, now: Date): Promise<Response> {
  const l = await licenceOfVault(env, v);
  // Reading stays possible for the retention window after a lapse, so nobody is locked out of their copy.
  if (!l || readableUntil(l) < now.getTime()) return fail('patron-required', 'This cloud copy has expired.');
  const since = Number(url.searchParams.get('since') ?? 0);
  if (!Number.isSafeInteger(since) || since < 0) return fail('bad-request', 'Bad cursor.');
  const { results } = await env.DB.prepare('SELECT rid, seq, updated_at, deleted, blob FROM records WHERE vault_id = ? AND seq > ? ORDER BY seq ASC LIMIT ?')
    .bind(v.id, since, SYNC_LIMITS.pageSize + 1)
    .all<{ rid: string; seq: number; updated_at: string; deleted: number; blob: string | null }>();
  const page = results.slice(0, SYNC_LIMITS.pageSize);
  const body: PullResponse = {
    records: page.map((r) => ({ rid: r.rid, seq: r.seq, updatedAt: r.updated_at, deleted: r.deleted === 1, blob: r.blob })),
    cursor: page.at(-1)?.seq ?? since,
    more: results.length > SYNC_LIMITS.pageSize,
  };
  return json(body);
}

async function push(env: Env, v: VaultRow, request: Request, now: Date): Promise<Response> {
  const l = await licenceOfVault(env, v);
  if (!usable(l, now)) return fail('patron-required', 'Sync is paused: your Patron subscription has ended. Nothing on your devices is affected.');
  const payload = await readJson(request);
  if (payload instanceof Response) return payload;
  const list = (payload as { records?: unknown } | null)?.records;
  if (!Array.isArray(list) || list.length === 0) return fail('bad-request', 'Send a non-empty list of records.');
  if (list.length > SYNC_LIMITS.recordsPerPush) return fail('too-large', `Send at most ${SYNC_LIMITS.recordsPerPush} records at a time.`);
  const records: SyncWireRecord[] = [];
  for (const raw of list) {
    const parsed = parseSyncRecord(raw);
    if (!parsed.ok) return fail('bad-request', `Refused a record: ${parsed.reason}.`);
    records.push(parsed.record);
  }
  const ceiling = new Date(now.getTime() + SYNC_LIMITS.clockSkewMs).toISOString();
  const rids = records.map((r) => r.rid);
  const known = await env.DB.prepare(`SELECT COUNT(*) AS n FROM records WHERE vault_id = ? AND rid IN (${rids.map(() => '?').join(',')})`)
    .bind(v.id, ...rids)
    .first<{ n: number }>();
  const total = await env.DB.prepare('SELECT COUNT(*) AS n FROM records WHERE vault_id = ?').bind(v.id).first<{ n: number }>();
  if ((total?.n ?? 0) + records.length - (known?.n ?? 0) > SYNC_LIMITS.recordsPerVault) return fail('quota', 'This vault has reached its storage limit.');
  // Newest change wins per record; on an exact tie a live record beats a deletion (the client rule too).
  const statements = records.flatMap((r) => [
    env.DB.prepare('UPDATE vaults SET seq = seq + 1 WHERE id = ?').bind(v.id),
    env.DB.prepare(
      `INSERT INTO records (vault_id, rid, seq, updated_at, deleted, blob)
       VALUES (?, ?, (SELECT seq FROM vaults WHERE id = ?), ?, ?, ?)
       ON CONFLICT (vault_id, rid) DO UPDATE SET
         seq = excluded.seq, updated_at = excluded.updated_at, deleted = excluded.deleted, blob = excluded.blob
       WHERE excluded.updated_at > records.updated_at
          OR (excluded.updated_at = records.updated_at AND records.deleted = 1 AND excluded.deleted = 0)`,
    ).bind(v.id, r.rid, v.id, r.updatedAt > ceiling ? ceiling : r.updatedAt, r.deleted ? 1 : 0, r.blob),
  ]);
  await env.DB.batch(statements);
  const row = await env.DB.prepare('SELECT seq FROM vaults WHERE id = ?').bind(v.id).first<{ seq: number }>();
  return json({ cursor: row?.seq ?? 0 });
}

async function removeVault(env: Env, id: string): Promise<Response> {
  await env.DB.batch([env.DB.prepare('DELETE FROM records WHERE vault_id = ?').bind(id), env.DB.prepare('DELETE FROM vaults WHERE id = ?').bind(id)]);
  return json({ deleted: true });
}

export async function handleRequest(request: Request, env: Env, now: () => Date = () => new Date()): Promise<Response> {
  try {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path === '/api/health') return json({ ok: true });
    if (path === '/api/checkout' && request.method === 'POST') return await checkout(env, request, now());
    if (path === '/api/webhooks/payment' && request.method === 'POST') return await webhook(env, request, now());
    if (path === '/api/licence/claim' && request.method === 'POST') return await claim(env, request, now());
    if (path === '/api/licence/refresh' && request.method === 'POST') return await refresh(env, request, now());
    if (path === '/api/legacy/amazeen/sync') {
      // F15 path 2: read-only access to AMAZEEN's old sync, so a journal can move in with its sync key.
      if (!env.LEGACY_DB || request.method !== 'GET') return fail('not-found', 'Unknown endpoint.');
      const legacyUrl = new URL(url);
      legacyUrl.pathname = '/api/sync';
      return await handleAmazeenLegacy(new Request(legacyUrl, { method: 'GET', headers: request.headers }), { DB: env.LEGACY_DB });
    }
    if (path !== '/api/vault' && path !== '/api/sync') return fail('not-found', 'Unknown endpoint.');

    const id = await vaultIdFrom(request);
    if (!id) return fail('unauthorized', 'Missing or malformed credentials.');
    if (path === '/api/vault') {
      if (request.method === 'POST') return await registerVault(env, id, request, now());
      if (request.method === 'DELETE') return (await getVault(env.DB, id)) ? await removeVault(env, id) : json({ deleted: false });
      if (request.method === 'GET') {
        const v = await getVault(env.DB, id);
        if (!v) return fail('not-found', 'No cloud copy for this vault.');
        const l = await licenceOfVault(env, v);
        return json({ exists: true, active: usable(l, now()) });
      }
      return fail('method', 'Use GET, POST or DELETE.');
    }
    const v = await getVault(env.DB, id);
    if (!v) return fail('unauthorized', 'No cloud copy for this vault.');
    if (request.method === 'GET') return await pull(env, v, url, now());
    if (request.method === 'POST') return await push(env, v, request, now());
    return fail('method', 'Use GET or POST.');
  } catch (err) {
    console.error('api error', err instanceof Error ? err.message : err);
    return fail('server', 'Something went wrong on the server.');
  }
}
