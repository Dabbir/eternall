import { DEFAULT_SETTINGS, validateInscription, validateProfile, withCurrentIds } from './house';

const today = '2026-11-20';
const profile = { id: 'me' as const, name: 'Ada', birthDate: '1990-06-15', horizonYears: 90, hemisphere: 'north' as const, createdAt: '' };

describe('validateProfile', () => {
  it('accepts a sensible profile and trims the name', () => {
    expect(validateProfile({ name: '  Ada ', birthDate: '1990-06-15', horizonYears: 90 }, today)).toEqual({
      ok: true,
      value: { name: 'Ada', birthDate: '1990-06-15', horizonYears: 90 },
    });
  });
  it('rejects empty names, future births and impossible horizons', () => {
    const r = validateProfile({ name: ' ', birthDate: '2030-01-01', horizonYears: 300 }, today);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['birthDate', 'horizonYears', 'name']);
  });
  it('rejects a horizon that has already passed', () => {
    const r = validateProfile({ name: 'Old', birthDate: '1940-01-01', horizonYears: 80 }, today);
    expect(!r.ok && r.errors.horizonYears).toMatch(/behind you/);
  });
});

describe('validateInscription', () => {
  it('rejects future memories and unknown tones', () => {
    const r = validateInscription({ date: '2027-01-01', title: 'x', body: '', tone: 'meh' }, profile, today);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.date).toMatch(/AMAZEEN/);
      expect(r.errors.tone).toBeDefined();
    }
  });
  it('works without a profile', () => {
    expect(validateInscription({ date: '1980-01-01', title: 'Old photo', body: '', tone: 'calm' }, null, today).ok).toBe(true);
  });
  it('strips control characters', () => {
    const r = validateInscription({ date: today, title: 'Hi\u0007', body: 'a\u0000b', tone: 'joy' }, profile, today);
    expect(r.ok && r.value).toMatchObject({ title: 'Hi', body: 'ab' });
  });
});

describe('withCurrentIds', () => {
  it('reads settings saved under LEDGER as CASHEEN, without duplicates', () => {
    const s = withCurrentIds({ ...DEFAULT_SETTINGS, hidden: ['ledger', 'kindred'], dismissed: ['intro:ledger', 'intro:casheen', 'lens-hint'] });
    expect(s.hidden).toEqual(['casheen', 'kindred']);
    expect(s.dismissed).toEqual(['intro:casheen', 'lens-hint']);
  });
});
