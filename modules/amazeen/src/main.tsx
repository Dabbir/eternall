import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './lib/install';
// Self-hosted variable fonts: work offline, no third-party requests, strict CSP.
import '@fontsource-variable/fraunces/full.css';
import '@fontsource-variable/fraunces/full-italic.css';
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import '@fontsource-variable/jetbrains-mono/wght.css';
import './styles/global.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
