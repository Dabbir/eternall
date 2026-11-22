import { barStart, barSummary, beatOf, cadenceLabel, dueToday, expectedIn, isKeptIn, keySet, markId, nextPitch, ritualStats, scoreNotes, validateRitual, weekdayOf, yearLine, type Mark, type Ritual } from './rituals';

const today = '2026-11-25'; // a Wednesday
const run: Ritual = { id: 'run', name: 'Morning run', why: '', cadence: { kind: 'daily' }, instrument: 'piano', pitch: 0, startedOn: '2026-01-01', pausedOn: null };
const mum: Ritual = { ...run, id: 'mum', name: 'Call Mum', cadence: { kind: 'weekly', weekday: 5 }, pitch: 1 };
const read: Ritual = { ...run, id: 'read', name: 'Read', cadence: { kind: 'times', n: 3 }, pitch: 2 };
const mark = (r: string, date: string): Mark => ({ id: markId(r, date), ritualId: r, date });

describe('the score', () => {
  it('starts bars on Monday', () => {
    expect(weekdayOf('2026-11-23')).toBe(0);
    expect(weekdayOf(today)).toBe(2);
    expect(barStart(today)).toBe('2026-11-23');
  });

  it('reads beats as notes, neutral rests and free days', () => {
    const kept = keySet([mark('run', '2026-11-23')]);
    expect(beatOf(run, '2026-11-23', kept, today)).toBe('kept');
    expect(beatOf(run, '2026-11-24', kept, today)).toBe('rest');
    expect(beatOf(run, today, kept, today)).toBe('open');
    expect(beatOf(run, '2026-11-26', kept, today)).toBe('future');
    expect(beatOf(mum, '2026-11-24', kept, today)).toBe('free');
    expect(beatOf(read, '2026-11-24', kept, today)).toBe('open');
    expect(beatOf({ ...run, startedOn: '2026-11-24' }, '2026-11-22', kept, today)).toBe('off');
    expect(beatOf({ ...run, pausedOn: '2026-11-24' }, '2026-11-24', kept, today)).toBe('off');
  });

  it('asks only for days that have arrived, and judges "n a week" when the bar ends', () => {
    expect(expectedIn(run, '2026-11-23', today)).toBe(3);
    expect(expectedIn(mum, '2026-11-23', today)).toBe(0);
    expect(expectedIn(mum, '2026-11-16', today)).toBe(1);
    expect(expectedIn(read, '2026-11-16', today)).toBe(3);
    const kept = keySet(['2026-11-16', '2026-11-18', '2026-11-20'].map((d) => mark('read', d)));
    expect(isKeptIn(read, '2026-11-16', kept, today)).toBe(true);
  });

  it('summarises a bar as "k of n rituals kept"', () => {
    const marks = [mark('run', '2026-11-16'), mark('mum', '2026-11-21'), ...['2026-11-16', '2026-11-17', '2026-11-18'].map((d) => mark('read', d))];
    expect(barSummary([run, mum, read], marks, '2026-11-16', today)).toEqual({ active: 3, kept: 2, notes: 5 });
    // Mid-week, Saturday's call isn't counted yet; neither is an unmarked "3 a week".
    expect(barSummary([run, mum, read], [mark('run', '2026-11-23')], '2026-11-23', today)).toEqual({ active: 1, kept: 0, notes: 1 });
  });

  it('lists what is due today', () => {
    expect(dueToday([run, mum, read], today).map((r) => r.id)).toEqual(['run', 'read']);
    expect(dueToday([run, mum], '2026-11-28').map((r) => r.id)).toEqual(['run', 'mum']);
  });

  it('turns marks into notes for playback', () => {
    const notes = scoreNotes([run, mum], [mark('mum', '2026-11-28'), mark('run', '2026-11-23'), mark('run', '2026-11-30')], '2026-11-23');
    expect(notes).toEqual([
      { bar: 0, beat: 0, pitch: 0, instrument: 'piano', ritualId: 'run' },
      { bar: 0, beat: 5, pitch: 1, instrument: 'piano', ritualId: 'mum' },
    ]);
  });

  it('assigns the lowest free pentatonic pitch', () => {
    expect(nextPitch([{ pitch: 0 }, { pitch: 2 }])).toBe(1);
    expect(nextPitch([])).toBe(0);
  });

  it('reduces a year to one line of 52 bars', () => {
    const line = yearLine(run, [mark('run', '2026-11-23'), mark('run', '2026-11-24'), mark('run', '2026-11-16')], today);
    expect(line).toHaveLength(52);
    expect(line.at(-1)).toBe(2);
    expect(line.at(-2)).toBe(1);
  });

  it('finds the most constant ritual', () => {
    const marks = [mark('mum', '2026-11-14'), mark('mum', '2026-11-21')];
    const s = ritualStats([{ ...mum, startedOn: '2026-11-09' }, { ...run, startedOn: '2026-11-09' }], marks, today);
    expect(s.mostConstant?.ritual.id).toBe('mum');
    expect(s.totalMarks).toBe(2);
    expect(s.keptThisYear).toBe(2);
  });

  it('validates a new ritual in plain words', () => {
    const base = { name: 'Read 20 pages', why: '', cadence: { kind: 'daily' as const }, instrument: 'marimba', startedOn: today };
    expect(validateRitual(base, today).ok).toBe(true);
    const bad = validateRitual({ ...base, name: ' ', cadence: { kind: 'times', n: 9 }, instrument: 'kazoo' }, today);
    expect(bad.ok ? {} : bad.errors).toEqual({ name: 'A ritual needs a few words.', cadence: 'Choose between 1 and 6 times a week.', instrument: 'Choose a sound.' });
    expect(cadenceLabel({ kind: 'weekly', weekday: 5 })).toBe('Saturdays');
  });
});
