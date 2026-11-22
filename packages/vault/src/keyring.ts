import {
  deriveVaultKeys,
  deviceKek,
  fromBase64Url,
  passphraseKek,
  PBKDF2_ITERATIONS,
  prfKek,
  randomBytes,
  toBase64Url,
  unwrapVaultKey,
  wrapVaultKey,
  type Bytes,
  type VaultKeys,
} from './crypto';
import { createEncryptedStore, type EncryptedStore } from './encryptedStore';
import { deleteVaultDb, openVaultDb, type VaultDb } from './idb';
import { generateKey, keyText, parseKey, KEY_PROBLEMS } from './keyphrase';
import { createPasskey, evaluatePasskey } from './passkey';

export type LockKind = 'passphrase' | 'passkey' | 'device';

type Wrap =
  | { kind: 'passphrase'; salt: string; iterations: number; wrapped: string }
  | { kind: 'passkey'; credentialId: string; prfSalt: string; wrapped: string }
  | { kind: 'device'; wrapped: string };

export interface VaultMeta {
  version: 1;
  vaultId: string;
  createdAt: string;
  recoveryConfirmed: boolean;
  wraps: Wrap[];
}

export type LockInput = { kind: 'passphrase'; passphrase: string; iterations?: number } | { kind: 'passkey' } | { kind: 'device' };
export type UnlockInput = { kind: 'passphrase'; passphrase: string } | { kind: 'passkey' } | { kind: 'device' } | { kind: 'recovery'; text: string };

export class UnlockError extends Error {
  override name = 'UnlockError';
}

/**
 * The lock lifecycle (docs/PRIVACY.md §2, §4, §7). Holds wrapped copies of the Vault Key; the raw key
 * exists only for the moment it takes to derive non-extractable keys, and is never stored.
 */
export class Keyring {
  private constructor(
    private db: VaultDb,
    private factory: IDBFactory,
    private dbName: string,
    private meta: VaultMeta | null,
  ) {}

  static async open(factory: IDBFactory = globalThis.indexedDB, dbName?: string): Promise<Keyring> {
    const db = await openVaultDb(factory, dbName);
    const meta = (await db.getMeta<VaultMeta>('vault')) ?? null;
    return new Keyring(db, factory, dbName ?? 'eternall-vault', meta);
  }

  get exists() {
    return this.meta !== null;
  }
  get methods(): LockKind[] {
    return [...new Set(this.meta?.wraps.map((w) => w.kind) ?? [])];
  }
  /** Whether the vault opens without asking anything (device-only lock). */
  get opensSilently() {
    return this.methods.length === 1 && this.methods[0] === 'device';
  }
  get recoveryConfirmed() {
    return this.meta?.recoveryConfirmed ?? false;
  }
  get vaultId() {
    return this.meta?.vaultId ?? null;
  }
  get createdAt() {
    return this.meta?.createdAt ?? null;
  }

  private async wrap(input: LockInput, vk: Bytes): Promise<Wrap> {
    if (input.kind === 'passphrase') {
      const salt = randomBytes(16);
      const iterations = input.iterations ?? PBKDF2_ITERATIONS;
      return { kind: 'passphrase', salt: toBase64Url(salt), iterations, wrapped: await wrapVaultKey(await passphraseKek(input.passphrase, salt, iterations), vk) };
    }
    if (input.kind === 'passkey') {
      const pk = await createPasskey();
      return { kind: 'passkey', credentialId: pk.credentialId, prfSalt: pk.prfSalt, wrapped: await wrapVaultKey(await prfKek(pk.secret), vk) };
    }
    let dk = await this.db.getMeta<CryptoKey>('deviceKey');
    if (!dk) {
      dk = await deviceKek();
      await this.db.setMeta('deviceKey', dk);
    }
    return { kind: 'device', wrapped: await wrapVaultKey(dk, vk) };
  }

  /** Create a new vault. Returns its store and the recovery key to show once. */
  async create(input: LockInput): Promise<{ store: EncryptedStore; keys: VaultKeys; recoveryKey: string }> {
    if (this.meta) throw new Error('A vault already exists on this device.');
    const { bytes, text } = generateKey();
    const keys = await deriveVaultKeys(bytes);
    const wrap = await this.wrap(input, bytes);
    this.meta = { version: 1, vaultId: keys.vaultId, createdAt: new Date().toISOString(), recoveryConfirmed: false, wraps: [wrap] };
    await this.db.setMeta('vault', this.meta);
    return { store: createEncryptedStore(this.db, keys), keys, recoveryKey: text };
  }

  private async vaultKey(input: UnlockInput): Promise<Bytes> {
    if (!this.meta) throw new UnlockError('There is no vault on this device yet.');
    if (input.kind === 'recovery') {
      const parsed = parseKey(input.text);
      if (!parsed.ok) throw new UnlockError(KEY_PROBLEMS[parsed.reason]);
      const keys = await deriveVaultKeys(parsed.bytes);
      if (keys.vaultId !== this.meta.vaultId) throw new UnlockError('That recovery key belongs to a different vault.');
      return parsed.bytes;
    }
    const wrap = this.meta.wraps.find((w) => w.kind === input.kind);
    if (!wrap) throw new UnlockError('That lock isn’t set up on this device.');
    try {
      if (wrap.kind === 'passphrase' && input.kind === 'passphrase') {
        return await unwrapVaultKey(await passphraseKek(input.passphrase, fromBase64Url(wrap.salt), wrap.iterations), wrap.wrapped);
      }
      if (wrap.kind === 'passkey') return await unwrapVaultKey(await prfKek(await evaluatePasskey(wrap.credentialId, wrap.prfSalt)), wrap.wrapped);
      const dk = await this.db.getMeta<CryptoKey>('deviceKey');
      if (!dk) throw new UnlockError('This device’s key is missing. Use your recovery key.');
      return await unwrapVaultKey(dk, wrap.wrapped);
    } catch (e) {
      if (e instanceof UnlockError) throw e;
      throw new UnlockError(input.kind === 'passphrase' ? 'That passphrase didn’t open the vault.' : e instanceof Error ? e.message : 'Couldn’t unlock.');
    }
  }

  async unlock(input: UnlockInput): Promise<{ store: EncryptedStore; keys: VaultKeys }> {
    const keys = await deriveVaultKeys(await this.vaultKey(input));
    return { store: createEncryptedStore(this.db, keys), keys };
  }

  /** Replace all lock methods with a new one. Requires proof (current method or recovery key). */
  async setLock(proof: UnlockInput, next: LockInput): Promise<void> {
    const vk = await this.vaultKey(proof);
    const wrap = await this.wrap(next, vk);
    this.meta = { ...this.meta!, wraps: [wrap] };
    await this.db.setMeta('vault', this.meta);
  }

  /** Re-derive the recovery key text. Requires proof, so an open tab alone can't reveal it. */
  async revealRecoveryKey(proof: UnlockInput): Promise<string> {
    return keyText(await this.vaultKey(proof));
  }

  async confirmRecovery(): Promise<void> {
    if (!this.meta) return;
    this.meta = { ...this.meta, recoveryConfirmed: true };
    await this.db.setMeta('vault', this.meta);
  }

  /** Remove the vault, its keys and every record from this device. */
  async destroy(): Promise<void> {
    this.db.close();
    await deleteVaultDb(this.factory, this.dbName);
    this.meta = null;
    this.db = await openVaultDb(this.factory, this.dbName);
  }
}
