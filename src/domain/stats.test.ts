import { capsuleStatus, fingerprintOf, sealProgress, verifySeal } from './capsule';
import { buildLifeline } from './lifeline';
import { computeAlmanac, searchInscriptions, streaks } from './stats';
import { EMPTY_DATA, type AppData, type Capsule, type Inscription } from './types';

const ins = (id: string, date: string, tone: Inscription['tone'] = 'joy', title = id): Inscription => ({
  id, date, title, body: '', tone, createdAt: date, updatedAt: date,
});

const data: AppData = {
  ...EMPTY_DATA,
  profile: { name: 'Ada', birthDate: '1990-06-15', horizonYears: 90, createdAt: '' },
  inscriptions: [ins('a', '2025-11-21', 'calm'), ins('b', '2024-11-22', 'grief'), ins('c', '2026-11-16', 'joy'), ins('d', '2026-11-18', 'joy')],
};

describe('streaks', () => {
  it('finds the longest and current runs', () => {
    expect(streaks(new Set([1, 2, 3, 7, 8]), 9)).toEqual({ longest: 3, current: 2 });
    expect(streaks(new Set([1, 2, 3, 7, 8]), 8)).toEqual({ longest: 3, current: 2 });
    expect(streaks(new Set([1]), 5)).toEqual({ longest: 1, current: 0 });
    expect(streaks(new Set(), 5)).toEqual({ longest: 0, current: 0 });
  });
});

describe('computeAlmanac', () => {
  it('measures a life and surfaces echoes from the same week in earlier years', () => {
    const a = computeAlmanac(data, '2026-11-20')!;
    expect(a.age).toBe(36);
    expect(a.weeksTotal).toBe(4680);
    expect(a.weeksLived + a.weeksRemaining).toBe(4680);
    expect(a.echoes.map((e) => e.id)).toEqual(['a', 'b']);
    expect(a.inscribedWeeks).toBe(3);
  });
});

describe('buildLifeline', () => {
  it('assigns the dominant tone per week', () => {
    const m = buildLifeline({ ...data, inscriptions: [...data.inscriptions, ins('e', '2026-11-17', 'grief')] }, '2026-11-20')!;
    expect(m.tones.get(m.now)).toBe('joy');
    expect(m.inscriptionsByWeek.get(m.now)).toHaveLength(3);
  });
});

describe('searchInscriptions', () => {
  it('matches all terms case-insensitively', () => {
    const list = [ins('1', '2020-01-01', 'joy', 'Lisbon with Mum'), ins('2', '2020-01-01', 'joy', 'Lisbon alone')];
    expect(searchInscriptions(list, 'lisbon mum').map((i) => i.id)).toEqual(['1']);
    expect(searchInscriptions(list, '  ')).toHaveLength(2);
  });
});

describe('capsules', () => {
  const base = { title: 'Hi', body: 'Future', sealedOn: '2026-01-01', opensOn: '2027-01-01' };

  it('moves from sealed to ready to opened', async () => {
    const c: Capsule = { ...base, id: 'c', fingerprint: await fingerprintOf(base), openedAt: null };
    expect(capsuleStatus(c, '2026-06-01')).toBe('sealed');
    expect(capsuleStatus(c, '2027-01-01')).toBe('ready');
    expect(capsuleStatus({ ...c, openedAt: '2027-01-02T00:00:00Z' }, '2027-01-02')).toBe('opened');
    expect(sealProgress(c, '2026-07-02')).toBeCloseTo(0.5, 1);
  });

  it('detects tampering via the fingerprint', async () => {
    const c: Capsule = { ...base, id: 'c', fingerprint: await fingerprintOf(base), openedAt: null };
    expect(await verifySeal(c)).toBe(true);
    expect(await verifySeal({ ...c, body: 'Edited' })).toBe(false);
  });
});
