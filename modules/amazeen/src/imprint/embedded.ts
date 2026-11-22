import { createContext, useContext, type ComponentType, type ReactNode } from 'react';

/** True when AMAZEEN runs inside ETERNALL: the house owns theme, sync, install and the spine. */
export const EmbeddedContext = createContext(false);
export const useEmbedded = (): boolean => useContext(EmbeddedContext);

/** Lets the host replace AMAZEEN's own frame (its spine) with another one. */
export const ShellSlot = createContext<ComponentType<{ children: ReactNode }> | null>(null);

/** Whether immersive (3D) effects may run, decided by the host (capability, settings, licence). */
export const ImmersiveContext = createContext(false);
export const useImmersive = (): boolean => useContext(ImmersiveContext);
