import { useEffect, useState } from 'react';
import { Vault, VaultProvider, type RecordStore } from '@eternall/vault';
import { ToastProvider } from '@eternall/ui';
import { createLocalStore } from '../boot/localStore';
import { markLegacyMigrated, readLegacy } from '../boot/legacy';
import { ErrorBoundary } from './ErrorBoundary';
import { Shell } from './Shell';

type Boot = { status: 'loading' } | { status: 'ready'; vault: Vault } | { status: 'error'; message: string };

async function openVault(store: RecordStore): Promise<Vault> {
  const vault = await Vault.open(store);
  // Carry the original single-app archive across, once.
  const legacy = readLegacy();
  if (legacy.length) {
    vault.merge(legacy);
    await vault.flush();
    markLegacyMigrated();
  }
  return vault;
}

export function Root({ store, today }: { store?: RecordStore; today?: string }) {
  const [boot, setBoot] = useState<Boot>({ status: 'loading' });

  useEffect(() => {
    let alive = true;
    openVault(store ?? createLocalStore())
      .then((vault) => alive && setBoot({ status: 'ready', vault }))
      .catch((e: unknown) => alive && setBoot({ status: 'error', message: e instanceof Error ? e.message : 'Unknown error' }));
    return () => {
      alive = false;
    };
  }, [store]);

  // Persist whatever is pending when the page is hidden or closed.
  useEffect(() => {
    if (boot.status !== 'ready') return;
    const flush = () => void boot.vault.flush();
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', flush);
    };
  }, [boot]);

  if (boot.status === 'loading') return <Splash />;
  if (boot.status === 'error') {
    return (
      <main className="recovery" role="alert">
        <h1 className="display page-title">Your archive couldn’t be opened.</h1>
        <p className="muted">ETERNALL paused rather than risk overwriting anything. Reload to try again.</p>
        <p className="mono faint recovery__reason">{boot.message}</p>
      </main>
    );
  }
  return (
    <ErrorBoundary>
      <VaultProvider vault={boot.vault}>
        <ToastProvider>
          <Shell {...(today ? { today } : {})} />
        </ToastProvider>
      </VaultProvider>
    </ErrorBoundary>
  );
}

function Splash() {
  return (
    <div className="splash" role="status" aria-label="Opening ETERNALL">
      <div className="splash__cells" aria-hidden="true">
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} style={{ ['--i' as string]: i }} />
        ))}
      </div>
    </div>
  );
}
