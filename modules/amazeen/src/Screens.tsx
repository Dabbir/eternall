import { createElement, lazy, useContext } from 'react';
import type { ReactNode } from 'react';
import { AppShell } from './components/AppShell';
import { Desk } from './features/desk/Desk';
import { Onboarding } from './features/onboarding/Onboarding';
import { NotFound } from './features/NotFound';
import { useRouter } from './router/router';
import { useStore } from './state/store';
import { ShellSlot } from './imprint/embedded';

// Secondary screens are split out so the desk paints fast.
const Composer = lazy(() => import('./features/composer/Composer'));
const Reader = lazy(() => import('./features/reader/Reader'));
const Shelf = lazy(() => import('./features/shelf/Shelf'));
const Settings = lazy(() => import('./features/settings/Settings'));
const Privacy = lazy(() => import('./features/Privacy'));

/** AMAZEEN's own spine, unless the host supplied another frame. */
function Frame({ children }: { children: ReactNode }) {
  const slot = useContext(ShellSlot);
  return slot ? createElement(slot, null, children) : <AppShell>{children}</AppShell>;
}

/** Every screen of the production room. The frame (spine) is swappable through `ShellSlot`. */
export function Screens() {
  const { route } = useRouter();
  const { data } = useStore();

  // The privacy page is readable before onboarding, so people can check it first.
  if (route.name === 'privacy') return data.magazine ? <Frame><Privacy /></Frame> : <Privacy standalone />;
  if (!data.magazine) return <Onboarding />;

  const shell = (node: ReactNode) => <Frame>{node}</Frame>;
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

