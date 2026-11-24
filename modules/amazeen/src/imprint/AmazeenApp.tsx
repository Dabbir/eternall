import '@fontsource-variable/fraunces/full.css';
import '@fontsource-variable/fraunces/full-italic.css';
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import '@fontsource-variable/jetbrains-mono/wght.css';
import '../styles/global.css';
import './amazeen.kit.css';
import { Suspense, lazy, useMemo } from 'react';
import { useHouse, usePrimaryAction } from '@eternall/kit';
import { useCollection, useVault } from '@eternall/vault';
import { LOOK_PATH, readLook, type Look } from './look/look';
import { LookContext, useApplyLook } from './look/LookContext';
import { ErrorBoundary, PressLoader } from '../components/States';
import { ToastProvider } from '../components/Toast';
import { RouterProvider, setRouterBase, useRouter } from '../router/router';
import { NowProvider } from '../state/now';
import { StoreProvider } from '../state/store';
import { SyncProvider } from '../sync/SyncProvider';
import { Frame, Screens } from '../Screens';
import { EmbeddedContext, ShelfExtrasContext, HostControlsContext, ImmersiveContext, type HostControls } from './embedded';
import { amazeen } from '../index';
import { createVaultAdapter, type VaultLike } from './vaultAdapter';
import { MoveIn } from './MoveIn';
import { MentionContext, type PeopleMention } from './MentionField';
import { PERSON_PATH, searchPeople, type Person } from './people/people';
import PeopleRoom, { PeopleStrip } from './people/PeopleRoom';

setRouterBase('/amazeen');

const LettersRoom = lazy(() => import('./letters/LettersRoom'));

/** AMAZEEN as an ETERNALL imprint: its own screens and look, the house's vault, spine and theme. */
export default function AmazeenApp() {
  const vault = useVault();
  const house = useHouse();
  const adapter = useMemo(() => createVaultAdapter(vault), [vault]);
  usePrimaryAction({ label: 'Write a piece', run: () => house.navigate('/amazeen/write/story') });
  // The person's look for their edition, from the vault (imprint/look; docs/design/amazeen.md §13).
  const { col: lookCol } = useCollection<Look>(LOOK_PATH);
  const look = readLook(lookCol.get('look'));
  useApplyLook(look);
  const lookControls = useMemo(() => ({ look, setLook: (next: Look) => lookCol.put(next) }), [look, lookCol]);
  // "@" mentions come from the People wall (once KINDRED's people.mention; docs/adr/0014).
  const { items: people } = useCollection<Person>(PERSON_PATH);
  const mention = useMemo<PeopleMention>(
    () => ({ search: (q) => searchPeople(people, q).map((p) => ({ id: p.id, name: p.name })), nameOf: (id) => people.find((p) => p.id === id)?.name ?? null, href: (id) => `/amazeen/people/${id}` }),
    [people],
  );
  // AMAZEEN's own frame (its magazine spine) returns inside ETERNALL, with a small exit and the lock (adr/0011).
  const host = useMemo<HostControls>(
    () => ({ leave: house.leave, leaveLabel: amazeen.brand.leaveLabel, lock: house.lock, canLock: house.canLock, search: house.openSearch, notices: house.notices }),
    [house.leave, house.lock, house.canLock, house.openSearch, house.notices],
  );
  return (
    <EmbeddedContext.Provider value={true}>
      <ImmersiveContext.Provider value={house.immersive.allowed}>
      <MentionContext.Provider value={mention}>
      <ShelfExtrasContext.Provider value={PeopleStrip}>
      <HostControlsContext.Provider value={host}>
      <LookContext.Provider value={lookControls}>
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
      </LookContext.Provider>
      </HostControlsContext.Provider>
      </ShelfExtrasContext.Provider>
      </MentionContext.Provider>
      </ImmersiveContext.Provider>
    </EmbeddedContext.Provider>
  );
}

/** ETERNALL-only routes: `/amazeen/import` (F15), the People wall and the Letters room; everything else is AMAZEEN's own. */
function Routed({ vault }: { vault: VaultLike }) {
  const { path, navigate } = useRouter();
  if (path === '/import') return <MoveIn vault={vault} onOpenDesk={() => navigate('/')} />;
  if (path === '/people' || path.startsWith('/people/'))
    return (
      <Frame>
        <PeopleRoom path={path.slice('/people'.length) || '/'} search={new URLSearchParams(window.location.search)} />
      </Frame>
    );
  if (path === '/letters' || path.startsWith('/letters/'))
    return (
      <Frame>
        <LettersRoom path={path.slice('/letters'.length) || '/'} search={new URLSearchParams(window.location.search)} />
      </Frame>
    );
  return <Screens />;
}
