import { chapterAt, validateChapter, type Chapter } from './chapters';

const today = '2026-11-20';
const profile = { id: 'me' as const, name: 'Ada', birthDate: '1990-06-15', horizonYears: 90, hemisphere: 'north' as const, createdAt: '' };
const berlin: Chapter = { id: 'a', title: 'Berlin', start: '2015-01-01', end: '2018-12-31', cloth: 2, note: '' };

describe('chapters', () => {
  it('detects overlaps', () => {
    const r = validateChapter({ title: 'Paris', start: '2018-06-01', end: '2020-01-01', cloth: 4, note: '' }, [berlin], profile, today);
    expect(!r.ok && r.errors.start).toMatch(/Berlin/);
  });
  it('allows adjacent chapters and ongoing ones', () => {
    expect(validateChapter({ title: 'Paris', start: '2019-01-01', end: null, cloth: 4, note: '' }, [berlin], profile, today).ok).toBe(true);
  });
  it('refuses an ongoing chapter that starts in the future', () => {
    expect(validateChapter({ title: 'Later', start: '2030-01-01', end: null, cloth: 1, note: '' }, [], profile, today).ok).toBe(false);
  });
  it('works without a profile', () => {
    expect(validateChapter({ title: 'School', start: '2001-09-01', end: '2006-06-30', cloth: 1, note: '' }, [], null, today).ok).toBe(true);
  });
  it('finds the chapter for a date, later starts winning', () => {
    expect(chapterAt([berlin], '2016-05-05', today)?.title).toBe('Berlin');
    expect(chapterAt([berlin], '2020-05-05', today)).toBeNull();
  });
});
