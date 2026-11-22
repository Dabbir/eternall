import { readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import amazeenPkg from '../../modules/amazeen/package.json' with { type: 'json' };

/** One HTML entry per door (docs/ARCHITECTURE.md §2): `/` plus `/<imprint>/` for every folder with an index.html. */
const doors = Object.fromEntries([
  ['house', resolve(import.meta.dirname, 'index.html')],
  ...readdirSync(import.meta.dirname, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !['dist', 'public', 'node_modules', 'src'].includes(d.name) && existsSync(resolve(import.meta.dirname, d.name, 'index.html')))
    .map((d) => [d.name, resolve(import.meta.dirname, d.name, 'index.html')]),
]);

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      injectRegister: false,
      // Each door ships its own manifest (public/manifests/*), so the plugin must not generate one.
      manifest: false,
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}', '**/*-latin-*.woff2'],
        maximumFileSizeToCacheInBytes: 3_000_000,
      },
      devOptions: { enabled: false },
    }),
  ],
  define: { __APP_VERSION__: JSON.stringify(amazeenPkg.version) },
  build: {
    rollupOptions: { input: doors },
    // Never inline fonts as data: URIs: the CSP (font-src 'self') would block them.
    assetsInlineLimit: (file: string) => (file.endsWith('.woff2') ? false : undefined),
  },
  server: { port: 5181, strictPort: true, proxy: { '/api': 'http://localhost:8788' } },
  preview: { port: 5182 },
});
