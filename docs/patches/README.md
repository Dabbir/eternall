# Patches for the original AMAZEEN repository

These patches are **for the owner to apply** to `~/orca/amazeen-app`. ETERNALL never modifies that repository itself (see `docs/adr/0006`).

## `amazeen-v1.5-move-to-eternall.patch`

AMAZEEN 1.5.0 adds **Move to ETERNALL** to the Office (docs/FLOWS.md F15, path 1). It opens `https://eternall.app/amazeen/import` in a popup and hands the archive over with `postMessage`:
- AMAZEEN trusts only `VITE_ETERNALL_ORIGIN` (default `https://eternall.app`) and only the popup it opened.
- ETERNALL trusts only `VITE_AMAZEEN_ORIGINS` (default `https://amazeen.app`; set it to the real AMAZEEN domain, e.g. the `*.workers.dev` URL) and only its own one-time nonce.

Apply:

```bash
cd ~/orca/amazeen-app
git checkout -b move-to-eternall
git am ~/orca/eternall/docs/patches/amazeen-v1.5-move-to-eternall.patch
npm run lint && npm test && npm run build
```

Then set `VITE_ETERNALL_ORIGIN` in AMAZEEN's build and `VITE_AMAZEEN_ORIGINS` in ETERNALL's build to each other's production origins before deploying.
