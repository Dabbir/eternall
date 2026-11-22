import { readArchive, validateCapsule, validateChapter, validateInscription, validateProfile } from './validation';
import { EMPTY_DATA, type Chapter, type Profile } from './types';

const today = '2026-11-20';
const profile: Profile = { name: 'Ada', birthDate: '1990-06-15', horizonYears: 90, createdAt: '2026-01-01T00:00:00.000Z' };

describe('validateProfile', () => {
  it('accepts a sensible profile and trims the name', () => {
    const r = validateProfile({ name: '  Ada  ', birthDate: '1990-06-15', horizonYears: 90 }, today);
    expect(r).toEqual({ ok: true, value: { name: 'Ada', birthDate: '1990-06-15', horizonYears: 90 } });
  });

  it('rejects empty names, future births and impossible horizons', () => {
    const r = validateProfile({ name: '   ', birthDate: '2030-01-01', horizonYears: 300 }, today);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['birthDate', 'horizonYears', 'name']);
  });

  it('rejects a horizon that has already passed', () => {
    const r = validateProfile({ name: 'Old', birthDate: '1940-01-01', horizonYears: 80 }, today);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.horizonYears).toMatch(/behind you/);
  });
});

describe('validateInscription', () => {
  it('rejects future memories and unknown tones', () => {
    const r = validateInscription({ date: '2027-01-01', title: 'x', body: '', tone: 'meh' }, profile, today);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.date).toMatch(/capsule/);
      expect(r.errors.tone).toBeDefined();
    }
  });

  it('strips control characters', () => {
    const r = validateInscription({ date: today, title: 'Hi\u0007', body: 'a\u0000b', tone: 'joy' }, profile, today);
    expect(r.ok && r.value).toMatchObject({ title: 'Hi', body: 'ab' });
  });
});

describe('validateCapsule', () => {
  it('requires an opening date from tomorrow up to the horizon', () => {
    const base = { title: 'To me', body: 'Hello' };
    expect(validateCapsule({ ...base, opensOn: today }, profile, today).ok).toBe(false);
    expect(validateCapsule({ ...base, opensOn: '2026-11-21' }, profile, today).ok).toBe(true);
    expect(validateCapsule({ ...base, opensOn: '2080-06-15' }, profile, today).ok).toBe(false);
  });
});

describe('validateChapter', () => {
  const existing: Chapter = { id: 'a', title: 'Berlin', start: '2015-01-01', end: '2018-12-31', ink: 'tide', note: '' };

  it('detects overlaps with other chapters', () => {
    const r = validateChapter({ title: 'Paris', start: '2018-06-01', end: '2020-01-01', ink: 'moss', note: '' }, [existing], profile, today);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.start).toMatch(/Berlin/);
  });

  it('allows adjacent chapters', () => {
    const r = validateChapter({ title: 'Paris', start: '2019-01-01', end: null, ink: 'moss', note: '' }, [existing], profile, today);
    expect(r.ok).toBe(true);
  });

  it('refuses an ongoing chapter that starts in the future', () => {
    const r = validateChapter({ title: 'Later', start: '2030-01-01', end: null, ink: 'moss', note: '' }, [], profile, today);
    expect(r.ok).toBe(false);
  });
});

describe('readArchive', () => {
  it('accepts an empty archive and fills defaults', () => {
    expect(readArchive({ version: 1 })).toEqual(EMPTY_DATA);
  });

  it('rejects wrong versions, bad dates and duplicate ids', () => {
    expect(() => readArchive({ version: 2 })).toThrow(/version/);
    expect(() => readArchive({ version: 1, profile: { ...profile, birthDate: '1990-02-31' } })).toThrow(/birthDate/);
    const ins = { id: 'x', date: today, title: 't', body: '', tone: 'joy' };
    expect(() => readArchive({ version: 1, inscriptions: [ins, ins] })).toThrow(/duplicate/);
  });

  it('drops unknown fields', () => {
    const out = readArchive({ version: 1, evil: '<script>', settings: { theme: 'dark', lens: 'nope' } });
    expect(out).not.toHaveProperty('evil');
    expect(out.settings).toEqual({ theme: 'dark', lens: 'moments' });
  });
});
