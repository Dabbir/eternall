import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EMPTY_SYNC, Keyring, SYNC_META_KEY, SyncApi, Vault, VaultProvider, createMemoryStore, useVault, useVaultVersion, type EncryptedStore, type LockInput, type RecordStore, type UnlockInput, type VaultRecord } from '@eternall/vault';
import { Button, ToastProvider, useToast } from '@eternall/ui';
import { LEGACY_DONE_KEY, markLegacyMigrated, readLegacy } from '../boot/legacy';
import { PLAIN_KEY } from '../boot/localStore';
import { IMPRINT_IDS, imprintById } from '../registry';
import { DEFAULT_SETTINGS, SETTINGS_PATH, type HouseSettings } from '../house/domain/house';
import { LockContext, type LockApi } from '../vault/lockContext';
import { LockSetup } from '../vault/LockSetup';
import { RecoveryKit } from '../vault/RecoveryKit';
import { UnlockScreen } from '../vault/UnlockScreen';
import { useAutoLock } from '../vault/useAutoLock';
import { SyncProvider } from '../vault/SyncProvider';
import { UpdatePrompt } from './UpdatePrompt';
import { ErrorBoundary } from './ErrorBoundary';
import { Shell } from './Shell';
import type { ImprintId } from '@eternall/core';

type Boot =
  | { status: 'loading' }
  | { status: 'locked'; keyring: Keyring }
  | { status: 'ready'; vault: Vault; keyring: Keyring | null; store: EncryptedStore | null; secured: boolean }
  | { status: 'error'; message: string };

/** Phase 1 kept records in plaintext localStorage; read them once so they can move into the vault. */
function readPlainRecords(): VaultRecord[] {
  try {
    const raw = window.localStorage.getItem(PLAIN_KEY);
    return raw ? Object.values(JSON.parse(raw) as Record<string, VaultRecord>) : [];
  } catch {
    return [];
  }
}

function forgetPlaintext() {
  try {
    window.localStorage.removeItem(PLAIN_KEY);
    window.localStorage.removeItem(LEGACY_DONE_KEY);
  } catch {
    /* storage unavailable */
  }
}

const doorImprint = (): ImprintId | null => {
  const first = window.location.pathname.replace(/^\/+/, '').split('/')[0] ?? '';
  return (IMPRINT_IDS as readonly string[]).includes(first) ? (first as ImprintId) : null;
};

async function boot(factory?: IDBFactory): Promise<Boot> {
  const keyring = await Keyring.open(factory);
  if (keyring.exists) {
    if (!keyring.opensSilently) return { status: 'locked', keyring };
    const { store } = await keyring.unlock({ kind: 'device' });
    return { status: 'ready', vault: await Vault.open(store), keyring, store, secured: true };
  }
  // No vault yet: work in memory until the first thing worth keeping (docs/FLOWS.md F1–F2).
  const vault = await Vault.open(createMemoryStore(readPlainRecords()));
  const legacy = readLegacy();
  if (legacy.length) {
    vault.merge(legacy);
    markLegacyMigrated();
  }
  return { status: 'ready', vault, keyring, store: null, secured: false };
}

interface RootProps {
  /** Tests: an already-open store, skipping the keyring entirely. */
  store?: RecordStore;
  today?: string;
  idb?: IDBFactory;
}

export function Root({ store, today, idb }: RootProps) {
  const [state, setState] = useState<Boot>({ status: 'loading' });
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let alive = true;
    const start = store ? Vault.open(store).then((vault): Boot => ({ status: 'ready', vault, keyring: null, store: null, secured: true })) : boot(idb);
    start
      .then((s) => alive && setState(s))
      .catch((e: unknown) => alive && setState({ status: 'error', message: e instanceof Error ? e.message : 'Unknown error' }));
    return () => {
      alive = false;
    };
  }, [store, idb]);

  // Prefetch the door's imprint so the unlock threshold can wear its theme.
  useEffect(() => {
    if (state.status !== 'locked') return;
    const id = doorImprint();
    if (id) void imprintById(id)?.load().catch(() => undefined);
  }, [state.status]);

  // Tell other tabs about changes and locks; follow theirs (docs/FLOWS.md F18).
  const channel = useMemo(() => (typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('eternall-vault')), []);

  const lock = useCallback(() => {
    setState((s) => {
      if (s.status !== 'ready' || !s.keyring || !s.store || s.keyring.opensSilently) return s;
      void s.vault.flush().finally(() => s.store?.lock());
      channel?.postMessage({ type: 'lock' });
      return { status: 'locked', keyring: s.keyring };
    });
  }, [channel]);

  useEffect(() => {
    if (!channel) return;
    const onMessage = (e: MessageEvent<{ type: string }>) => {
      if (e.data?.type === 'lock') lock();
      if (e.data?.type === 'changed' && state.status === 'ready' && state.store) void state.store.load().then((r) => state.vault.merge(r, { persist: false }));
      if (e.data?.type === 'created' && state.status === 'ready' && !state.store) window.location.reload();
    };
    channel.addEventListener('message', onMessage);
    return () => channel.removeEventListener('message', onMessage);
  }, [channel, state, lock]);

  useEffect(() => {
    if (state.status !== 'ready') return;
    const off = state.vault.onFlushed(() => channel?.postMessage({ type: 'changed' }));
    const flush = () => void state.vault.flush();
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flush);
    return () => {
      off();
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', flush);
    };
  }, [state, channel]);

  if (state.status === 'loading') return <Splash />;
  if (state.status === 'error') {
    return (
      <main className="recovery" role="alert">
        <h1 className="display page-title">Your archive couldn’t be opened.</h1>
        <p className="muted">ETERNALL paused rather than risk overwriting anything. Reload to try again.</p>
        <p className="mono faint recovery__reason">{state.message}</p>
      </main>
    );
  }
  if (state.status === 'locked') {
    return (
      <UnlockScreen
        keyring={state.keyring}
        imprint={doorImprint()}
        onUnlock={async (input: UnlockInput) => {
          const { store: s } = await state.keyring.unlock(input);
          setState({ status: 'ready', vault: await Vault.open(s), keyring: state.keyring, store: s, secured: true });
        }}
      />
    );
  }

  const api: LockApi = {
    keyring: state.keyring,
    store: state.store,
    canLock: !!state.store && !!state.keyring && !state.keyring.opensSilently,
    lock,
    requestSetup: () => window.dispatchEvent(new Event('eternall:setup')),
    refresh,
    replaceStore: async (s) => {
      await state.vault.setStore(s);
      setState({ ...state, store: s });
    },
    destroyAll: async () => {
      await state.vault.destroy();
      await state.keyring?.destroy();
      forgetPlaintext();
      window.location.assign('/');
    },
  };

  return (
    <ErrorBoundary>
      <VaultProvider vault={state.vault}>
        <ToastProvider>
          <LockContext.Provider value={api} key={version}>
            <SyncProvider>
              <Shell {...(today ? { today } : {})} />
            </SyncProvider>
            {!state.secured && (
              <VaultSetup
                keyring={state.keyring}
                onCreated={(s) => {
                  setState({ ...state, store: s, secured: true });
                  channel?.postMessage({ type: 'created' });
                }}
              />
            )}
            {state.secured && state.store && <AutoLock enabled={api.canLock} onLock={lock} />}
            {import.meta.env.PROD && <UpdatePrompt />}
          </LockContext.Provider>
        </ToastProvider>
      </VaultProvider>
    </ErrorBoundary>
  );
}

function AutoLock({ enabled, onLock }: { enabled: boolean; onLock(): void }) {
  const vault = useVault();
  useVaultVersion();
  const prefs = vault.collection<HouseSettings>(SETTINGS_PATH).get('prefs');
  useAutoLock(enabled, prefs?.autoLockMinutes ?? DEFAULT_SETTINGS.autoLockMinutes, onLock);
  return null;
}

/** F2 + F3: create the vault on the first thing worth keeping, then show the recovery kit. */
function VaultSetup({ keyring, onCreated }: { keyring: Keyring | null; onCreated(store: EncryptedStore): void }) {
  const vault = useVault();
  useVaultVersion();
  const toast = useToast();
  const [dismissed, setDismissed] = useState(false);
  const [forced, setForced] = useState<null | 'create' | 'adopt'>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recovery, setRecovery] = useState<string | null>(null);
  const created = useRef<EncryptedStore | null>(null);
  const hasData = vault.hasRecordsOutside([SETTINGS_PATH]);

  useEffect(() => {
    const on = (e: Event) => {
      setDismissed(false);
      setForced((e as CustomEvent<{ mode?: 'adopt' }>).detail?.mode === 'adopt' ? 'adopt' : 'create');
    };
    window.addEventListener('eternall:setup', on);
    return () => window.removeEventListener('eternall:setup', on);
  }, []);

  // Never lose writing silently: warn before leaving while it lives only in memory.
  useEffect(() => {
    if (!hasData || created.current) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasData]);

  if (!keyring) return null;

  const create = async (input: LockInput, recoveryKey?: string) => {
    setBusy(true);
    setError(null);
    try {
      if (recoveryKey) {
        // Another device's vault (F9): same Vault Key, this device's own lock; sync brings the records.
        const { store, keys } = await keyring.adopt(recoveryKey, input);
        await vault.setStore(store);
        forgetPlaintext();
        const status = await new SyncApi(keys.authSecret).status().catch(() => null);
        if (status?.exists) await store.setMeta(SYNC_META_KEY, { ...EMPTY_SYNC, enabled: true });
        toast({ message: status?.exists ? 'This device is joined to your vault. Your records are arriving.' : 'Vault opened. Turn on sync on your other device to bring your records here.', tone: 'accent' });
        onCreated(store);
        return;
      }
      const { store, recoveryKey: key } = await keyring.create(input);
      await vault.setStore(store);
      forgetPlaintext();
      created.current = store;
      setRecovery(key);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t create a private vault in this browser.');
    } finally {
      setBusy(false);
    }
  };

  if (recovery && created.current) {
    return (
      <RecoveryKit
        recoveryKey={recovery}
        onDone={(confirmed) => {
          if (confirmed) void keyring.confirmRecovery();
          toast({ message: 'Your vault is locked to you. Everything here is encrypted.', tone: 'accent' });
          const s = created.current!;
          setRecovery(null);
          onCreated(s);
        }}
      />
    );
  }

  if (!hasData && !forced) return null;
  if (dismissed) {
    return (
      <div className="vault-banner" role="status">
        <p>Not locked yet — what you keep here will be lost when you close this tab.</p>
        <Button variant="primary" size="s" onClick={() => setDismissed(false)}>
          Lock it to me
        </Button>
      </div>
    );
  }
  return (
    <LockSetup
      busy={busy}
      error={error}
      startAdopt={forced === 'adopt'}
      onCreate={(i, rk) => void create(i, rk)}
      onClose={() => {
        setDismissed(true);
        setForced(null);
      }}
    />
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
