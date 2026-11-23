import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/instrument-serif/latin-400.css';
import '@fontsource/instrument-serif/latin-400-italic.css';
import '@fontsource/instrument-sans/latin-400.css';
import '@fontsource/instrument-sans/latin-500.css';
import '@fontsource/instrument-sans/latin-600.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-500.css';
import './styles/tokens.css';
import './styles/base.css';
import '@eternall/ui/ui.css';
import './styles/app.css';
import './styles/shell.css';
import { Root } from './shell/Root';
import type { ImprintId } from '@eternall/core';
import { retiredDoorRedirect } from './shell/router';
import { applyDoorHead } from './shell/doorHead';
import { imprintById } from './registry';

// Retired doors (ENVOI, FOLIO, ALMANACK, PROLOGUE) point to where their pages live now.
const moved = retiredDoorRedirect(window.location.pathname, window.location.search);
if (moved) window.history.replaceState(null, '', moved);
// Arriving at an app's door: wear its identity from the first paint (doorHead.ts).
applyDoorHead(imprintById(window.location.pathname.split('/')[1] as ImprintId) ?? null);

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root');

createRoot(root).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
