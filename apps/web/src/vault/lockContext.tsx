import { createContext, useContext } from 'react';
import type { EncryptedStore, Keyring } from '@eternall/vault';

export interface LockApi {
  /** null while the archive lives only in memory (no vault created yet). */
  keyring: Keyring | null;
  store: EncryptedStore | null;
  /** True when locking would ask for something to open again (not device-only). */
  canLock: boolean;
  lock(): void;
  /** Ask the person to create the vault now (from a banner or settings). */
  requestSetup(): void;
  /** Re-read keyring state after a change (lock method, recovery confirmed). */
  refresh(): void;
  /** Remove the vault and everything in it from this device. */
  destroyAll(): Promise<void>;
}

export const LockContext = createContext<LockApi | null>(null);

export function useLock(): LockApi {
  const v = useContext(LockContext);
  if (!v) throw new Error('useLock must be used inside the vault boot');
  return v;
}
