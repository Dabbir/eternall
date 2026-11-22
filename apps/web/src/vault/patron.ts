import { useEffect, useState } from 'react';
import { useCollection, verifyLicence, type LicencePayload } from '@eternall/vault';

/** The licence lives inside the vault: encrypted, and synced to every device (docs/PRIVACY.md §8). */
export const LICENCE_PATH = 'house/licence';
export interface LicenceRecord {
  id: 'current';
  token: string;
}

const PUBLIC_JWK: JsonWebKey | null = (() => {
  try {
    return import.meta.env.VITE_LICENCE_PUBLIC_JWK ? (JSON.parse(import.meta.env.VITE_LICENCE_PUBLIC_JWK) as JsonWebKey) : null;
  } catch {
    return null;
  }
})();

export interface PatronState {
  /** Patron features available now (offline-verified signature, not expired). */
  active: boolean;
  payload: LicencePayload | null;
  token: string | null;
}

export function usePatron(): PatronState {
  const { col } = useCollection<LicenceRecord>(LICENCE_PATH);
  const token = col.get('current')?.token ?? null;
  const [payload, setPayload] = useState<LicencePayload | null>(null);
  useEffect(() => {
    let alive = true;
    if (!token || !PUBLIC_JWK) {
      setPayload(null);
      return;
    }
    void verifyLicence(token, PUBLIC_JWK).then((p) => alive && setPayload(p));
    return () => {
      alive = false;
    };
  }, [token]);
  const active = !!payload && Date.parse(payload.exp) > Date.now();
  return { active, payload, token };
}

export async function api<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  } catch {
    throw new Error('You’re offline, or the ETERNALL service can’t be reached. Try again in a moment.');
  }
  const json = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) throw new Error(json.message ?? 'The ETERNALL service didn’t answer.');
  return json;
}
