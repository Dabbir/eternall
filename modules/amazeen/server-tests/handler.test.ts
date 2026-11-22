// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import { deriveKeys } from '../src/sync/crypto';
import type { Keys } from '../src/sync/crypto';
import { LIMITS } from '../src/sync/protocol';
import type { ApiError, PullResponse, PushResponse, WireRecord } from '../src/sync/protocol';
import { handleRequest } from '../src/sync/server/handler';
import { createTestDb } from './testing';

const NOW = new Date('2026-11-18T12:00:00.000Z');
let db: ReturnType<typeof createTestDb>;
let alice: Keys;
let bob: Keys;

beforeEach(async () => {
  db = createTestDb();
  alice = await deriveKeys(Uint8Array.from({ length: 16 }, (_, i) => i + 1));
  bob = await deriveKeys(Uint8Array.from({ length: 16 }, (_, i) => i + 101));
});

const call = (method: string, path: string, who: Keys | null, body?: unknown, headers: Record<string, string> = {}) =>
  handleRequest(
    new Request(`https://amazeen.test${path}`, {
      method,
      headers: { ...(who ? { authorization: `Bearer ${who.authSecret}` } : {}), ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
    { DB: db },
    () => NOW,
  );

const rec = (rid: string, updatedAt: string, blob: string | null = 'QUJD', deleted = false): WireRecord => ({ rid, updatedAt, deleted, blob: deleted ? null : blob });
const register = (who: Keys) => call('POST', '/api/account', who);
const push = (who: Keys, ...records: WireRecord[]) => call('POST', '/api/sync', who, { records });
const pull = async (who: Keys, since = 0) => (await (await call('GET', `/api/sync?since=${since}`, who)).json()) as PullResponse;
const T = (n: number) => new Date(Date.UTC(2026, 10, 10 + n)).toISOString();

describe('accounts', () => {
  it('registers once, idempotently', async () => {
    expect((await register(alice)).status).toBe(201);
    expect(await (await register(alice)).json()).toEqual({ created: false });
    expect(db.raw.prepare('SELECT COUNT(*) AS n FROM accounts').get()).toEqual({ n: 1 });
  });

  it('stores only a hash of the secret, never the secret', async () => {
    await register(alice);
    const row = db.raw.prepare('SELECT id FROM accounts').get() as { id: string };
    expect(row.id).toBe(alice.accountId);
    expect(row.id).not.toBe(alice.authSecret);
  });

  it('refuses missing, malformed and unknown credentials', async () => {
    expect((await call('GET', '/api/sync', null)).status).toBe(401);
    expect((await call('GET', '/api/sync', null, undefined, { authorization: 'Bearer short' })).status).toBe(401);
    expect((await call('GET', '/api/sync', null, undefined, { authorization: `Basic ${alice.authSecret}` })).status).toBe(401);
    // a valid-looking secret for an account that was never created
    const res = await call('GET', '/api/sync', bob);
    expect(res.status).toBe(401);
    expect(((await res.json()) as ApiError).error).toBe('unauthorized');
    expect((await push(bob, rec('meta', T(1)))).status).toBe(401);
  });

  it('deletes the account and everything in it', async () => {
    await register(alice);
    await push(alice, rec('e:a', T(1)), rec('meta', T(1)));
    expect(await (await call('DELETE', '/api/account', alice)).json()).toEqual({ deleted: true });
    expect(db.raw.prepare('SELECT COUNT(*) AS n FROM records').get()).toEqual({ n: 0 });
    expect((await call('GET', '/api/sync', alice)).status).toBe(401);
    expect(await (await call('DELETE', '/api/account', alice)).json()).toEqual({ deleted: false });
  });

  it("one person's key can never read or delete another's journal", async () => {
    await register(alice);
    await register(bob);
    await push(alice, rec('e:secret', T(1), 'QUxJQ0U'));
    expect((await pull(bob)).records).toEqual([]);
    await call('DELETE', '/api/account', bob);
    expect((await pull(alice)).records).toHaveLength(1);
  });
});

describe('sync', () => {
  beforeEach(async () => {
    await register(alice);
  });

  it('round-trips records and hands out increasing change numbers', async () => {
    const res = await push(alice, rec('e:one', T(1), 'AAAA'), rec('e:two', T(2), 'BBBB'));
    expect(((await res.json()) as PushResponse).cursor).toBe(2);
    const page = await pull(alice);
    expect(page.records.map((r) => [r.rid, r.seq, r.blob])).toEqual([['e:one', 1, 'AAAA'], ['e:two', 2, 'BBBB']]);
    expect(page.cursor).toBe(2);
    expect(page.more).toBe(false);
  });

  it('pulls incrementally from a cursor', async () => {
    await push(alice, rec('e:one', T(1)));
    const first = await pull(alice);
    await push(alice, rec('e:two', T(2)));
    const next = await pull(alice, first.cursor);
    expect(next.records.map((r) => r.rid)).toEqual(['e:two']);
    expect((await pull(alice, next.cursor)).records).toEqual([]);
  });

  it('pages large pulls', async () => {
    const records = Array.from({ length: LIMITS.pageSize + 30 }, (_, i) => rec(`e:r${i}`, T(1)));
    for (let i = 0; i < records.length; i += LIMITS.recordsPerPush) await push(alice, ...records.slice(i, i + LIMITS.recordsPerPush));
    const a = await pull(alice);
    expect(a.records).toHaveLength(LIMITS.pageSize);
    expect(a.more).toBe(true);
    const b = await pull(alice, a.cursor);
    expect(b.records).toHaveLength(30);
    expect(b.more).toBe(false);
  });

  it('last writer wins: an older write is ignored, a newer one replaces', async () => {
    await push(alice, rec('e:x', T(5), 'NEWER'));
    await push(alice, rec('e:x', T(3), 'OLDER'));
    expect((await pull(alice)).records.find((r) => r.rid === 'e:x')?.blob).toBe('NEWER');
    await push(alice, rec('e:x', T(7), 'NEWEST'));
    const page = await pull(alice);
    expect(page.records.filter((r) => r.rid === 'e:x')).toHaveLength(1);
    expect(page.records.find((r) => r.rid === 'e:x')?.blob).toBe('NEWEST');
  });

  it('a replaced record moves to a new change number so other devices see it', async () => {
    await push(alice, rec('e:x', T(1), 'ONE'));
    const seen = (await pull(alice)).cursor;
    await push(alice, rec('e:x', T(2), 'TWO'));
    expect((await pull(alice, seen)).records.map((r) => r.blob)).toEqual(['TWO']);
  });

  it('a deletion replaces an older entry and drops its data; a later edit revives it', async () => {
    await push(alice, rec('e:x', T(1), 'DATA'));
    await push(alice, rec('e:x', T(2), null, true));
    const gone = (await pull(alice)).records[0];
    expect(gone).toMatchObject({ rid: 'e:x', deleted: true, blob: null });
    await push(alice, rec('e:x', T(3), 'BACK'));
    expect((await pull(alice)).records[0]).toMatchObject({ deleted: false, blob: 'BACK' });
  });

  it('on an exact tie a live entry beats a deletion, in either arrival order', async () => {
    await push(alice, rec('e:x', T(4), null, true));
    await push(alice, rec('e:x', T(4), 'LIVE'));
    expect((await pull(alice)).records[0]).toMatchObject({ deleted: false, blob: 'LIVE' });
    await push(alice, rec('e:y', T(4), 'LIVE'));
    await push(alice, rec('e:y', T(4), null, true));
    expect((await pull(alice)).records.find((r) => r.rid === 'e:y')).toMatchObject({ deleted: false });
  });

  it('clamps a clock far in the future so it cannot pin a record forever', async () => {
    await push(alice, rec('e:future', '2099-01-01T00:00:00.000Z'));
    const stored = (await pull(alice)).records[0];
    expect(Date.parse(stored?.updatedAt ?? '')).toBeLessThanOrEqual(NOW.getTime() + LIMITS.clockSkewMs);
  });

  it('is atomic: a bad batch changes nothing', async () => {
    const before = db.raw.prepare('SELECT seq FROM accounts').get();
    const res = await push(alice, rec('e:ok', T(1)), { rid: 'bad id!', updatedAt: T(1), deleted: false, blob: 'QQ' });
    expect(res.status).toBe(400);
    expect(db.raw.prepare('SELECT seq FROM accounts').get()).toEqual(before);
    expect(db.raw.prepare('SELECT COUNT(*) AS n FROM records').get()).toEqual({ n: 0 });
  });
});

describe('validation and limits', () => {
  beforeEach(async () => {
    await register(alice);
  });

  it.each([
    ['not an object', 42],
    ['a bad record id', { rid: 'e:../../x', updatedAt: T(1), deleted: false, blob: 'QQ' }],
    ['a missing flag', { rid: 'e:a', updatedAt: T(1), blob: 'QQ' }],
    ['a bad timestamp', { rid: 'e:a', updatedAt: 'yesterday', deleted: false, blob: 'QQ' }],
    ['non-base64url data', { rid: 'e:a', updatedAt: T(1), deleted: false, blob: 'not base64!' }],
    ['no data for a live record', { rid: 'e:a', updatedAt: T(1), deleted: false, blob: null }],
    ['data on a deletion', { rid: 'e:a', updatedAt: T(1), deleted: true, blob: 'QQ' }],
    ['an over-long record id', { rid: `e:${'a'.repeat(65)}`, updatedAt: T(1), deleted: false, blob: 'QQ' }],
  ])('refuses %s', async (_name, bad) => {
    expect((await call('POST', '/api/sync', alice, { records: [bad] })).status).toBe(400);
  });

  it('refuses empty, malformed and oversized requests', async () => {
    expect((await call('POST', '/api/sync', alice, { records: [] })).status).toBe(400);
    expect((await call('POST', '/api/sync', alice, { nope: true })).status).toBe(400);
    const notJson = await handleRequest(new Request('https://amazeen.test/api/sync', { method: 'POST', headers: { authorization: `Bearer ${alice.authSecret}` }, body: '{oops' }), { DB: db });
    expect(notJson.status).toBe(400);
    expect((await push(alice, ...Array.from({ length: LIMITS.recordsPerPush + 1 }, (_, i) => rec(`e:r${i}`, T(1))))).status).toBe(413);
    expect((await push(alice, rec('e:big', T(1), 'A'.repeat(LIMITS.blobChars + 1)))).status).toBe(400);
    const huge = await call('POST', '/api/sync', alice, { records: [rec('e:a', T(1))] }, { 'content-length': String(LIMITS.bodyBytes + 1) });
    expect(huge.status).toBe(413);
  });

  it('enforces the per-journal record quota, counting only new records', async () => {
    db.raw.exec(`INSERT INTO records (account_id, rid, seq, updated_at, deleted, blob)
      WITH RECURSIVE n(i) AS (SELECT 0 UNION ALL SELECT i + 1 FROM n WHERE i < ${LIMITS.recordsPerAccount - 1})
      SELECT '${alice.accountId}', 'e:fill' || i, 1, '${T(1)}', 0, 'QQ' FROM n`);
    expect((await push(alice, rec('e:one-too-many', T(2)))).status).toBe(429);
    expect((await push(alice, rec('e:fill7', T(2), 'UPDATED'))).status).toBe(200); // updating existing is fine
  });

  it('rejects unknown routes and wrong methods without leaking anything', async () => {
    expect((await call('GET', '/api/nope', alice)).status).toBe(404);
    expect((await call('PUT', '/api/sync', alice)).status).toBe(405);
    expect((await call('GET', '/api/account', alice)).status).toBe(405);
    const health = await call('GET', '/api/health', null);
    expect(health.status).toBe(200);
  });

  it('never lets responses be cached', async () => {
    const res = await call('GET', '/api/sync', alice);
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('survives injection-looking input (SQL is parameterised)', async () => {
    const evil = "e:a'; DROP TABLE records;--";
    expect((await push(alice, rec(evil, T(1)))).status).toBe(400); // not a legal record id
    expect(db.raw.prepare("SELECT name FROM sqlite_master WHERE name = 'records'").get()).toBeTruthy();
  });
});
