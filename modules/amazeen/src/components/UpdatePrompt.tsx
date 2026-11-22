import { useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useToast } from './Toast';

const CHECK_EVERY_MS = 60 * 60 * 1000;

/**
 * Registers the service worker and offers new versions as a toast instead of
 * swapping code under someone who is mid-sentence.
 */
export function UpdatePrompt() {
  const toast = useToast();
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Long-lived tabs (installed apps) still pick up releases.
      if (registration) window.setInterval(() => void registration.update(), CHECK_EVERY_MS);
    },
  });

  const shown = useRef({ refresh: false, offline: false });
  useEffect(() => {
    if (needRefresh && !shown.current.refresh) {
      shown.current.refresh = true;
      toast.push({
        message: 'A new edition of AMAZEEN is ready.',
        action: { label: 'Reload', onAction: () => void updateServiceWorker(true) },
        duration: 60_000,
      });
    }
  }, [needRefresh, toast, updateServiceWorker]);

  useEffect(() => {
    if (offlineReady && !shown.current.offline) {
      shown.current.offline = true;
      toast.push({ message: 'AMAZEEN now works offline.' });
    }
  }, [offlineReady, toast]);

  return null;
}
