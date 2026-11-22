import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const shared = { plugins: [react()], define: { __APP_VERSION__: JSON.stringify('test') } };

export default defineConfig({
  test: {
    projects: [
      {
        ...shared,
        resolve: { alias: { 'virtual:pwa-register/react': new URL('./modules/amazeen/src/test/pwa-stub.ts', import.meta.url).pathname } },
        test: {
          name: 'eternall',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./apps/web/src/test/setup.ts'],
          css: false,
          include: ['apps/**/*.test.{ts,tsx}', 'packages/**/*.test.{ts,tsx}', 'modules/*/src/**/*.test.{ts,tsx}'],
          exclude: ['**/node_modules/**', '**/dist/**', 'modules/amazeen/**'],
        },
      },
      {
        ...shared,
        resolve: { alias: { 'virtual:pwa-register/react': new URL('./modules/amazeen/src/test/pwa-stub.ts', import.meta.url).pathname } },
        test: {
          name: 'amazeen',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./modules/amazeen/src/test/setup.ts'],
          css: { modules: { classNameStrategy: 'non-scoped' } },
          include: ['modules/amazeen/src/**/*.test.{ts,tsx}'],
        },
      },
      {
        test: {
          name: 'sync-worker',
          environment: 'node',
          globals: true,
          include: ['services/**/*.test.ts'],
        },
      },
    ],
  },
});
