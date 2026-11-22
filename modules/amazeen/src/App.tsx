import { Suspense } from 'react';
import { ErrorBoundary, PressLoader } from './components/States';
import { ToastProvider } from './components/Toast';
import { UpdatePrompt } from './components/UpdatePrompt';
import { RouterProvider } from './router/router';
import { NowProvider } from './state/now';
import { StoreProvider } from './state/store';
import { Screens } from './Screens';
import { SyncProvider } from './sync/SyncProvider';
import type { StorageAdapter } from './domain/storage';

export function App({ adapter }: { adapter?: StorageAdapter }) {
  return (
    <ErrorBoundary>
      <NowProvider>
        <StoreProvider fallback={<PressLoader label="Opening the archive…" />} {...(adapter ? { adapter } : {})}>
          <div data-imprint="amazeen">
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
          </div>
        </StoreProvider>
      </NowProvider>
    </ErrorBoundary>
  );
}
