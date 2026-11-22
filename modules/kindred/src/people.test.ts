import { constellation, drawers, kindredStats, lastSeen, nextOccurrence, searchPeople, seenId, sinceLabel, upcomingDates, validatePerson, type Person, type Seen } from './people';

const today = '2026-11-23';
const p = (id: string, name: string, drawer: string, extra: Partial<Person> = {}): Person => ({ id, name, drawer, closeness: 'close', howWeMet: '', dates: [], createdAt: '', ...extra });
const ana = p('ana', 'Ana Sousa', 'Old friends', { closeness: 'inner' });
const dad = p('dad', 'Dad', 'Family', { dates: [{ label: 'Birthday', date: '1958-12-02', yearly: true }] });
const leo = p('leo', 'Leo', 'Family', { closeness: 'around' });
const seen = (personId: string, date: string): Seen => ({ id: seenId(personId, date), personId, date, note: '' });
const log = [seen('ana', '2026-11-20'), seen('ana', '2026-03-02'), seen('dad', '2025-12-25')];

describe('kindred', () => {
  it('knows when you last saw someone', () => {
    expect(lastSeen(log, 'ana')).toBe('2026-11-20');
    expect(lastSeen(log, 'leo')).toBeNull();
    expect(sinceLabel(3)).toBe('seen 3 days ago');
    expect(sinceLabel(null)).toBe('not seen yet');
    expect(sinceLabel(340)).toBe('seen 11 months ago');
  });

  it('rolls yearly dates round, Feb 29 included', () => {
    expect(nextOccurrence({ label: 'B', date: '1958-12-02', yearly: true }, today)).toBe('2026-12-02');
    expect(nextOccurrence({ label: 'B', date: '1990-03-01', yearly: true }, today)).toBe('2027-03-01');
    expect(nextOccurrence({ label: 'B', date: '2000-02-29', yearly: true }, today)).toBe('2027-02-28');
    expect(nextOccurrence({ label: 'B', date: '2000-02-29', yearly: true }, '2027-03-01')).toBe('2028-02-29');
    expect(nextOccurrence({ label: 'Trip', date: '2026-01-01', yearly: false }, today)).toBeNull();
  });

  it('lists upcoming dates with the age reached', () => {
    const up = upcomingDates([ana, dad], today);
    expect(up).toHaveLength(1);
    expect(up[0]).toMatchObject({ label: 'Birthday', date: '2026-12-02', days: 9, turns: 68 });
  });

  it('files cards in drawers, recently seen first', () => {
    const d = drawers([ana, dad, leo], log, today);
    expect(d.map((x) => x.label)).toEqual(['Recently seen', 'Family', 'Old friends']);
    expect(d[0]!.people.map((x) => x.id)).toEqual(['ana']);
    expect(d[1]!.people.map((x) => x.id)).toEqual(['dad', 'leo']);
  });

  it('places people in the sky: nearer when seen recently, at the edge when never', () => {
    const stars = constellation([ana, dad, leo], log, today);
    const dist = (id: string) => Math.hypot(stars.find((s) => s.id === id)!.x, stars.find((s) => s.id === id)!.y);
    expect(dist('ana')).toBeLessThan(dist('dad'));
    expect(dist('leo')).toBeCloseTo(0.96, 2);
    expect(stars.find((s) => s.id === 'ana')!.size).toBe(3);
  });

  it('finds people by name, prefix matches first', () => {
    expect(searchPeople([ana, dad, p('x', 'Diana', 'Work')], 'an').map((x) => x.id)).toEqual(['ana', 'x']);
    expect(searchPeople([ana], ' ')).toEqual([]);
  });

  it('validates a card in plain words', () => {
    const ok = validatePerson({ name: 'Dad', drawer: 'Family', closeness: 'inner', howWeMet: '', dates: [{ label: 'Birthday', date: '1958-12-02', yearly: true }, { label: '', date: '', yearly: true }] });
    expect(ok.ok && ok.value.dates).toHaveLength(1);
    const bad = validatePerson({ name: '', drawer: '', closeness: 'best', howWeMet: '', dates: [{ label: 'Birthday', date: '2026-02-31', yearly: true }] });
    expect(bad.ok ? null : bad.errors).toEqual({ name: 'A card needs a name.', closeness: 'Choose how close.', dates: 'Enter a valid date for “Birthday”.' });
  });

  it('counts people kept and seen this year', () => {
    expect(kindredStats([ana, dad, leo], log, today)).toEqual({ kept: 3, seenThisYear: 1 });
  });
});
