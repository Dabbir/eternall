import '@fontsource-variable/fraunces/full.css';
import '@fontsource-variable/fraunces/full-italic.css';
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import '@fontsource-variable/jetbrains-mono/wght.css';
import '../styles/global.css';
import { Suspense, lazy, useMemo } from 'react';
import { useHouse, usePrimaryAction } from '@eternall/kit';
import { useVault } from '@eternall/vault';
import { ErrorBoundary, PressLoader } from '../components/States';
import { ToastProvider } from '../components/Toast';
import { RouterProvider, setRouterBase, useRouter } from '../router/router';
import { NowProvider } from '../state/now';
import { StoreProvider } from '../state/store';
import { SyncProvider } from '../sync/SyncProvider';
import { Frame, Screens } from '../Screens';
import { EmbeddedContext, ImmersiveContext, ShellSlot } from './embedded';
import { MastheadStrip } from './MastheadStrip';
import { createVaultAdapter, type VaultLike } from './vaultAdapter';
import { MoveIn } from './MoveIn';
import { MentionContext } from './MentionField';

setRouterBase('/amazeen');

const LettersRoom = lazy(() => import('./letters/LettersRoom'));

/** AMAZEEN as an ETERNALL imprint: its own screens and look, the house's vault, spine and theme. */
export default function AmazeenApp() {
  const vault = useVault();
  const house = useHouse();
  const adapter = useMemo(() => createVaultAdapter(vault), [vault]);
  usePrimaryAction({ label: 'Write a piece', run: () => house.navigate('/amazeen/write/story') });
  return (
    <EmbeddedContext.Provider value={true}>
      <ImmersiveContext.Provider value={house.immersive.allowed}>
      <MentionContext.Provider value={house.capability('people.mention')}>
      <ShellSlot.Provider value={MastheadStrip}>
        <ErrorBoundary>
          <NowProvider>
            <StoreProvider fallback={<PressLoader label="Opening the archive…" />} adapter={adapter}>
              <SyncProvider>
                <RouterProvider>
                  <ToastProvider>
                    <Suspense fallback={<PressLoader />}>
                      <Routed vault={vault} />
                    </Suspense>
                  </ToastProvider>
                </RouterProvider>
              </SyncProvider>
            </StoreProvider>
          </NowProvider>
        </ErrorBoundary>
      </ShellSlot.Provider>
      </MentionContext.Provider>
      </ImmersiveContext.Provider>
    </EmbeddedContext.Provider>
  );
}

/** ETERNALL-only routes: `/amazeen/import` (F15) and the Letters room; everything else is AMAZEEN's own. */
function Routed({ vault }: { vault: VaultLike }) {
  const { path, navigate } = useRouter();
  if (path === '/import') return <MoveIn vault={vault} onOpenDesk={() => navigate('/')} />;
  if (path === '/letters' || path.startsWith('/letters/'))
    return (
      <Frame>
        <LettersRoom path={path.slice('/letters'.length) || '/'} search={new URLSearchParams(window.location.search)} />
      </Frame>
    );
  return <Screens />;
}
