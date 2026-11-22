/**
 * The wire format shared by the client and the server. A "record" is one encrypted entry
 * (`e:<id>`), the encrypted masthead/cover settings (`meta`), or a tombstone for a deleted entry.
 */
export const LIMITS = {
  /** base64url characters in one encrypted record (≈128 KB of ciphertext). */
  blobChars: 175_000,
  recordsPerPush: 50,
  /** Request body size the server will read. */
  bodyBytes: 2_000_000,
  recordsPerAccount: 30_000,
  pageSize: 200,
  /** A device clock further ahead than this is treated as "now + this" so it can't pin a record forever. */
  clockSkewMs: 5 * 60_000,
} as const;

export interface WireRecord {
  rid: string;
  updatedAt: string;
  deleted: boolean;
  /** base64url, or null for a tombstone. */
  blob: string | null;
}

export interface PullResponse {
  records: (WireRecord & { seq: number })[];
  /** Resume from here next time. */
  cursor: number;
  /** There are more records after this page. */
  more: boolean;
}

export interface PushResponse {
  cursor: number;
}

export type ApiErrorCode = 'bad-request' | 'unauthorized' | 'not-found' | 'too-large' | 'quota' | 'method' | 'server';

export interface ApiError {
  error: ApiErrorCode;
  message: string;
}

const RID = /^(meta|e:[A-Za-z0-9_-]{1,64})$/u;
const BASE64URL = /^[A-Za-z0-9_-]+$/u;
export const AUTH_SECRET = /^[A-Za-z0-9_-]{43}$/u; // 32 bytes, base64url

export function isRid(value: unknown): value is string {
  return typeof value === 'string' && RID.test(value);
}

/** Validate one record from an untrusted source. Returns it normalised, or a reason it was refused. */
export function parseWireRecord(value: unknown): { ok: true; record: WireRecord } | { ok: false; reason: string } {
  if (typeof value !== 'object' || value === null) return { ok: false, reason: 'record is not an object' };
  const v = value as Record<string, unknown>;
  if (!isRid(v.rid)) return { ok: false, reason: 'bad record id' };
  if (typeof v.updatedAt !== 'string' || v.updatedAt.length > 40 || Number.isNaN(Date.parse(v.updatedAt))) return { ok: false, reason: 'bad timestamp' };
  if (typeof v.deleted !== 'boolean') return { ok: false, reason: 'missing deleted flag' };
  const updatedAt = new Date(v.updatedAt).toISOString();
  if (v.deleted) {
    if (v.blob !== null && v.blob !== undefined) return { ok: false, reason: 'a deleted record carries no data' };
    return { ok: true, record: { rid: v.rid, updatedAt, deleted: true, blob: null } };
  }
  if (typeof v.blob !== 'string' || v.blob.length === 0 || v.blob.length > LIMITS.blobChars || !BASE64URL.test(v.blob)) {
    return { ok: false, reason: 'bad or oversized data' };
  }
  return { ok: true, record: { rid: v.rid, updatedAt, deleted: false, blob: v.blob } };
}
