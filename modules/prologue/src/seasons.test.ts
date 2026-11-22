import { canClose, currentSeason, inRehearsal, daysRemaining, hopesOf, isOverdue, meteorologicalSeason, prologueStats, roman, validateHope, validateSeason, type Hope, type Season } from './seasons';

const winter: Season = { id: 'w', name: 'Winter 2026', theme: 'staying close', start: '2026-12-01', end: '2027-02-28', closedAt: null, epilogue: '' };
const autumn: Season = { id: 'a', name: 'Autumn 2026', theme: '', start: '2026-09-01', end: '2026-11-30', closedAt: null, epilogue: '' };
const hope = (id: string, act: number, state: Hope['state'] = 'wings'): Hope => ({ id, seasonId: 'a', title: id, state, reflection: '', ritualRef: null, peopleRefs: [], act });

describe('seasons', () => {
  it('finds meteorological seasons in both hemispheres', () => {
    expect(meteorologicalSeason('2026-11-23', 'north')).toEqual({ name: 'Autumn 2026', start: '2026-09-01', end: '2026-11-30' });
    expect(meteorologicalSeason('2027-01-10', 'north')).toEqual({ name: 'Winter 2026', start: '2026-12-01', end: '2027-02-28' });
    expect(meteorologicalSeason('2026-12-05', 'north').name).toBe('Winter 2026');
    expect(meteorologicalSeason('2028-02-10', 'north').end).toBe('2028-02-29');
    expect(meteorologicalSeason('2026-11-23', 'south').name).toBe('Spring 2026');
    expect(meteorologicalSeason('2026-07-01', 'south')).toEqual({ name: 'Winter 2026', start: '2026-06-01', end: '2026-08-31' });
  });

  it('puts the right season on stage, including one left open', () => {
    expect(currentSeason([autumn, winter], '2026-11-23')?.id).toBe('a');
    expect(currentSeason([autumn], '2026-12-10')?.id).toBe('a');
    expect(currentSeason([{ ...autumn, closedAt: '2026-11-30T00:00:00Z' }], '2026-12-10')).toBeNull();
    expect(isOverdue(autumn, '2026-12-10')).toBe(true);
  });

  it('puts a planned season on stage in rehearsal when nothing is running', () => {
    const closedAutumn = { ...autumn, closedAt: '2026-11-20T00:00:00Z' };
    expect(currentSeason([closedAutumn, winter], '2026-11-23')?.id).toBe('w');
    expect(inRehearsal(winter, '2026-11-23')).toBe(true);
    expect(inRehearsal(winter, '2026-12-01')).toBe(false);
  });

  it('offers closing in the last 14 days', () => {
    expect(canClose(autumn, '2026-11-15')).toBe(false);
    expect(canClose(autumn, '2026-11-16')).toBe(true);
    expect(daysRemaining(autumn, '2026-11-23')).toBe(7);
  });

  it('refuses overlapping or odd seasons', () => {
    const ok = validateSeason({ name: 'The move', theme: '', start: '2026-12-01', end: '2027-02-10' }, [autumn]);
    expect(ok.ok).toBe(true);
    const clash = validateSeason({ name: 'X', theme: '', start: '2026-11-20', end: '2027-01-10' }, [autumn]);
    expect(clash.ok ? null : clash.errors.start).toMatch(/overlaps Autumn 2026/);
    const short = validateSeason({ name: '', theme: '', start: '2026-12-01', end: '2026-12-03' }, []);
    expect(short.ok ? null : short.errors).toEqual({ name: 'A season needs a name.', end: 'A season lasts at least a week.' });
  });

  it('keeps a season to seven acts, gently', () => {
    expect(validateHope({ title: 'Finish the glaze series', state: 'wings', reflection: '' }, 3, true).ok).toBe(true);
    const full = validateHope({ title: 'One more', state: 'wings', reflection: '' }, 7, true);
    expect(full.ok ? null : full.errors.title).toMatch(/Seven is the most/);
    expect(validateHope({ title: 'Edit', state: 'bow', reflection: '' }, 7, false).ok).toBe(true);
    expect(validateHope({ title: ' ', state: 'nope', reflection: '' }, 0, true).ok).toBe(false);
  });

  it('orders acts and counts endings', () => {
    expect(hopesOf([hope('b', 2), hope('a', 1)], 'a').map((h) => h.id)).toEqual(['a', 'b']);
    expect(prologueStats([{ ...autumn, closedAt: 'x' }, winter], [hope('a', 1, 'bow'), hope('b', 2, 'letGo')])).toEqual({ closed: 1, bows: 1, letGo: 1 });
    expect(roman(3)).toBe('III');
  });
});
