import { readArchive } from '../domain/validation';
import type { AppData } from '../domain/types';

export const STORAGE_KEY = 'eternall:archive';

export type LoadResult =
  | { status: 'empty' }
  | { status: 'ok'; data: AppData }
  | { status: 'corrupt'; raw: string; reason: string };

export function loadArchive(storage: Storage = window.localStorage): LoadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { status: 'empty' };
  }
  if (raw === null) return { status: 'empty' };
  try {
    return { status: 'ok', data: readArchive(JSON.parse(raw)) };
  } catch (e) {
    return { status: 'corrupt', raw, reason: e instanceof Error ? e.message : 'Unreadable data' };
  }
}

export type SaveResult = { ok: true } | { ok: false; reason: 'quota' | 'unavailable' };

export function saveArchive(data: AppData, storage: Storage = window.localStorage): SaveResult {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
    return { ok: true };
  } catch (e) {
    const quota = e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22);
    return { ok: false, reason: quota ? 'quota' : 'unavailable' };
  }
}

export function serializeForExport(data: AppData): string {
  return JSON.stringify({ ...data, exportedAt: new Date().toISOString(), app: 'ETERNALL' }, null, 2);
}

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

/** Parse an imported backup. Throws an Error with a human-readable message. */
export function parseImport(text: string): AppData {
  if (text.length > MAX_IMPORT_BYTES) throw new Error('That file is too large to be an ETERNALL archive.');
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('That file isn’t valid JSON.');
  }
  try {
    return readArchive(json);
  } catch (e) {
    throw new Error(`That archive is damaged (${e instanceof Error ? e.message : 'unknown problem'}).`);
  }
}
