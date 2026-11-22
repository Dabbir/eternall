import { useRegisterSW } from 'virtual:pwa-register/react';

/** "A new edition is ready" — the house's update prompt (production builds only). */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  if (!needRefresh) return null;
  return (
    <div className="update-prompt" role="status">
      <p>A new edition of ETERNALL is ready.</p>
      <button type="button" className="btn btn--primary btn--s" onClick={() => void updateServiceWorker(true)}>
        Reload
      </button>
      <button type="button" className="btn btn--quiet btn--s" onClick={() => setNeedRefresh(false)}>
        Later
      </button>
    </div>
  );
}
