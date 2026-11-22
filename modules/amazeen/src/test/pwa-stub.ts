/** Test stand-in for `virtual:pwa-register/react` (provided by vite-plugin-pwa in real builds). */
export function useRegisterSW() {
  return {
    needRefresh: [false, () => undefined] as const,
    offlineReady: [false, () => undefined] as const,
    updateServiceWorker: async () => undefined,
  };
}
