import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  build: {
    // Never inline fonts as data: URIs: the CSP (font-src 'self') would block them. Everything else keeps Vite's default.
    assetsInlineLimit: (file) => (file.endsWith('.woff2') ? false : undefined),
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    VitePWA({
      // Ask before activating a new version so nobody loses a half-written piece mid-update.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'AMAZEEN',
        short_name: 'AMAZEEN',
        description: 'The weekly magazine of your own life. Write all week; on Sunday it goes to press.',
        lang: 'en',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#f2ede3',
        theme_color: '#d43a24',
        categories: ['lifestyle', 'productivity'],
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Jot a note', url: '/write/note', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
          { name: 'Write a story', url: '/write/story', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
        ],
      },
      workbox: {
        // Precache the app shell and the Latin font subsets; other scripts' subsets load (and cache) on demand.
        globPatterns: ['**/*.{js,css,html,svg,png}', '**/*-latin-{full,opsz,wght}-*.woff2'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('.woff2'),
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
        navigateFallback: '/index.html',
        // The sync API is never an app page: don't answer /api/* navigations with the app shell.
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
});
