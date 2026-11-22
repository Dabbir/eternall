import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  // Sync tests run in a plain Node environment (real Web Crypto), where there is no localStorage.
  if (typeof localStorage !== 'undefined') localStorage.clear();
});
