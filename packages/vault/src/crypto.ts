/**
 * The vault's key hierarchy (docs/PRIVACY.md §2), using only Web Crypto.
 * Lifted from AMAZEEN's sync crypto (src/sync/crypto.ts) and generalised to the whole vault:
 *
 *   Vault Key (128 random bits) ──HKDF──▶ data key (AES-256-GCM)      records at rest and in sync
 *                                     ├─▶ record-id key (HMAC-SHA256) opaque record ids
 *                                     ├─▶ auth secret                 sync bearer token; SHA-256 = vault id
 *                                     └─▶ licence key (HMAC-SHA256)   binds a licence to this vault
 *
 * Derived keys are non-extractable. Lock methods wrap the Vault Key, never the derived keys.
 */
const enc = new TextEncoder();
const dec = new TextDecoder();
const SALT = enc.encode('eternall/vault/v1');
const IV_BYTES = 12;

export type Bytes = Uint8Array<ArrayBuffer>;

export class VaultCryptoError extends Error {
  override name = 'VaultCryptoError';
}

export interface VaultKeys {
  dataKey: CryptoKey;
  ridKey: CryptoKey;
  licenceKey: CryptoKey;
  /** Sent as the sync bearer token. */
  authSecret: string;
  /** SHA-256 of the auth secret: the vault's id locally, on the server, and in every record's AAD. */
  vaultId: string;
}

export const randomBytes = (n: number): Bytes => crypto.getRandomValues(new Uint8Array(n));

export function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/u, '');
}

export function fromBase64Url(text: string): Bytes {
  if (!/^[A-Za-z0-9_-]*$/u.test(text)) throw new VaultCryptoError('Not valid base64url.');
  const padded = text.replace(/-/gu, '+').replace(/_/gu, '/') + '==='.slice((text.length + 3) % 4);
  const binary = atob(padded);
  const out: Bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export async function vaultIdFor(authSecret: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', fromBase64Url(authSecret));
  return toBase64Url(new Uint8Array(digest));
}

export async function deriveVaultKeys(vaultKey: Bytes): Promise<VaultKeys> {
  const base = await crypto.subtle.importKey('raw', vaultKey, 'HKDF', false, ['deriveBits', 'deriveKey']);
  const info = (label: string) => ({ name: 'HKDF', hash: 'SHA-256', salt: SALT, info: enc.encode(label) }) as const;
  const dataKey = await crypto.subtle.deriveKey(info('enc'), base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const ridKey = await crypto.subtle.deriveKey(info('rid'), base, { name: 'HMAC', hash: 'SHA-256', length: 256 }, false, ['sign']);
  const licenceKey = await crypto.subtle.deriveKey(info('licence'), base, { name: 'HMAC', hash: 'SHA-256', length: 256 }, false, ['sign']);
  const authSecret = toBase64Url(new Uint8Array(await crypto.subtle.deriveBits(info('auth'), base, 256)));
  return { dataKey, ridKey, licenceKey, authSecret, vaultId: await vaultIdFor(authSecret) };
}

/** Opaque record id: neither the store nor the server can tell which imprint or collection a record is. */
export async function opaqueRid(keys: Pick<VaultKeys, 'ridKey'>, logicalKey: string): Promise<string> {
  const mac = await crypto.subtle.sign('HMAC', keys.ridKey, enc.encode(logicalKey));
  return toBase64Url(new Uint8Array(mac)).slice(0, 22);
}

export async function hmac(key: CryptoKey, text: string): Promise<string> {
  return toBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(text))));
}

const aad = (vaultId: string, rid: string): Bytes => enc.encode(`${vaultId}\u0000${rid}`);

async function sealBytes(key: CryptoKey, plain: Bytes, additionalData?: Bytes): Promise<string> {
  const iv = randomBytes(IV_BYTES);
  const params: AesGcmParams = additionalData ? { name: 'AES-GCM', iv, additionalData } : { name: 'AES-GCM', iv };
  const sealed = await crypto.subtle.encrypt(params, key, plain);
  const out = new Uint8Array(IV_BYTES + sealed.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(sealed), IV_BYTES);
  return toBase64Url(out);
}

async function openBytes(key: CryptoKey, blob: string, additionalData?: Bytes): Promise<Bytes> {
  let bytes: Bytes;
  try {
    bytes = fromBase64Url(blob);
  } catch {
    throw new VaultCryptoError('Not valid base64url.');
  }
  if (bytes.length <= IV_BYTES + 16) throw new VaultCryptoError('Too short.');
  try {
    const iv = bytes.subarray(0, IV_BYTES);
    const params: AesGcmParams = additionalData ? { name: 'AES-GCM', iv, additionalData } : { name: 'AES-GCM', iv };
    return new Uint8Array(await crypto.subtle.decrypt(params, key, bytes.subarray(IV_BYTES)));
  } catch {
    throw new VaultCryptoError('Could not decrypt (wrong key or altered data).');
  }
}

/** Encrypt a JSON value bound to this vault and record id. Returns base64url of `iv ‖ ciphertext+tag`. */
export function encryptRecord(keys: Pick<VaultKeys, 'dataKey' | 'vaultId'>, rid: string, value: unknown): Promise<string> {
  return sealBytes(keys.dataKey, enc.encode(JSON.stringify(value)), aad(keys.vaultId, rid));
}

export async function decryptRecord(keys: Pick<VaultKeys, 'dataKey' | 'vaultId'>, rid: string, blob: string): Promise<unknown> {
  return JSON.parse(dec.decode(await openBytes(keys.dataKey, blob, aad(keys.vaultId, rid)))) as unknown;
}

/* ---------- wrapping the Vault Key ---------- */

export const PBKDF2_ITERATIONS = 600_000;

export async function passphraseKek(passphrase: string, salt: Bytes, iterations = PBKDF2_ITERATIONS): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(passphrase.normalize('NFKC')), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

/** A KEK from a passkey's PRF output (WebAuthn `prf` extension). */
export async function prfKek(prfOutput: Bytes): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', prfOutput, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: SALT, info: enc.encode('passkey-kek') }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

/** A non-extractable device key, storable in IndexedDB (structured clone keeps it unexportable). */
export function deviceKek(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export const wrapVaultKey = (kek: CryptoKey, vaultKey: Bytes) => sealBytes(kek, vaultKey);

export async function unwrapVaultKey(kek: CryptoKey, wrapped: string): Promise<Bytes> {
  const vk = await openBytes(kek, wrapped);
  if (vk.length !== 16) throw new VaultCryptoError('Unexpected key length.');
  return vk;
}
