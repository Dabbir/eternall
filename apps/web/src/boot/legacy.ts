import { isTone, isValidISO, type HouseProfile } from '@eternall/core';
import type { VaultRecord } from '@eternall/vault';

/**
 * One-time import of the original single-app ETERNALL archive (localStorage `eternall:archive`, v1)
 * into vault records. The old key is kept (renamed) so nothing is ever lost.
 */
export const LEGACY_KEY = 'eternall:archive';
export const LEGACY_DONE_KEY = 'eternall:archive:migrated';

/** Old chapter inks map by order onto the validated bookcloth palette. */
const INK_TO_CLOTH: Record<string, number> = { ochre: 1, tide: 2, clay: 3, moss: 4, plum: 5, slate: 6 };

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);
const list = (v: unknown): Obj[] => (Array.isArray(v) ? v.filter(isObj) : []);

export function legacyToRecords(raw: unknown, now = new Date().toISOString()): VaultRecord[] {
  if (!isObj(raw) || raw.version !== 1) return [];
  const out: VaultRecord[] = [];
  const put = (key: string, value: unknown, updatedAt = now) => out.push({ key, updatedAt, deleted: false, value });
  const okId = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(v);

  const p = raw.profile;
  if (isObj(p) && isValidISO(p.birthDate) && typeof p.name === 'string') {
    const profile: HouseProfile = {
      id: 'me',
      name: p.name,
      birthDate: p.birthDate,
      horizonYears: typeof p.horizonYears === 'number' ? p.horizonYears : 90,
      hemisphere: 'north',
      createdAt: str(p.createdAt, now),
    };
    put('house/profile/me', profile);
  }
  for (const i of list(raw.inscriptions)) {
    if (!okId(i.id) || !isValidISO(i.date) || !isTone(i.tone)) continue;
    put(`house/inscription/${i.id}`, { id: i.id, date: i.date, title: str(i.title), body: str(i.body), tone: i.tone, createdAt: str(i.createdAt, now), updatedAt: str(i.updatedAt, now) }, str(i.updatedAt, now));
  }
  for (const c of list(raw.capsules)) {
    if (!okId(c.id) || !isValidISO(c.sealedOn) || !isValidISO(c.opensOn)) continue;
    put(`envoi/letter/${c.id}`, { id: c.id, title: str(c.title), body: str(c.body), sealedOn: c.sealedOn, opensOn: c.opensOn, fingerprint: str(c.fingerprint), openedAt: typeof c.openedAt === 'string' ? c.openedAt : null });
  }
  for (const c of list(raw.chapters)) {
    if (!okId(c.id) || !isValidISO(c.start)) continue;
    put(`folio/chapter/${c.id}`, { id: c.id, title: str(c.title), start: c.start, end: isValidISO(c.end) ? c.end : null, cloth: INK_TO_CLOTH[str(c.ink)] ?? 1, note: str(c.note) });
  }
  const s = raw.settings;
  if (isObj(s)) {
    const theme = s.theme === 'light' || s.theme === 'dark' ? s.theme : 'system';
    const lens = s.lens === 'chapters' || s.lens === 'plain' ? s.lens : 'moments';
    put('house/settings/prefs', { id: 'prefs', theme, lens, flatPages: false, dismissed: [], hidden: [], autoLockMinutes: 15 });
  }
  return out;
}

export function readLegacy(storage: Storage = window.localStorage): VaultRecord[] {
  try {
    if (storage.getItem(LEGACY_DONE_KEY)) return [];
    const raw = storage.getItem(LEGACY_KEY);
    return raw ? legacyToRecords(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export function markLegacyMigrated(storage: Storage = window.localStorage) {
  try {
    const raw = storage.getItem(LEGACY_KEY);
    if (raw) {
      storage.setItem(LEGACY_DONE_KEY, raw);
      storage.removeItem(LEGACY_KEY);
    }
  } catch {
    /* storage unavailable: nothing to mark */
  }
}
