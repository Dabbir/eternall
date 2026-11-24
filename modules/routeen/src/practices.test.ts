import { barStart, barSummary, cadenceLabel, clothLine, dueToday, dyeOf, expectedIn, isKeptIn, keySet, markId, nextThread, patternOf, practiceStats, stitchOf, threadOf, validatePractice, weave, weekdayOf, type Mark, type Practice } from './practices';

const today = '2026-11-25'; // a Wednesday
const run: Practice = { id: 'run', name: 'Morning run', why: '', cadence: { kind: 'daily' }, thread: 0, startedOn: '2026-01-01', pausedOn: null };
const mum: Practice = { ...run, id: 'mum', name: 'Call Mum', cadence: { kind: 'weekly', weekday: 5 }, thread: 1 };
const read: Practice = { ...run, id: 'read', name: 'Read', cadence: { kind: 'times', n: 3 }, thread: 2 };
const mark = (r: string, date: string): Mark => ({ id: markId(r, date), ritualId: r, date });

describe('the loom', () => {
  it('starts bars on Monday', () => {
    expect(weekdayOf('2026-11-23')).toBe(0);
    expect(weekdayOf(today)).toBe(2);
    expect(barStart(today)).toBe('2026-11-23');
  });

  it('reads days as woven stitches, bare warp and plain weave', () => {
    const kept = keySet([mark('run', '2026-11-23')]);
    expect(stitchOf(run, '2026-11-23', kept, today)).toBe('woven');
    expect(stitchOf(run, '2026-11-24', kept, today)).toBe('warp');
    expect(stitchOf(run, today, kept, today)).toBe('open');
    expect(stitchOf(run, '2026-11-26', kept, today)).toBe('future');
    expect(stitchOf(mum, '2026-11-24', kept, today)).toBe('plain');
    expect(stitchOf(read, '2026-11-24', kept, today)).toBe('open');
    expect(stitchOf({ ...run, startedOn: '2026-11-24' }, '2026-11-22', kept, today)).toBe('off');
    expect(stitchOf({ ...run, pausedOn: '2026-11-24' }, '2026-11-24', kept, today)).toBe('off');
  });

  it('weaves a week as one strip, a row of seven stitches per practice', () => {
    const strip = weave([run, mum], [mark('run', '2026-11-23'), mark('mum', '2026-11-21')], '2026-11-23', today);
    expect(strip.map((r) => r.practice.id)).toEqual(['run', 'mum']);
    expect(strip[0]!.stitches).toEqual(['woven', 'warp', 'open', 'future', 'future', 'future', 'future']);
    expect(strip[1]!.stitches).toEqual(['plain', 'plain', 'plain', 'future', 'future', 'future', 'future']);
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

  it('gives each practice its own thread, reading the old REFRAIN pitch for practices without one', () => {
    expect(nextThread([{ thread: 0 }, { thread: 2 }])).toBe(1);
    expect(nextThread([])).toBe(0);
    expect(threadOf({ pitch: 3 })).toBe(3);
    expect(threadOf({ thread: 1, pitch: 3 })).toBe(1);
    expect(threadOf({ pitch: 8 })).toBe(2);
    expect([dyeOf({ thread: 0 }), patternOf({ thread: 0 })]).toEqual(['indigo', 'plain']);
    expect([dyeOf({ thread: 1 }), patternOf({ thread: 1 })]).toEqual(['madder', 'twill']);
  });

  it('weaves a year as one cloth line of 52 weeks', () => {
    const line = clothLine(run, [mark('run', '2026-11-23'), mark('run', '2026-11-24'), mark('run', '2026-11-16')], today);
    expect(line).toHaveLength(52);
    expect(line.at(-1)).toBe(2);
    expect(line.at(-2)).toBe(1);
  });

  it('finds the steadiest practice', () => {
    const marks = [mark('mum', '2026-11-14'), mark('mum', '2026-11-21')];
    const s = practiceStats([{ ...mum, startedOn: '2026-11-09' }, { ...run, startedOn: '2026-11-09' }], marks, today);
    expect(s.mostConstant?.practice.id).toBe('mum');
    expect(s.totalMarks).toBe(2);
    expect(s.keptThisYear).toBe(2);
  });

  it('validates a new practice in plain words', () => {
    const base = { name: 'Read 20 pages', why: '', cadence: { kind: 'daily' as const }, startedOn: today };
    expect(validatePractice(base, today).ok).toBe(true);
    const bad = validatePractice({ ...base, name: ' ', cadence: { kind: 'times', n: 9 } }, today);
    expect(bad.ok ? {} : bad.errors).toEqual({ name: 'A practice needs a few words.', cadence: 'Choose between 1 and 6 times a week.' });
    expect(cadenceLabel({ kind: 'weekly', weekday: 5 })).toBe('Saturdays');
  });
});
