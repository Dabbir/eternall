import { createContext, useContext, type ComponentType, type ReactNode } from 'react';

/** True when AMAZEEN runs inside ETERNALL: the house owns theme, sync, install and the spine. */
export const EmbeddedContext = createContext(false);
export const useEmbedded = (): boolean => useContext(EmbeddedContext);

/** Lets the host replace AMAZEEN's own frame (its spine) with another one. */
export const ShellSlot = createContext<ComponentType<{ children: ReactNode }> | null>(null);

/** Whether immersive (3D) effects may run, decided by the host (capability, settings, licence). */
export const ImmersiveContext = createContext(false);
export const useImmersive = (): boolean => useContext(ImmersiveContext);

/**
 * What the host offers AMAZEEN's own frame when it runs inside ETERNALL (docs/adr/0011): a small
 * exit to the house, the lock, search, and the Letters room. Null when AMAZEEN runs on its own.
 */
export interface HostControls {
  leave(): void;
  leaveLabel: string;
  lock(): void;
  canLock: boolean;
  search(): void;
  notices: number;
}
export const HostControlsContext = createContext<HostControls | null>(null);
export const useHostControls = (): HostControls | null => useContext(HostControlsContext);

/** Something the host may add at the top of the Desk (unused since MARGINALIA's Overheard was retired, docs/adr/0014). */
export const DeskExtrasContext = createContext<ComponentType | null>(null);
