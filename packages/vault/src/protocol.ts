/**
 * The sync wire format shared by client and server (generalised from AMAZEEN's src/sync/protocol.ts).
 * A record is one encrypted vault record or a tombstone; its id is an opaque 22-character HMAC.
 */
export const SYNC_LIMITS = {
  /** base64url characters in one encrypted record (≈256 KB of ciphertext). */
  blobChars: 350_000,
  recordsPerPush: 200,
  bodyBytes: 4_000_000,
  recordsPerVault: 100_000,
  pageSize: 500,
  clockSkewMs: 5 * 60_000,
  /** After a licence lapses, the cloud copy is kept (and readable) this long. */
  retentionDays: 90,
  /** Grace after a failed payment, during which everything keeps working. */
  graceDays: 14,
} as const;

export interface SyncWireRecord {
  rid: string;
  updatedAt: string;
  deleted: boolean;
  blob: string | null;
}

export interface PullResponse {
  records: (SyncWireRecord & { seq: number })[];
  cursor: number;
  more: boolean;
}

export type ApiErrorCode = 'bad-request' | 'unauthorized' | 'not-found' | 'conflict' | 'patron-required' | 'too-large' | 'quota' | 'method' | 'server';
export interface ApiError {
  error: ApiErrorCode;
  message: string;
}

export const RID_RE = /^[A-Za-z0-9_-]{22}$/u;
export const AUTH_SECRET_RE = /^[A-Za-z0-9_-]{43}$/u;
const BASE64URL = /^[A-Za-z0-9_-]+$/u;

export function parseSyncRecord(value: unknown): { ok: true; record: SyncWireRecord } | { ok: false; reason: string } {
  if (typeof value !== 'object' || value === null) return { ok: false, reason: 'record is not an object' };
  const v = value as Record<string, unknown>;
  if (typeof v.rid !== 'string' || !RID_RE.test(v.rid)) return { ok: false, reason: 'bad record id' };
  if (typeof v.updatedAt !== 'string' || v.updatedAt.length > 40 || Number.isNaN(Date.parse(v.updatedAt))) return { ok: false, reason: 'bad timestamp' };
  if (typeof v.deleted !== 'boolean') return { ok: false, reason: 'missing deleted flag' };
  const updatedAt = new Date(v.updatedAt).toISOString();
  if (typeof v.blob !== 'string' || v.blob.length === 0 || v.blob.length > SYNC_LIMITS.blobChars || !BASE64URL.test(v.blob)) {
    // Vault tombstones still carry an encrypted blob (the logical key lives inside it).
    return { ok: false, reason: 'bad or oversized data' };
  }
  return { ok: true, record: { rid: v.rid, updatedAt, deleted: v.deleted, blob: v.blob } };
}

/* ---------- licences (docs/PRIVACY.md §8) ---------- */

export interface LicencePayload {
  v: 1;
  /** Licence id: random, never derived from the payer. */
  lid: string;
  tier: 'patron';
  /** ISO time after which the token must be refreshed (period end + grace). */
  exp: string;
  iat: string;
}

const enc = new TextEncoder();
const b64u = (bytes: Uint8Array) => {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/u, '');
};
const unb64u = (text: string) => Uint8Array.from(atob(text.replace(/-/gu, '+').replace(/_/gu, '/') + '==='.slice((text.length + 3) % 4)), (c) => c.charCodeAt(0));
const ECDSA = { name: 'ECDSA', namedCurve: 'P-256' } as const;
const SIGN = { name: 'ECDSA', hash: 'SHA-256' } as const;

export async function signLicence(payload: LicencePayload, privateJwk: JsonWebKey): Promise<string> {
  const key = await crypto.subtle.importKey('jwk', privateJwk, ECDSA, false, ['sign']);
  const body = b64u(enc.encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign(SIGN, key, enc.encode(body)));
  return `${body}.${b64u(sig)}`;
}

/** Verify a licence token offline. Returns the payload even if expired (callers check `exp`), or null if forged. */
export async function verifyLicence(token: string, publicJwk: JsonWebKey): Promise<LicencePayload | null> {
  const [body, sig] = token.split('.');
  if (!body || !sig || !BASE64URL.test(body) || !BASE64URL.test(sig)) return null;
  try {
    const key = await crypto.subtle.importKey('jwk', publicJwk, ECDSA, false, ['verify']);
    if (!(await crypto.subtle.verify(SIGN, key, unb64u(sig), enc.encode(body)))) return null;
    const p = JSON.parse(new TextDecoder().decode(unb64u(body))) as LicencePayload;
    return p.v === 1 && typeof p.lid === 'string' && p.tier === 'patron' && typeof p.exp === 'string' ? p : null;
  } catch {
    return null;
  }
}
