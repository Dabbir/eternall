import { diffDays, parseISO } from './time';
import type { Capsule, ISODate } from './types';

export type CapsuleStatus = 'sealed' | 'ready' | 'opened';

export function capsuleStatus(c: Capsule, today: ISODate): CapsuleStatus {
  if (c.openedAt) return 'opened';
  return parseISO(c.opensOn) <= parseISO(today) ? 'ready' : 'sealed';
}


/** Fraction (0–1) of the waiting period already elapsed. */
export function sealProgress(c: Capsule, today: ISODate): number {
  const total = diffDays(c.sealedOn, c.opensOn);
  if (total <= 0) return 1;
  return Math.min(1, Math.max(0, diffDays(c.sealedOn, today) / total));
}

const canonical = (c: Pick<Capsule, 'title' | 'body' | 'sealedOn' | 'opensOn'>) =>
  JSON.stringify([c.title, c.body, c.sealedOn, c.opensOn]);

export async function fingerprintOf(c: Pick<Capsule, 'title' | 'body' | 'sealedOn' | 'opensOn'>): Promise<string> {
  const bytes = new TextEncoder().encode(canonical(c));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifySeal(c: Capsule): Promise<boolean> {
  return (await fingerprintOf(c)) === c.fingerprint;
}

/** Capsules that need attention first: ready, then soonest sealed, then most recently opened. */
export function sortCapsules(list: readonly Capsule[], today: ISODate): Capsule[] {
  const rank: Record<CapsuleStatus, number> = { ready: 0, sealed: 1, opened: 2 };
  return [...list].sort((a, b) => {
    const sa = capsuleStatus(a, today);
    const sb = capsuleStatus(b, today);
    if (sa !== sb) return rank[sa] - rank[sb];
    if (sa === 'opened') return (b.openedAt ?? '').localeCompare(a.openedAt ?? '');
    return a.opensOn.localeCompare(b.opensOn);
  });
}
