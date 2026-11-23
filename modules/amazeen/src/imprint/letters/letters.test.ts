import { fingerprintOf, letterStatus, sealProgress, validateLetter, verifySeal, type Letter } from './letters';

const today = '2026-11-20';
const profile = { id: 'me' as const, name: 'Ada', birthDate: '1990-06-15', horizonYears: 90, hemisphere: 'north' as const, createdAt: '' };
const base = { title: 'Hi', body: 'Future', sealedOn: '2026-01-01', opensOn: '2027-01-01' };

describe('letters', () => {
  it('moves from sealed to ready to opened', async () => {
    const l: Letter = { ...base, id: 'c', fingerprint: await fingerprintOf(base), openedAt: null };
    expect(letterStatus(l, '2026-06-01')).toBe('sealed');
    expect(letterStatus(l, '2027-01-01')).toBe('ready');
    expect(letterStatus({ ...l, openedAt: '2027-01-02T00:00:00Z' }, '2027-01-02')).toBe('opened');
    expect(sealProgress(l, '2026-07-02')).toBeCloseTo(0.5, 1);
  });
  it('detects tampering via the fingerprint', async () => {
    const l: Letter = { ...base, id: 'c', fingerprint: await fingerprintOf(base), openedAt: null };
    expect(await verifySeal(l)).toBe(true);
    expect(await verifySeal({ ...l, body: 'Edited' })).toBe(false);
  });
  it('requires an opening date from tomorrow up to the horizon', () => {
    const b = { title: 'To me', body: 'Hello' };
    expect(validateLetter({ ...b, opensOn: today }, profile, today).ok).toBe(false);
    expect(validateLetter({ ...b, opensOn: '2026-11-21' }, profile, today).ok).toBe(true);
    expect(validateLetter({ ...b, opensOn: '2080-06-15' }, profile, today).ok).toBe(false);
    expect(validateLetter({ ...b, opensOn: '2140-01-01' }, null, today).ok).toBe(true);
  });
});
