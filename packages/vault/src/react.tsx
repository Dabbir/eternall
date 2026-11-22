import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import type { Collection, Vault } from './vault';
import type { Entity } from './records';

const VaultContext = createContext<Vault | null>(null);

export function VaultProvider({ vault, children }: { vault: Vault; children: ReactNode }) {
  return <VaultContext.Provider value={vault}>{children}</VaultContext.Provider>;
}

export function useVault(): Vault {
  const v = useContext(VaultContext);
  if (!v) throw new Error('useVault must be used inside <VaultProvider>');
  return v;
}

/** Re-renders whenever anything in the vault changes; collections memoise per version. */
export function useVaultVersion(): number {
  const vault = useVault();
  return useSyncExternalStore(vault.subscribe, vault.getVersion, vault.getVersion);
}

export function useCollection<T extends Entity>(path: string): { items: readonly T[]; col: Collection<T> } {
  const vault = useVault();
  useVaultVersion();
  const col = vault.collection<T>(path);
  return { items: col.all(), col };
}

export function useRecord<T extends Entity>(path: string, id: string): T | undefined {
  const vault = useVault();
  useVaultVersion();
  return vault.collection<T>(path).get(id);
}
