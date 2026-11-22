import { useSyncExternalStore } from 'react';

/** Chrome/Edge/Android fire this when the app is installable; Safari never does. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = (): void => listeners.forEach((l) => l());

// Captured at startup: the event can fire long before Settings is opened.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installed = true;
    notify();
  });
}

export type InstallState = 'installed' | 'available' | 'ios' | 'unsupported';

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return installed || nav.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches === true;
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  // iPadOS reports as Mac; touch support tells them apart.
  return /iPad|iPhone|iPod/u.test(navigator.userAgent) || (navigator.userAgent.includes('Mac') && navigator.maxTouchPoints > 1);
}

function snapshot(): InstallState {
  if (isStandalone()) return 'installed';
  if (deferred) return 'available';
  if (isIOS()) return 'ios';
  return 'unsupported';
}

export function useInstallState(): InstallState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    snapshot,
    () => 'unsupported',
  );
}

/** Show the browser's install dialog. Resolves true if the person accepted. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  deferred = null;
  await event.prompt();
  const { outcome } = await event.userChoice;
  notify();
  return outcome === 'accepted';
}
