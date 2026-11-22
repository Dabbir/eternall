import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { AppShell } from './components/AppShell';
import { ErrorBoundary, PressLoader } from './components/States';
import { ToastProvider } from './components/Toast';
import { UpdatePrompt } from './components/UpdatePrompt';
import { Desk } from './features/desk/Desk';
import { Onboarding } from './features/onboarding/Onboarding';
import { NotFound } from './features/NotFound';
import { RouterProvider, useRouter } from './router/router';
import { NowProvider } from './state/now';
import { StoreProvider, useStore } from './state/store';
import { SyncProvider } from './sync/SyncProvider';
import type { StorageAdapter } from './domain/storage';

// Secondary screens are split out so the desk paints fast.
const Composer = lazy(() => import('./features/composer/Composer'));
const Reader = lazy(() => import('./features/reader/Reader'));
const Shelf = lazy(() => import('./features/shelf/Shelf'));
const Settings = lazy(() => import('./features/settings/Settings'));
const Privacy = lazy(() => import('./features/Privacy'));

function Screens() {
  const { route } = useRouter();
  const { data } = useStore();

  // The privacy page is readable before onboarding, so people can check it first.
  if (route.name === 'privacy') return data.magazine ? <AppShell><Privacy /></AppShell> : <Privacy standalone />;
  if (!data.magazine) return <Onboarding />;

  const shell = (node: ReactNode) => <AppShell>{node}</AppShell>;
  switch (route.name) {
    case 'desk':
      return shell(<Desk />);
    case 'shelf':
      return shell(<Shelf initialQuery={route.query} />);
    case 'settings':
      return shell(<Settings />);
    case 'write':
      return <Composer key={`new-${route.kind}`} mode={{ type: 'new', kind: route.kind }} />;
    case 'edit':
      return <Composer key={`edit-${route.id}`} mode={{ type: 'edit', id: route.id }} />;
    case 'issue':
      return <Reader key={route.key} issueKey={route.key} page={route.page} />;
    case 'not-found':
      return shell(<NotFound />);
    default:
      return shell(<NotFound />);
  }
}

export function App({ adapter }: { adapter?: StorageAdapter }) {
  return (
    <ErrorBoundary>
      <NowProvider>
        <StoreProvider fallback={<PressLoader label="Opening the archive…" />} {...(adapter ? { adapter } : {})}>
          <SyncProvider>
            <RouterProvider>
              <ToastProvider>
                {import.meta.env.PROD && <UpdatePrompt />}
                <Suspense fallback={<PressLoader />}>
                  <Screens />
                </Suspense>
              </ToastProvider>
            </RouterProvider>
          </SyncProvider>
        </StoreProvider>
      </NowProvider>
    </ErrorBoundary>
  );
}
