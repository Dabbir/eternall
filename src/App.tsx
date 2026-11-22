import { useEffect, useState } from 'react';
import { EMPTY_DATA, type AppData } from './domain/types';
import { useApplyTheme } from './lib/theme';
import { useRoute } from './lib/router';
import { loadArchive, STORAGE_KEY, type LoadResult } from './store/persistence';
import { StoreProvider, useStore } from './store/StoreProvider';
import { ToastProvider } from './components/ui/Toast';
import { EditorsProvider } from './features/editors/EditorsProvider';
import { AppShell } from './features/shell/AppShell';
import { ErrorBoundary } from './features/shell/ErrorBoundary';
import { Recovery } from './features/shell/Recovery';
import { Onboarding } from './features/onboarding/Onboarding';
import { LifelineView } from './features/lifeline/LifelineView';
import { ArchiveView } from './features/archive/ArchiveView';
import { CapsulesView } from './features/capsules/CapsulesView';
import { ChaptersView } from './features/chapters/ChaptersView';
import { AlmanacView } from './features/almanac/AlmanacView';
import { SettingsView } from './features/settings/SettingsView';

function Screens() {
  const { data } = useStore();
  const route = useRoute();
  useApplyTheme(data.settings.theme);

  if (!data.profile) return <Onboarding />;

  const view = (() => {
    switch (route.name) {
      case 'archive': return <ArchiveView />;
      case 'capsules': return <CapsulesView />;
      case 'chapters': return <ChaptersView />;
      case 'almanac': return <AlmanacView />;
      case 'settings': return <SettingsView />;
      default: return <LifelineView route={route} />;
    }
  })();

  return (
    <EditorsProvider>
      <AppShell route={route.name}>{view}</AppShell>
    </EditorsProvider>
  );
}

export function App({ initial }: { initial?: LoadResult }) {
  const [load, setLoad] = useState<LoadResult>(() => initial ?? loadArchive());
  const [booted, setBooted] = useState(false);

  // Hold a short, graceful splash until the typefaces are ready, so nothing reflows.
  useEffect(() => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        setBooted(true);
      }
    };
    const timer = window.setTimeout(finish, 900);
    document.fonts?.ready.then(finish).catch(finish);
    if (!document.fonts) finish();
    return () => window.clearTimeout(timer);
  }, []);

  if (load.status === 'corrupt') {
    return (
      <Recovery
        raw={load.raw}
        reason={load.reason}
        onReset={() => {
          window.localStorage.removeItem(STORAGE_KEY);
          setLoad({ status: 'empty' });
        }}
      />
    );
  }

  // Re-read storage whenever the store mounts; fall back to the boot-time result.
  const loader = (): AppData => {
    const fresh = loadArchive();
    if (fresh.status === 'ok') return fresh.data;
    return load.status === 'ok' ? load.data : EMPTY_DATA;
  };
  return (
    <ErrorBoundary>
      <StoreProvider initial={loader}>
        <ToastProvider>
          <div className={`boot ${booted ? 'is-booted' : ''}`}>
            <Screens />
          </div>
          {!booted && <Splash />}
        </ToastProvider>
      </StoreProvider>
    </ErrorBoundary>
  );
}

function Splash() {
  return (
    <div className="splash" role="status" aria-label="Opening ETERNALL">
      <div className="splash__cells" aria-hidden="true">
        {Array.from({ length: 7 }, (_, i) => <span key={i} style={{ ['--i' as string]: i }} />)}
      </div>
    </div>
  );
}
