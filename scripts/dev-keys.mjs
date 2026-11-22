// Generates a development licence keypair (never commit the private key):
//   services/sync-worker/.dev.vars          LICENCE_PRIVATE_JWK=… (read by `wrangler dev`)
//   apps/web/.env.development.local         VITE_LICENCE_PUBLIC_JWK=… (read by Vite)
// Production: `wrangler secret put LICENCE_PRIVATE_JWK` and set VITE_LICENCE_PUBLIC_JWK at build.
import { writeFileSync, existsSync } from 'node:fs';

if (existsSync('services/sync-worker/.dev.vars') && !process.argv.includes('--force')) {
  console.log('Dev keys already exist (use --force to replace).');
  process.exit(0);
}
const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const priv = await crypto.subtle.exportKey('jwk', pair.privateKey);
const pub = await crypto.subtle.exportKey('jwk', pair.publicKey);
writeFileSync('services/sync-worker/.dev.vars', `LICENCE_PRIVATE_JWK='${JSON.stringify(priv)}'\nWEBHOOK_SECRET='dev-webhook-secret'\n`);
writeFileSync('apps/web/.env.development.local', `VITE_LICENCE_PUBLIC_JWK='${JSON.stringify(pub)}'\n`);
console.log('Wrote services/sync-worker/.dev.vars and apps/web/.env.development.local');
