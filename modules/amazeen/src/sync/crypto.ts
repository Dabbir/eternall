/**
 * End-to-end encryption for sync, using only the browser's Web Crypto.
 *
 * One sync key gives two independent secrets (HKDF with different labels):
 * - `authSecret` goes to the server as a bearer token. The server stores only its hash, which is
 *   also the account id, so it can recognise the account but can't derive the encryption key.
 * - `encKey` (AES-256-GCM) never leaves the device.
 *
 * Each record is encrypted on its own, with the account and record ids bound in as authenticated
 * data, so the server can neither read a record nor swap one record's blob for another's.
 */
const enc = new TextEncoder();
const dec = new TextDecoder();
const SALT = enc.encode('amazeen/sync/v1');
const IV_BYTES = 12;

/** Bytes backed by a plain ArrayBuffer, which is what Web Crypto accepts. */
export type Bytes = Uint8Array<ArrayBuffer>;

export class SyncCryptoError extends Error {
  override name = 'SyncCryptoError';
}

export interface Keys {
  /** Sent as `Authorization: Bearer …`. */
  authSecret: string;
  /** Hash of the auth secret: the account's id on the server and in the encryption context. */
  accountId: string;
  encKey: CryptoKey;
}

export function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/u, '');
}

export function fromBase64Url(text: string): Bytes {
  if (!/^[A-Za-z0-9_-]*$/u.test(text)) throw new SyncCryptoError('Not valid base64url.');
  const padded = text.replace(/-/gu, '+').replace(/_/gu, '/') + '==='.slice((text.length + 3) % 4);
  const binary = atob(padded);
  const out: Bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/** SHA-256 → base64url. Used for the account id; the server computes exactly the same thing. */
export async function accountIdFor(authSecret: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', fromBase64Url(authSecret));
  return toBase64Url(new Uint8Array(digest));
}

export async function deriveKeys(keyBytes: Bytes): Promise<Keys> {
  const base = await crypto.subtle.importKey('raw', keyBytes, 'HKDF', false, ['deriveBits', 'deriveKey']);
  const derive = (label: string) => ({ name: 'HKDF', hash: 'SHA-256', salt: SALT, info: enc.encode(label) }) as const;
  const authBits = await crypto.subtle.deriveBits(derive('auth'), base, 256);
  const encKey = await crypto.subtle.deriveKey(derive('enc'), base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const authSecret = toBase64Url(new Uint8Array(authBits));
  return { authSecret, accountId: await accountIdFor(authSecret), encKey };
}

const context = (accountId: string, rid: string): Bytes => enc.encode(`${accountId}\u0000${rid}`);

/** Encrypt a JSON-serialisable value. Returns base64url of `iv ‖ ciphertext+tag`. */
export async function encryptRecord(keys: Pick<Keys, 'encKey' | 'accountId'>, rid: string, value: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const sealed = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: context(keys.accountId, rid) }, keys.encKey, enc.encode(JSON.stringify(value)));
  const out = new Uint8Array(IV_BYTES + sealed.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(sealed), IV_BYTES);
  return toBase64Url(out);
}

/** Decrypt and parse. Throws SyncCryptoError for the wrong key, tampering or a swapped record. */
export async function decryptRecord(keys: Pick<Keys, 'encKey' | 'accountId'>, rid: string, blob: string): Promise<unknown> {
  let bytes: Bytes;
  try {
    bytes = fromBase64Url(blob);
  } catch {
    throw new SyncCryptoError('Record is not valid base64url.');
  }
  if (bytes.length <= IV_BYTES + 16) throw new SyncCryptoError('Record is too short.');
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: bytes.subarray(0, IV_BYTES), additionalData: context(keys.accountId, rid) },
      keys.encKey,
      bytes.subarray(IV_BYTES),
    );
    return JSON.parse(dec.decode(plain)) as unknown;
  } catch {
    throw new SyncCryptoError('Could not decrypt this record (wrong key or altered data).');
  }
}
