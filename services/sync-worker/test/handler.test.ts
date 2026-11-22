import { handleRequest, type Env } from '../src/handler';
import worker from '../src/index';
import { verifyLicence } from '@eternall/vault/protocol';
import { createTestDb, devKeys } from './testing';

const AS = (n: number) => btoa(String.fromCharCode(...new Uint8Array(32).fill(n))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const rid = (i: number) => `r${String(i).padStart(21, '0')}`;
const blob = 'A'.repeat(40);

async function setup(now = new Date('2026-11-22T10:00:00Z')) {
  const keys = await devKeys();
  const env: Env = { DB: createTestDb(), LICENCE_PRIVATE_JWK: JSON.stringify(keys.privateJwk), PAYMENT_PROVIDER: 'dev', WEBHOOK_SECRET: 'whsec' };
  let clock = now;
  const call = (path: string, init: RequestInit & { auth?: string } = {}) => {
    const headers = new Headers(init.headers);
    if (init.auth) headers.set('authorization', `Bearer ${init.auth}`);
    if (init.body) headers.set('content-type', 'application/json');
    return handleRequest(new Request(`https://eternall.test${path}`, { ...init, headers }), env, () => clock);
  };
  const buy = async () => {
    const { url } = (await (await call('/api/checkout', { method: 'POST', body: JSON.stringify({ plan: 'monthly' }) })).json()) as { url: string };
    const code = new URL(url, 'https://x').searchParams.get('claim')!;
    const res = await call('/api/licence/claim', { method: 'POST', body: JSON.stringify({ code }) });
    return { code, token: ((await res.json()) as { token: string }).token };
  };
  return { env, keys, call, buy, setClock: (d: Date) => (clock = d) };
}

describe('licences', () => {
  it('turns a (dev) checkout into a signed licence, redeemable once', async () => {
    const { call, buy, keys } = await setup();
    const { code, token } = await buy();
    const p = await verifyLicence(token, keys.publicJwk);
    expect(p?.tier).toBe('patron');
    expect(Date.parse(p!.exp)).toBeGreaterThan(Date.parse('2026-12-22T00:00:00Z'));
    const again = await call('/api/licence/claim', { method: 'POST', body: JSON.stringify({ code }) });
    expect(again.status).toBe(409);
  });

  it('refuses forged tokens and refreshes real ones', async () => {
    const { call, buy } = await setup();
    const { token } = await buy();
    expect((await call('/api/licence/refresh', { method: 'POST', body: JSON.stringify({ token: token.slice(0, -3) + 'AAA' }) })).status).toBe(401);
    expect((await call('/api/licence/refresh', { method: 'POST', body: JSON.stringify({ token }) })).status).toBe(200);
  });

  it('accepts only correctly signed webhooks', async () => {
    const { call } = await setup();
    const body = JSON.stringify({ type: 'subscription.created', ref: 'sub_1', periodEnd: '2027-01-01T00:00:00Z' });
    expect((await call('/api/webhooks/payment', { method: 'POST', body, headers: { 'x-eternall-signature': 'deadbeef' } })).status).toBe(401);
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('whsec'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))), (b) => b.toString(16).padStart(2, '0')).join('');
    const ok = await call('/api/webhooks/payment', { method: 'POST', body, headers: { 'x-eternall-signature': sig } });
    expect(ok.status).toBe(201);
    expect(((await ok.json()) as { claimCode: string }).claimCode).toMatch(/^[A-Za-z0-9_-]{32}$/);
  });
});

describe('vault sync', () => {
  it('needs a licence to start, then syncs records newest-wins', async () => {
    const { call, buy } = await setup();
    expect((await call('/api/vault', { method: 'POST', auth: AS(1), body: JSON.stringify({ token: 'x.y' }) })).status).toBe(402);
    const { token } = await buy();
    expect((await call('/api/vault', { method: 'POST', auth: AS(1), body: JSON.stringify({ token }) })).status).toBe(201);
    const push = (updatedAt: string, b = blob) => call('/api/sync', { method: 'POST', auth: AS(1), body: JSON.stringify({ records: [{ rid: rid(1), updatedAt, deleted: false, blob: b }] }) });
    expect((await push('2026-11-22T09:00:00Z')).status).toBe(200);
    await push('2026-11-22T08:00:00Z', 'B'.repeat(40)); // older: ignored
    const pulled = (await (await call('/api/sync?since=0', { auth: AS(1) })).json()) as { records: { blob: string }[] };
    expect(pulled.records).toHaveLength(1);
    expect(pulled.records[0]!.blob).toBe(blob);
  });

  it('binds one licence to one vault, freed when that vault is deleted', async () => {
    const { call, buy } = await setup();
    const { token } = await buy();
    await call('/api/vault', { method: 'POST', auth: AS(1), body: JSON.stringify({ token }) });
    expect((await call('/api/vault', { method: 'POST', auth: AS(2), body: JSON.stringify({ token }) })).status).toBe(409);
    await call('/api/vault', { method: 'DELETE', auth: AS(1) });
    expect((await call('/api/vault', { method: 'POST', auth: AS(2), body: JSON.stringify({ token }) })).status).toBe(201);
  });

  it('pauses pushing after the grace period but keeps the copy readable for 90 days', async () => {
    const { call, buy, setClock } = await setup();
    const { token } = await buy();
    await call('/api/vault', { method: 'POST', auth: AS(1), body: JSON.stringify({ token }) });
    setClock(new Date('2027-01-15T00:00:00Z')); // a month past period end + 14 days grace
    const push = await call('/api/sync', { method: 'POST', auth: AS(1), body: JSON.stringify({ records: [{ rid: rid(2), updatedAt: '2027-01-15T00:00:00Z', deleted: false, blob }] }) });
    expect(push.status).toBe(402);
    expect((await call('/api/sync?since=0', { auth: AS(1) })).status).toBe(200);
    setClock(new Date('2027-06-01T00:00:00Z'));
    expect((await call('/api/sync?since=0', { auth: AS(1) })).status).toBe(402);
  });

  it('rejects malformed records and credentials', async () => {
    const { call, buy } = await setup();
    const { token } = await buy();
    await call('/api/vault', { method: 'POST', auth: AS(1), body: JSON.stringify({ token }) });
    expect((await call('/api/sync', { method: 'POST', auth: AS(1), body: JSON.stringify({ records: [{ rid: 'e:readable', updatedAt: 'x', deleted: false, blob }] }) })).status).toBe(400);
    expect((await call('/api/sync?since=0', { auth: 'short' })).status).toBe(401);
  });

  it('keeps the legacy AMAZEEN door closed unless it is bound', async () => {
    const { call } = await setup();
    expect((await call('/api/legacy/amazeen/sync?since=0', { auth: AS(1) })).status).toBe(404);
  });
});

describe('the worker', () => {
  it('falls back to each door’s own HTML for deep links', async () => {
    const served: string[] = [];
    const env = {
      ASSETS: {
        fetch: async (r: Request) => {
          const p = new URL(r.url).pathname;
          served.push(p);
          return new Response(p.endsWith('index.html') ? p : 'missing', { status: p.endsWith('index.html') ? 200 : 404 });
        },
      },
    } as unknown as Parameters<typeof worker.fetch>[1];
    const res = await worker.fetch(new Request('https://e.test/amazeen/issue/2026-W47', { headers: { accept: 'text/html' } }), env);
    expect(await res.text()).toBe('/amazeen/index.html');
    const house = await worker.fetch(new Request('https://e.test/inscriptions', { headers: { accept: 'text/html' } }), env);
    expect(await house.text()).toBe('/index.html');
  });
});
