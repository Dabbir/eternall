# ROUTEEN · Langit Hari Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ROUTEEN's loom with Langit Hari, the day's sky. Practices are marked in one tap at a tier (Minimum / Target / More), the whole routine has life modes (Normal / Low energy / Day off), the front page shows "for now", and personal looks run on the existing engine.

**Architecture:**
- Pure domain modules in `modules/routeen/src/`: `sky.ts` (routine day, part of day, settings), `practices.ts` (model), `modes.ts`, `days.ts` (day states, weeks, year, stats) and `front.ts` (the front page model). Each is unit-tested first.
- The React app in `modules/routeen/src/app/` only renders those models. Every UI string comes from `copy.ts`.
- Records keep their `refrain/*` paths. Two new collections: `refrain/mode` and `refrain/day-mode`. A settings record: `refrain/settings`.

**Tech Stack:** TypeScript, React 19, Vitest + Testing Library, `@eternall/{core,kit,ui,vault,stage}`, three.js (lazy 3D chunk only).

**Spec:** `docs/superpowers/specs/2026-11-24-routeen-langit-hari-design.md` (read it with this plan; section numbers below refer to it).

## Global Constraints

- All data through the vault (`useCollection`, `ctx.data.collection`). No `localStorage`, IndexedDB or `fetch`.
- ROUTEEN imports no other app. No new runtime dependency. three.js only inside the lazy `skyScene.ts` chunk via `@eternall/stage`.
- Paths never move:
  - existing: `refrain/ritual`, `refrain/mark`, `refrain/look`;
  - new: `refrain/mode`, `refrain/day-mode`, `refrain/settings`.
- Vault ids allow no colons. Mark id stays `${ritualId}_${date}`.
- An old mark without `tier` reads as `'target'`. Old practice fields `thread`, `pitch` and `instrument` are ignored and never written.
- Never: streak counters, scores, flames, percentages, red for a missed day, or the word "missed" in UI copy.
- Every exported domain function has a test.
- WCAG 2.1 AA:
  - chips are `<button>`s with `aria-pressed`;
  - the tier choice is reachable by keyboard;
  - shapes carry meaning (◐ Minimum, ☀︎ Target, ✺ More; ☁︎ Low energy; ✦ Day off), colour only supports them.
- Motion:
  - "Lit" ≤ 700 ms and never blocks the next tap;
  - mode crossfade ≤ 400 ms;
  - nothing loops;
  - all motion skipped under `prefers-reduced-motion`.
- Small caps via `font-variant-caps`, never `text-transform: uppercase`. Fonts: Young Serif, Work Sans, Literata only (already self-hosted).
- Every UI string comes from `modules/routeen/src/copy.ts`. No string literals in JSX except punctuation and glyphs.
- Day boundary: `DEFAULT_DAY_ENDS_AT = 3`, range 0–5.

  | Part of day | Hours |
  |---|---|
  | morning | dayEndsAt–11:00 |
  | midday | 11:00–17:00 |
  | evening | 17:00 until the day ends |

- Budgets: the imprint chunk `RouteenApp-*.js` ≤ 90 KB gzip, the 3D chunk ≤ 220 KB gzip (`scripts/check-budgets.mjs`).
- Commits: one per task on branch `platform`, never pushed. Imperative subject ≤ 72 chars, scoped `routeen:`, ending with the `Co-Authored-By` line.

## Review Focus

1. **Marking just after midnight** (00:30 with `dayEndsAt` 3) must land on the previous date, in the app *and* on Home's count. Tests: Task 1 (`routineDay`) and Task 5 (`home()` with a fake clock).
2. **A vault from the loom era** (marks without `tier`, practices with `thread`/`pitch`/`instrument`, look `preset: 'linen'`, accent `'indigo'`) must open without errors and show every old mark as Target. Tests: Task 2, Task 6, Task 7 integration.
3. **Switching mode twice on the same day**, or setting a past day's mode equal to the running mode, must leave exactly one record (or none) for that date. Tests: Task 2 (`modeRecord`, `dayModeChange`).
4. **"N times a week" practices on the evening recap**: "All as planned" must never mark them, and they leave the due list once the week's n is met. Tests: Task 4.
5. **A paused practice, or one starting in the future**, must not appear in any front-page list or in the Home count, and its days read `plain`. Tests: Task 3 and Task 4.

---

### Task 1: Routine day, part of day and settings (`sky.ts`)

**Files:**
- Create: `modules/routeen/src/sky.ts`
- Test: `modules/routeen/src/sky.test.ts`

**Interfaces:**
- Produces:
  - `type Part = 'morning' | 'midday' | 'evening'`
  - `const DEFAULT_DAY_ENDS_AT = 3`
  - `routineDay(now: Date, dayEndsAt: number): ISODate`
  - `partOfDay(now: Date, dayEndsAt: number): Part`
  - `sunPosition(now: Date, dayEndsAt: number): number` (0..1 across the routine day)
  - `const SETTINGS_PATH = 'refrain/settings'`
  - `interface RouteenSettings { id: 'settings'; dayEndsAt: number; backToNormalDismissedOn: ISODate | null }`
  - `readSettings(raw: unknown): RouteenSettings`

- [ ] **Step 1: Write the failing tests**

```ts
import { DEFAULT_DAY_ENDS_AT, partOfDay, readSettings, routineDay, sunPosition } from './sky';
const at = (iso: string) => new Date(iso); // local time, e.g. '2026-11-25T00:30:00'

describe('the routine day', () => {
  it('ends at 03:00 by default, so 00:30 still belongs to yesterday', () => {
    expect(routineDay(at('2026-11-25T00:30:00'), 3)).toBe('2026-11-24');
    expect(routineDay(at('2026-11-25T03:00:00'), 3)).toBe('2026-11-25');
    expect(routineDay(at('2026-11-25T00:30:00'), 0)).toBe('2026-11-25');
  });
  it('splits the day into morning, midday and evening', () => {
    expect(partOfDay(at('2026-11-25T03:00:00'), 3)).toBe('morning');
    expect(partOfDay(at('2026-11-25T10:59:00'), 3)).toBe('morning');
    expect(partOfDay(at('2026-11-25T11:00:00'), 3)).toBe('midday');
    expect(partOfDay(at('2026-11-25T17:00:00'), 3)).toBe('evening');
    expect(partOfDay(at('2026-11-26T01:00:00'), 3)).toBe('evening');
  });
  it('places the sun from 0 at the start of the day to 1 at its end', () => {
    expect(sunPosition(at('2026-11-25T03:00:00'), 3)).toBe(0);
    expect(sunPosition(at('2026-11-25T15:00:00'), 3)).toBeCloseTo(0.5);
    expect(sunPosition(at('2026-11-26T02:59:00'), 3)).toBeGreaterThan(0.99);
  });
});

describe('settings', () => {
  it('defaults and clamps', () => {
    expect(readSettings(undefined)).toEqual({ id: 'settings', dayEndsAt: DEFAULT_DAY_ENDS_AT, backToNormalDismissedOn: null });
    expect(readSettings({ dayEndsAt: 9 }).dayEndsAt).toBe(5);
    expect(readSettings({ dayEndsAt: -1 }).dayEndsAt).toBe(0);
    expect(readSettings({ dayEndsAt: 2.5 }).dayEndsAt).toBe(DEFAULT_DAY_ENDS_AT);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run modules/routeen/src/sky.test.ts`
Expected: FAIL, cannot resolve `./sky`.

- [ ] **Step 3: Implement `modules/routeen/src/sky.ts`**

- `routineDay` = `todayISO(new Date(now.getTime() - dayEndsAt * 3_600_000))`, with `todayISO` from `@eternall/core`.
- `partOfDay` uses `now.getHours()`: hours below `dayEndsAt` are evening; then `< 11` morning, `< 17` midday, otherwise evening.
- `readSettings` accepts only an integer 0–5 for `dayEndsAt`. Out of range is clamped; non-integer falls back to the default. `backToNormalDismissedOn` must pass `isValidISO`, else `null`.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run modules/routeen/src/sky.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add modules/routeen/src/sky.ts modules/routeen/src/sky.test.ts
git commit -m "routeen: routine day that ends at 03:00, parts of day"
```

---

### Task 2: Practice model with tiers, and life modes (`practices.ts`, `modes.ts`)

**Files:**
- Modify: `modules/routeen/src/practices.ts`. Remove `DYES`, `PATTERNS`, `Dye`, `Pattern`, `threadOf`, `dyeOf`, `patternOf`, `nextThread`, `Stitch`, `stitchOf`, `weave`, `clothLine`; their replacements are in Task 3. Keep `PRACTICE_PATH`, `MARK_PATH`, `LIMITS`, `Cadence`, `WEEKDAYS`, `markId`, `weekdayOf`, `barStart`, `barDays`, `isActiveOn`, `cadenceLabel`.
- Create: `modules/routeen/src/modes.ts`
- Test: `modules/routeen/src/practices.test.ts` (rewrite), `modules/routeen/src/modes.test.ts`

**Interfaces:**
- Produces (`practices.ts`):
  - `type TimeOfDay = 'morning' | 'midday' | 'evening' | 'anytime'`
  - `interface Measure { unit: string; target: number; minimum: number }`
  - `interface Practice { id; name; why; cadence: Cadence; timeOfDay?: TimeOfDay; measure?: Measure; startedOn: ISODate; pausedOn: ISODate | null }`
  - `type Tier = 'minimum' | 'target' | 'more'`
  - `interface Mark { id; ritualId; date: ISODate; tier?: Tier }`
  - `tierOf(m: Pick<Mark, 'tier'>): Tier`
  - `timeOf(p: Pick<Practice, 'timeOfDay'>): TimeOfDay`
  - `LIMITS` gains `unit: 20`
  - `interface PracticeInput { name; why; cadence; startedOn; timeOfDay: TimeOfDay; measure: Measure | null }`
  - `validatePractice(input: PracticeInput, today: ISODate): Validation<Omit<Practice, 'id' | 'pausedOn'>, keyof PracticeInput>`
- Produces (`modes.ts`):
  - `type Mode = 'normal' | 'low' | 'off'`
  - `const MODE_PATH = 'refrain/mode'`
  - `const DAY_MODE_PATH = 'refrain/day-mode'`
  - `interface ModeRecord { id: ISODate; mode: Mode; from: ISODate }`
  - `interface DayModeRecord { id: ISODate; date: ISODate; mode: Mode }`
  - `runningMode(date: ISODate, modes: readonly ModeRecord[]): Mode`
  - `modeOn(date: ISODate, modes: readonly ModeRecord[], dayModes: readonly DayModeRecord[]): Mode`
  - `type ModeOf = (date: ISODate) => Mode`
  - `modeOfFn(modes, dayModes): ModeOf`
  - `modeRecord(today: ISODate, mode: Mode): ModeRecord` (id = `today`, so a second change the same day overwrites)
  - `dayModeChange(date: ISODate, mode: Mode, modes: readonly ModeRecord[]): { put: DayModeRecord } | { remove: ISODate }`
  - `offerBackToNormal(today: ISODate, modes: readonly ModeRecord[], dismissedOn: ISODate | null): boolean`

- [ ] **Step 1: Write the failing tests**

In `practices.test.ts`, replace the loom tests. Keep the existing `weekdayOf`/`barStart`, `cadenceLabel` and `validatePractice` cases, and add:

```ts
it('reads a mark without a tier as Target, so the loom era keeps every day', () => {
  expect(tierOf({})).toBe('target');
  expect(tierOf({ tier: 'minimum' })).toBe('minimum');
});
it('treats a practice without a time of day as any time', () => {
  expect(timeOf({})).toBe('anytime');
});
it('validates an optional measure', () => {
  const base = { name: 'Run', why: '', cadence: { kind: 'daily' } as const, startedOn: today, timeOfDay: 'morning' as const };
  expect(validatePractice({ ...base, measure: { unit: 'menit', target: 30, minimum: 10 } }, today).ok).toBe(true);
  expect(validatePractice({ ...base, measure: { unit: 'menit', target: 10, minimum: 30 } }, today)).toMatchObject({ ok: false, errors: { measure: expect.any(String) } });
  expect(validatePractice({ ...base, measure: { unit: 'x'.repeat(21), target: 30, minimum: 10 } }, today).ok).toBe(false);
  expect(validatePractice({ ...base, measure: { unit: 'menit', target: 0, minimum: 0 } }, today).ok).toBe(false);
  const ok = validatePractice({ ...base, measure: null }, today);
  expect(ok.ok && 'measure' in ok.value).toBe(false);
});
it('never writes the old thread fields', () => {
  const v = validatePractice({ name: 'Run', why: '', cadence: { kind: 'daily' }, startedOn: today, timeOfDay: 'anytime', measure: null }, today);
  expect(v.ok && Object.keys(v.value)).not.toContain('thread');
});
```

Check the `Validation` shape used by `finish` in `@eternall/core` and match `ok` / `value` / `errors` to it.

`modes.test.ts`:

```ts
import { dayModeChange, modeOn, modeRecord, offerBackToNormal, runningMode, type ModeRecord } from './modes';
const r = (from: string, mode: ModeRecord['mode']): ModeRecord => ({ id: from, from, mode });

it('is Normal with no records, then follows the latest change on or before the day', () => {
  const modes = [r('2026-11-20', 'low'), r('2026-11-23', 'off')];
  expect(runningMode('2026-11-19', [])).toBe('normal');
  expect(runningMode('2026-11-19', modes)).toBe('normal');
  expect(runningMode('2026-11-21', modes)).toBe('low');
  expect(runningMode('2026-11-25', modes)).toBe('off');
});
it('lets one past day carry its own mode without changing the running one', () => {
  const modes = [r('2026-11-01', 'normal')];
  const day = [{ id: '2026-11-24', date: '2026-11-24', mode: 'off' as const }];
  expect(modeOn('2026-11-24', modes, day)).toBe('off');
  expect(modeOn('2026-11-25', modes, day)).toBe('normal');
});
it('keys a change by its day, so two changes on one day leave one record', () => {
  expect(modeRecord('2026-11-25', 'low')).toEqual({ id: '2026-11-25', from: '2026-11-25', mode: 'low' });
});
it('drops a day override that equals the running mode', () => {
  const modes = [r('2026-11-01', 'low')];
  expect(dayModeChange('2026-11-24', 'low', modes)).toEqual({ remove: '2026-11-24' });
  expect(dayModeChange('2026-11-24', 'off', modes)).toEqual({ put: { id: '2026-11-24', date: '2026-11-24', mode: 'off' } });
});
it('offers Back to Normal after three days away, once a day', () => {
  const modes = [r('2026-11-22', 'low')];
  expect(offerBackToNormal('2026-11-24', modes, null)).toBe(false);
  expect(offerBackToNormal('2026-11-25', modes, null)).toBe(true);
  expect(offerBackToNormal('2026-11-25', modes, '2026-11-25')).toBe(false);
  expect(offerBackToNormal('2026-11-25', [r('2026-11-01', 'normal')], null)).toBe(false);
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run modules/routeen/src/practices.test.ts modules/routeen/src/modes.test.ts`
Expected: FAIL (`tierOf`, `./modes` missing).

- [ ] **Step 3: Implement**

- `validatePractice`:
  - adds `timeOfDay` to the value;
  - adds `measure` only when not null;
  - checks `unit` with `cleanText`, 1–20 characters;
  - requires finite `target` and `minimum` with `0 < minimum ≤ target`.

  Errors (copy): `'Keep the unit under 20 characters.'`, `'The minimum must be above 0 and no more than the target.'`
- `offerBackToNormal`: true when the running mode is not `normal` and has been since at least 3 days before `today` (`diffDays(from, today) >= 3`), and `dismissedOn !== today`.
- Remove the deleted exports. `index.ts` and the app will not compile until Tasks 3–8. Run only the domain tests until then; Task 5 restores `index.ts`, Task 7 restores the app.

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run modules/routeen/src/practices.test.ts modules/routeen/src/modes.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add modules/routeen/src/practices.ts modules/routeen/src/practices.test.ts modules/routeen/src/modes.ts modules/routeen/src/modes.test.ts
git commit -m "routeen: tiers, time of day, measures and life modes"
```

---

### Task 3: Day states, weeks, the year and stats (`days.ts`)

**Files:**
- Create: `modules/routeen/src/days.ts`
- Test: `modules/routeen/src/days.test.ts`

**Interfaces:**
- Consumes: Task 2 (`Practice`, `Mark`, `Tier`, `tierOf`, `markId`, `isActiveOn`, `weekdayOf`, `barStart`, `barDays`, `ModeOf`).
- Produces:
  - `type DayState = 'lit-minimum' | 'lit-target' | 'lit-more' | 'unlit' | 'open' | 'rest' | 'plain' | 'future'`
  - `type MarkIndex = ReadonlyMap<string, Mark>`
  - `indexMarks(marks: readonly Mark[]): MarkIndex`
  - `isScheduledOn(p: Practice, date: ISODate): boolean` (active, and daily or weekly on its weekday; `times` → false)
  - `dayState(p: Practice, date: ISODate, idx: MarkIndex, modeOf: ModeOf, today: ISODate): DayState`
  - `weekTarget(p: Practice, start: ISODate, today: ISODate, modeOf: ModeOf): number`
  - `marksInWeek(p: Practice, start: ISODate, idx: MarkIndex): number`
  - `isKeptInWeek(p: Practice, start: ISODate, idx: MarkIndex, today: ISODate, modeOf: ModeOf): boolean`
  - `weekSummary(ps: readonly Practice[], idx: MarkIndex, start: ISODate, today: ISODate, modeOf: ModeOf): { kept: number; active: number }`
  - `interface DaySky { date: ISODate; light: Tier | null; mode: Mode; expected: boolean; future: boolean }`
  - `daySky(ps, idx, date, today, modeOf): DaySky`
  - `weekSky(ps, idx, start, today, modeOf): DaySky[]` (7)
  - `yearSky(ps, idx, today, modeOf): DaySky[][]` (52 rows × 7, the last row is this week)
  - `litDays(marks: readonly Mark[], year: string): number`
  - `steadiest(ps, idx, today, modeOf): { practice: Practice; weeks: number } | null`

- [ ] **Step 1: Write the failing tests**

```ts
const today = '2026-11-25'; // Wednesday; the week starts 2026-11-23
const run: Practice = { id: 'run', name: 'Run', why: '', cadence: { kind: 'daily' }, startedOn: '2026-01-01', pausedOn: null };
const mum: Practice = { ...run, id: 'mum', cadence: { kind: 'weekly', weekday: 5 } };
const read: Practice = { ...run, id: 'read', cadence: { kind: 'times', n: 3 } };
const mark = (r: string, date: string, tier?: Tier): Mark => ({ id: markId(r, date), ritualId: r, date, ...(tier ? { tier } : {}) });
const normal: ModeOf = () => 'normal';

it('reads each day of a practice', () => {
  const idx = indexMarks([mark('run', '2026-11-23', 'minimum'), mark('run', '2026-11-22')]);
  expect(dayState(run, '2026-11-23', idx, normal, today)).toBe('lit-minimum');
  expect(dayState(run, '2026-11-22', idx, normal, today)).toBe('lit-target');
  expect(dayState(run, '2026-11-24', idx, normal, today)).toBe('unlit');
  expect(dayState(run, today, idx, normal, today)).toBe('open');
  expect(dayState(run, '2026-11-26', idx, normal, today)).toBe('future');
  expect(dayState(mum, '2026-11-24', idx, normal, today)).toBe('plain');
  expect(dayState(read, '2026-11-24', idx, normal, today)).toBe('plain');
  expect(dayState({ ...run, pausedOn: '2026-11-24' }, '2026-11-24', idx, normal, today)).toBe('plain');
  expect(dayState(run, '2026-11-24', idx, (d) => (d === '2026-11-24' ? 'off' : 'normal'), today)).toBe('rest');
});
it('counts a mark at any tier as kept, and subtracts Day-off days from n a week', () => {
  const idx = indexMarks([mark('read', '2026-11-16', 'minimum'), mark('read', '2026-11-17')]);
  const lastWeek = '2026-11-16';
  expect(isKeptInWeek(read, lastWeek, idx, today, normal)).toBe(false); // 2 of 3
  const oneOff: ModeOf = (d) => (d === '2026-11-20' ? 'off' : 'normal');
  expect(weekTarget(read, lastWeek, today, oneOff)).toBe(2);
  expect(isKeptInWeek(read, lastWeek, idx, today, oneOff)).toBe(true);
});
it('summarises a day of the sky by its brightest tier and its mode', () => {
  const idx = indexMarks([mark('run', '2026-11-23', 'minimum'), mark('read', '2026-11-23', 'more')]);
  expect(daySky([run, read], idx, '2026-11-23', today, normal)).toEqual({ date: '2026-11-23', light: 'more', mode: 'normal', expected: true, future: false });
  expect(weekSky([run], idx, '2026-11-23', today, normal)).toHaveLength(7);
  const year = yearSky([run], idx, today, normal);
  expect(year).toHaveLength(52);
  expect(year[51]![0]!.date).toBe('2026-11-23');
});
it('counts lit days, not marks, and finds the steadiest practice by kept weeks', () => {
  const marks = [mark('run', '2026-11-23'), mark('read', '2026-11-23'), mark('run', '2026-11-24')];
  expect(litDays(marks, '2026')).toBe(2);
  expect(steadiest([run], indexMarks([]), today, normal)).toBeNull();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run modules/routeen/src/days.test.ts`
Expected: FAIL, `./days` missing.

- [ ] **Step 3: Implement `days.ts`**

- **`dayState` order:**
  1. mark → `lit-<tier>`;
  2. not active → `plain`;
  3. after today → `future`;
  4. `modeOf(date) === 'off'` → `rest`;
  5. not `isScheduledOn` → `plain`;
  6. today → `open`;
  7. otherwise `unlit`.

  Low energy changes nothing here: any tier counts as kept.
- **`weekTarget`:**
  - daily: active, non-off days ≤ today;
  - weekly: 1 if its weekday is ≤ today, active and not off, else 0;
  - times: `max(0, n − offDaysInWeek)` once the week has ended (`today >= start + 6`), else 0, as the loom did.
- **`isKeptInWeek`:** false when the practice was not active on any day ≤ today. Otherwise `target === 0 ? marks > 0 : marks >= target`.
- **`weekSummary`** counts only practices with `weekTarget > 0` or a mark that week (same fairness as the old `barSummary`).
- **`steadiest`:** most kept weeks among the last 52, at least 2 kept weeks to qualify. Ties go to the earlier `startedOn`.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run modules/routeen/src/days.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add modules/routeen/src/days.ts modules/routeen/src/days.test.ts
git commit -m "routeen: day states, the week's sky and the year"
```

---

### Task 4: The front page model (`front.ts`)

**Files:**
- Create: `modules/routeen/src/front.ts`
- Test: `modules/routeen/src/front.test.ts`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces:
  - `interface FrontInput { practices: readonly Practice[]; marks: readonly Mark[]; modes: readonly ModeRecord[]; dayModes: readonly DayModeRecord[]; now: Date; dayEndsAt: number }`
  - `interface FrontPage { today: ISODate; yesterday: ISODate; part: Part; mode: Mode; recap: boolean; forNow: Practice[]; notYet: Practice[]; alsoToday: Practice[]; ifYouLike: Practice[]; yesterdayUnmarked: Practice[]; dueCount: number; markedDueCount: number }`
  - `isDueOn(p: Practice, date: ISODate, idx: MarkIndex, modeOf: ModeOf): boolean`
  - `frontPage(input: FrontInput): FrontPage`
  - `tapTier(mode: Mode): Tier` (`low` → `minimum`, otherwise `target`)
  - `allAsPlanned(page: FrontPage, marks: readonly Mark[]): Mark[]` (the marks to write)

- [ ] **Step 1: Write the failing tests**

Use the fixtures from Task 3, plus `med: Practice = { ...run, id: 'med', timeOfDay: 'evening' }` and `water: Practice = { ...run, id: 'water', timeOfDay: 'morning' }`. Use `new Date('2026-11-25T08:00:00')` for morning and `'T19:00:00'` for evening.

```ts
const input = (over: Partial<FrontInput> = {}): FrontInput => ({ practices: [run, water, med, mum, read], marks: [], modes: [], dayModes: [], now: new Date('2026-11-25T08:00:00'), dayEndsAt: 3, ...over });

it('orders by time of day but never hides what is due', () => {
  const p = frontPage(input());
  expect(p.part).toBe('morning');
  expect(p.recap).toBe(false);
  expect(p.forNow.map((x) => x.id)).toEqual(['run', 'water', 'read']); // anytime + morning + times short of its week
  expect(p.notYet.map((x) => x.id)).toEqual(['med']);
  expect(p.alsoToday.map((x) => x.id)).toEqual(['mum']); // weekly, not today
});
it('keeps a just-marked chip where it was', () => {
  const p = frontPage(input({ marks: [mark('med', '2026-11-25')] }));
  expect(p.forNow.map((x) => x.id)).toContain('med');
  expect(p.notYet).toEqual([]);
});
it('turns the evening into a recap of everything due', () => {
  const p = frontPage(input({ now: new Date('2026-11-25T19:00:00') }));
  expect(p.recap).toBe(true);
  expect(p.forNow.map((x) => x.id).sort()).toEqual(['med', 'read', 'run', 'water']);
  expect(p.notYet).toEqual([]);
});
it('moves n-a-week practices aside once the week is met, and never bulk-marks them', () => {
  const twice: Practice = { ...read, cadence: { kind: 'times', n: 2 } };
  const met = [mark('read', '2026-11-23'), mark('read', '2026-11-24')];
  expect(frontPage(input({ practices: [run, twice], marks: met })).alsoToday.map((x) => x.id)).toContain('read');
  const evening = frontPage(input({ now: new Date('2026-11-25T19:00:00') }));
  expect(allAsPlanned(evening, []).map((m) => m.ritualId).sort()).toEqual(['med', 'run', 'water']);
  expect(allAsPlanned(evening, []).every((m) => m.tier === 'target' && m.date === '2026-11-25')).toBe(true);
});
it('marks a little in Low energy, and asks nothing on a Day off', () => {
  const low = frontPage(input({ modes: [{ id: '2026-11-25', from: '2026-11-25', mode: 'low' }], now: new Date('2026-11-25T19:00:00') }));
  expect(tapTier(low.mode)).toBe('minimum');
  expect(allAsPlanned(low, []).every((m) => m.tier === 'minimum')).toBe(true);
  const off = frontPage(input({ modes: [{ id: '2026-11-25', from: '2026-11-25', mode: 'off' }] }));
  expect(off.forNow).toEqual([]);
  expect(off.ifYouLike.map((x) => x.id).sort()).toEqual(['med', 'mum', 'read', 'run', 'water']);
  expect(allAsPlanned(off, [])).toEqual([]);
  expect(off.dueCount).toBe(0);
});
it('lists yesterday until midday, skipping a yesterday that was a Day off', () => {
  expect(frontPage(input()).yesterdayUnmarked.map((x) => x.id).sort()).toEqual(['med', 'run', 'water']);
  expect(frontPage(input({ now: new Date('2026-11-25T12:00:00') })).yesterdayUnmarked).toEqual([]);
  expect(frontPage(input({ dayModes: [{ id: '2026-11-24', date: '2026-11-24', mode: 'off' }] })).yesterdayUnmarked).toEqual([]);
});
it('uses the routine day after midnight', () => {
  const p = frontPage(input({ now: new Date('2026-11-26T00:30:00') }));
  expect(p.today).toBe('2026-11-25');
  expect(p.recap).toBe(true);
});
it('leaves out paused and not-yet-started practices', () => {
  const p = frontPage(input({ practices: [{ ...run, pausedOn: '2026-11-20' }, { ...water, startedOn: '2026-12-01' }] }));
  expect([...p.forNow, ...p.notYet, ...p.alsoToday]).toEqual([]);
  expect(p.dueCount).toBe(0);
});
it('counts what is due today for Home', () => {
  const p = frontPage(input({ marks: [mark('run', '2026-11-25')] }));
  expect(p.dueCount).toBe(4); // run, water, med, read
  expect(p.markedDueCount).toBe(1);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run modules/routeen/src/front.test.ts`
Expected: FAIL, `./front` missing.

- [ ] **Step 3: Implement `front.ts`**

- **`isDueOn`:**
  - false if not active or `modeOf(date) === 'off'`;
  - daily / weekly-on-weekday → true;
  - `times` → `marksInWeek(other days of the week) < weekTarget-for-full-week (n − offDays)`. A mark today keeps it due today, so its chip stays.
- **Sections:**
  - Day off: `ifYouLike` = all active practices.
  - Recap: `forNow` = all due.
  - Otherwise: `forNow` = due with `timeOf` ∈ {part, 'anytime'}, plus due practices marked today; `notYet` = the remaining due ones, unmarked.
  - `alsoToday` = active and not due.
- **Ordering** within each list: a *stable* sort by `startedOn`, then `name`. Ties keep input order (the tests rely on this).
- **`yesterdayUnmarked`:** only when `part === 'morning'` and yesterday's mode is not `off`. Scheduled-yesterday practices (`isScheduledOn`) with no mark.
- **`allAsPlanned`:** unmarked `forNow` practices whose cadence is not `times`, with `tier: tapTier(mode)`. Empty on a Day off or when `!recap`.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run modules/routeen/src/front.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add modules/routeen/src/front.ts modules/routeen/src/front.test.ts
git commit -m "routeen: the front page for now, the evening recap and yesterday"
```

---

### Task 5: Copy catalogue and house contributions (`copy.ts`, `index.ts`)

**Files:**
- Create: `modules/routeen/src/copy.ts`
- Modify: `modules/routeen/src/index.ts`
- Test: `modules/routeen/src/index.test.ts` (new), `modules/routeen/src/copy.test.ts`

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces:
  - `copy` (`as const` object) and `type Copy = typeof copy`. Keys as used by Tasks 7–9. Plural helpers are functions, e.g. `copy.home.status(marked, due)`.
  - `nowForContributions` seam: `export const clock = { now: () => new Date() }`, replaceable in tests.

`copy.ts` holds at least these English strings (spec §6):

| Key | String |
|---|---|
| `fn` | "A routine that bends with your day" |
| `forNow` | "For now" |
| `notYet` | "Not yet today" |
| `recap` | "Today's recap" |
| `alsoToday` | "Also today" |
| `ifYouLike` | "If you feel like it" |
| `tiers` | `{ minimum: 'a little', target: 'as planned', more: 'more' }` |
| `allAsPlanned` | "All as planned" |
| `allALittle` | "All, a little" |
| `modes` | `{ normal: 'Normal', low: 'Low energy', off: 'Day off' }` |
| `backToNormal` | "Back to Normal?" |
| `yesterday(n)` | "Yesterday: n not marked" |
| `dayEndsAt` | "My day ends at…" |
| `places` | `{ today: 'Today', sky: 'Sky' }` |
| `newPractice` | "New practice" |
| `leave` | "Leave" |
| `empty` | "Add something you want to return to." |

Every other string the UI needs goes here too (part-of-day greetings, toasts, dialog copy, labels for screen readers).

- [ ] **Step 1: Write the failing tests**

`copy.test.ts`:

```ts
it('never says missed, streak or percent', () => {
  const text = JSON.stringify(copy, (_k, v) => (typeof v === 'function' ? v(2, 4) : v));
  expect(text).not.toMatch(/missed|streak|%|failed/i);
});
```

`index.test.ts` defines `fakeCtx({ practices = [], marks = [], modes = [], dayModes = [], today = '2026-11-25' })`, which returns `{ today, weekIndexOf: () => null, data: { collection: (p) => ({ all: () => byPath[p] ?? [] }) } }` cast to `ReadContext`. It holds collections `refrain/ritual`, `refrain/mark`, `refrain/mode`, `refrain/day-mode` and `refrain/settings`, and sets `clock.now`:

```ts
it('counts today on Home with the routine day, so 00:30 is still yesterday', () => {
  clock.now = () => new Date('2026-11-26T00:30:00');
  const ctx = fakeCtx({ practices: [run], marks: [mark('run', '2026-11-25')], today: '2026-11-26' });
  expect(routeen.home!(ctx).status).toBe(copy.home.status(1, 1));
});
it('reads Day off on Home and asks for nothing in the badge', () => {
  clock.now = () => new Date('2026-11-25T08:00:00');
  const ctx = fakeCtx({ practices: [run], modes: [{ id: '2026-11-25', from: '2026-11-25', mode: 'off' }] });
  expect(routeen.home!(ctx).status).toBe(copy.home.dayOff);
  expect(routeen.badge!(ctx)).toBeNull();
});
it('keeps the house lines as counts', () => {
  const ctx = fakeCtx({ practices: [run], marks: [mark('run', '2026-11-23')] });
  expect(routeen.weekLines!(ctx, '2026-11-23')[0]!.text).toMatch(/^ROUTEEN · \d+ of \d+/);
  expect(JSON.stringify(routeen.almanacFacts!(ctx))).not.toMatch(/%/);
});
it('owns every refrain collection', () => {
  expect(routeen.collections).toEqual(expect.arrayContaining(['refrain/ritual', 'refrain/mark', 'refrain/look', 'refrain/mode', 'refrain/day-mode', 'refrain/settings']));
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run modules/routeen/src/index.test.ts modules/routeen/src/copy.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

**`index.ts` fields:**
- `functionLine: copy.fn`
- `intro: copy.intro` ("Each day is a sky. Mark a practice and it lights up; a hard day can be lit a little, and a day off is a quiet night.")
- `brand.lockTitle: copy.lock` ("The sky is drawn.")
- `brand.leaveLabel: copy.leave`
- `accent` / `themeColor` from the Fajar preset (Task 6)

**`index.ts` contributions** compute `today` as `routineDay(clock.now(), readSettings(...).dayEndsAt)`, never `ctx.today`:
- `home` / `badge` use `frontPage`. `home.status`: `copy.home.status(markedDueCount, dueCount)`, or `copy.home.dayOff`, or `copy.home.nothingDue`. The action stays `Mark today` → `/routeen/`.
- `weekLines`: `copy.weekLine(kept, active)` from `weekSummary`.
- `almanacFacts`: "Days lit" = `litDays` this year, and "The steadiest" with the note `lit in N weeks this year`.
- `lifeline`: unchanged (marker `ritual` for any mark).
- `rituals.week`: `{ kept: isKeptInWeek(...), notes: marksInWeek(...) }`.
- `collections`: add `MODE_PATH`, `DAY_MODE_PATH`, `SETTINGS_PATH`.

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run modules/routeen/src`
Expected: PASS (all domain and index tests).

- [ ] **Step 5: Commit**

```bash
git add modules/routeen/src/copy.ts modules/routeen/src/copy.test.ts modules/routeen/src/index.ts modules/routeen/src/index.test.ts
git commit -m "routeen: copy catalogue and house lines on the routine day"
```

---

### Task 6: Sky looks, with old cloth looks remapped

**Files:**
- Modify: `packages/core/src/look.ts` (add `aliases` to `LookSpec`, use them in `readLook`)
- Modify: `packages/core/src/look.test.ts`
- Modify: `modules/routeen/src/look.ts`, `modules/routeen/src/look.test.ts`

**Interfaces:**
- Produces:
  - `LookSpec.aliases?: { presets?: Record<string, string>; accents?: Record<string, string> }`. `readLook` maps an aliased id to its target before the `has(...)` check.
  - `ROUTEEN_LOOKS` with presets `fajar` (default), `siang`, `senja`, `malam`, and accents `amber`, `sky`, `dusk`, `leaf`, `stone`.
  - `ROUTEEN_LOOKS.aliases = { presets: { linen: 'fajar', indigo: 'siang', madder: 'senja', night: 'malam' }, accents: { indigo: 'sky', madder: 'dusk', walnut: 'amber', lichen: 'leaf', iron: 'stone' } }`
  - Types stay `hand` / `bookish` (rename the labels only: "Hand-drawn", "Bookish").

- [ ] **Step 1: Write the failing tests**

```ts
// packages/core/src/look.test.ts
it('reads an aliased preset and accent as their new ids', () => {
  const spec = { ...SPEC, aliases: { presets: { old: SPEC.defaultPreset }, accents: { oldA: Object.keys(SPEC.accents)[0]! } } };
  const look = readLook(spec, { id: 'look', preset: 'old', accent: 'oldA', type: SPEC.defaultType, size: 'l', density: 'regular' });
  expect(look.preset).toBe(SPEC.defaultPreset);
  expect(look.accent).toBe(Object.keys(SPEC.accents)[0]);
  expect(look.size).toBe('l');
});

// modules/routeen/src/look.test.ts
it('keeps every sky, accent and mode readable', () => expect(validateLookSpec(ROUTEEN_LOOKS)).toEqual([]));
it('opens a loom-era look as its nearest sky, keeping the other choices', () => {
  const l = readLook(ROUTEEN_LOOKS, { id: 'look', preset: 'madder', accent: 'lichen', type: 'bookish', size: 's', density: 'compact' });
  expect(l).toMatchObject({ preset: 'senja', accent: 'leaf', type: 'bookish', size: 's', density: 'compact' });
});
```

`SPEC` is whatever fixture the core look test already uses; reuse it.

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run packages/core/src/look.test.ts modules/routeen/src/look.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

- Palette values are the builder's call (spec §4.8 feel: Fajar peach→pale blue, Siang clear blue, Senja amber→violet, Malam deep-blue paper with warm ink). Each needs light and dark variants and must pass `validateLookSpec`.
- Add a `--sky-top` / `--sky-bottom` pair to `derive` for the header gradient.
- Glyph shapes are not tokens.
- Update `packages/core` doc comment for `aliases`.

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run packages/core/src/look.test.ts modules/routeen/src/look.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/look.ts packages/core/src/look.test.ts modules/routeen/src/look.ts modules/routeen/src/look.test.ts
git commit -m "routeen: four skies for the look, loom looks remapped"
```

---

### Task 7: The Today page

**Files:**
- Create: `modules/routeen/src/app/Today.tsx`, `modules/routeen/src/app/useRoutine.ts`, `modules/routeen/src/app/SunArc.tsx`
- Modify: `modules/routeen/src/app/RouteenApp.tsx` (routing and primary action; remove `Loom`, `TodaySheet` and the loom `Cloth`)
- Modify: `modules/routeen/src/app/Ceremony.tsx` (replace `Woven` with `Lit`)
- Modify: `modules/routeen/src/app/Chrome.tsx` (`RouteenPlace = 'today' | 'sky' | 'practice' | 'day'`; places from `copy.places`)
- Test: `apps/web/src/test/release2.test.tsx` (rewrite the ROUTEEN describe block)

**Interfaces:**
- Consumes: Tasks 1–6.
- Produces (`useRoutine.ts`), used by Tasks 7–8:
  - `useNow(): Date`: re-renders on each minute boundary and on `visibilitychange`.
  - `useRoutine(): { practices: Practice[]; marks: Mark[]; idx: MarkIndex; modes: ModeRecord[]; dayModes: DayModeRecord[]; settings: RouteenSettings; modeOf: ModeOf; today: ISODate; setTier(p: Practice, date: ISODate, tier: Tier | null): void; setMode(mode: Mode): void; setDayMode(date: ISODate, mode: Mode): void; putMarks(ms: Mark[]): void; saveSettings(s: RouteenSettings): void }`
    - `setTier(p, d, null)` removes the mark.
    - `setTier` and `putMarks` toast with Undo (copy strings).
  - `Lit({ name, tier }: { name: string; tier: Tier })`: the ceremony, played via `house.ceremony(<Lit …/>, 700)`. Never awaited.
- Routes:

  | Path | Page |
  |---|---|
  | `/` | Today |
  | `/sky` | Sky (Task 8) |
  | `/day/<ISO>` | a day (Task 8) |
  | `/practice/<id>` | a practice (Task 8) |
  | `/cloth` | redirects to `/sky` via `house.navigate(house.href('/sky'))` on mount |

  `?new=1` opens the editor. `?mark=1` just opens Today.
- Primary action: `copy.newPractice`, opening the editor.

- [ ] **Step 1: Write the failing integration tests** (replace the "ROUTEEN, the loom" block)

```ts
describe('ROUTEEN, the day’s sky', () => {
  it('lights a loom-era ritual in one tap, as Target, in the old place in the vault', async () => {
    const user = userEvent.setup();
    const store = createMemoryStore([settings(), ritual]);
    at('/routeen/');
    render(<Root store={store} />);
    const chip = await screen.findByRole('button', { name: /^Morning run/, pressed: false });
    await user.click(chip);
    const day = routineDay(new Date(), 3);
    await waitFor(() => expect(store.dump().find((r) => r.key === `refrain/mark/${markId('run', day)}`)?.value).toMatchObject({ tier: 'target' }));
  });
  it('changes the tier from the inline choice, and unmarks on a second tap', async () => {
    // tap the chip, then the button named copy.tiers.minimum → tier 'minimum'; tap the chip again → record deleted
  });
  it('switches the whole routine to Low energy in one tap and writes one mode record', async () => {
    // open the mode control, choose copy.modes.low → exactly one refrain/mode record with id = routine day
  });
  it('opens an old /routeen/cloth link on the sky', async () => {
    at('/routeen/cloth');
    render(<Root store={createMemoryStore([settings(), ritual])} />);
    expect(await screen.findByRole('heading', { level: 1, name: copy.sky.title })).toBeInTheDocument();
  });
});
```

Write the two sketched tests fully, in the same style, with the assertions named in their comments.

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run apps/web/src/test/release2.test.tsx -t "sky"`
Expected: FAIL.

- [ ] **Step 3: Implement the Today page** (spec §4.3–§4.5, phone sketch in §4.3)

**Layout, top to bottom:**
1. Header: `<h1>` with day + part ("Tuesday morning") and `SunArc` (SVG, `aria-hidden`, position from `sunPosition`).
2. Mode control: a button showing the current mode glyph + label, opening a `Segmented` / menu of three.
3. Optional "Back to Normal?" row.
4. Sections, each an `<h2>` + chip list, empty ones not rendered:
   - not recap: `forNow`, `notYet`, `alsoToday`;
   - recap: `recap` (forNow) and `alsoToday`;
   - Day off: `ifYouLike`.
5. Recap: the bulk button (`allAsPlanned` / `allALittle`), hidden when it would write nothing.
6. Morning: the yesterday row → `/day/<yesterday>`.
7. Empty state with the name field + "New practice".

**Chips:**
- A chip is `<button aria-pressed>`. Tap on an unmarked chip → `setTier(p, today, tapTier(mode))` + `Lit`. Tap on a marked chip → `setTier(p, today, null)`.
- A marked chip shows its glyph and tier label, and right after it two small buttons for the other two tiers (keyboard-reachable).
- With a `measure`, the tier buttons show the amount hint (e.g. "10 menit").

**Back to Normal** row: two buttons. "Back to Normal" → `setMode('normal')`. Dismiss → `saveSettings({ ...settings, backToNormalDismissedOn: today })`.

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run apps/web/src/test/release2.test.tsx -t "sky"` and `npm run typecheck`
Expected: PASS. Typecheck may still fail only in files Task 8 replaces (`PracticeEditor.tsx`). Fix any other error now.

- [ ] **Step 5: Commit**

```bash
git add modules/routeen/src/app apps/web/src/test/release2.test.tsx
git commit -m "routeen: Today, one tap to light a practice"
```

---

### Task 8: The Sky (archive), a day, a practice and the editor

**Files:**
- Create: `modules/routeen/src/app/Sky.tsx`, `modules/routeen/src/app/DayPage.tsx`, `modules/routeen/src/app/Tile.tsx`
- Modify: `modules/routeen/src/app/PracticeEditor.tsx` (add time of day and an optional measure; drop thread)
- Modify: `modules/routeen/src/app/RouteenApp.tsx` (wire `/sky`, `/day/<ISO>`, `/practice/<id>`)
- Test: `apps/web/src/test/release2.test.tsx` (add to the ROUTEEN block)

**Interfaces:**
- Consumes: `useRoutine` (Task 7), `weekSky`, `yearSky`, `dayState`, `litDays` (Task 3), `dayModeChange` (Task 2), `ROUTEEN_LOOKS` (Task 6).
- Produces: `Tile({ sky }: { sky: DaySky })`, one day tile also used by the 3D fallback in Task 10.
  - Glyph by `light`: ◐ ☀︎ ✺. ☁︎ / ✦ for the mode. Empty for no light.
  - `unlit` look: expected, past, no light, not off. Dim with a faint outline.
  - `aria-label` from copy, e.g. "Monday 23 November: lit, as planned".

- [ ] **Step 1: Write the failing integration tests**

```ts
it('sets one past day to Day off without changing the running mode', async () => {
  // at('/routeen/day/<yesterday>'); choose copy.modes.off under copy.day.thatDay
  // → refrain/day-mode/<yesterday> exists with mode 'off'; no refrain/mode record written
  // choose copy.modes.normal again → the dayMode record is deleted
});
it('shows the year as 52 weeks and counts lit days', async () => {
  // with two marks on one date: heading copy.sky.title; text copy.sky.caption(1); 52 rows (role="row" inside the year grid)
});
it('creates a practice from its name alone', async () => {
  // Today empty state: type 'Minum air', press the copy.newPractice button
  // → a refrain/ritual record with cadence daily and no timeOfDay/measure, and its chip on Today
});
it('saves when my day ends', async () => {
  // on /routeen/sky choose 2 in copy.dayEndsAt → refrain/settings/settings has dayEndsAt 2
});
```

Write each fully, with exactly these assertions.

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run apps/web/src/test/release2.test.tsx -t "ROUTEEN"`
Expected: FAIL.

- [ ] **Step 3: Implement**

**Sky page:**
1. This week (7 `Tile`s, today outlined, each linking to `/day/<ISO>`).
2. The year (52 rows × 7 `Tile`s, month band labels, caption `copy.sky.caption(litDays)`).
3. Practices list (name → `/practice/<id>`).
4. "Your sky's look" with `LookPicker` (sample: the three tier glyphs).
5. "My day ends at…" (`Segmented` 00–05).

**Day page** `/day/<ISO>`:
- That day's practices with their `dayState`, each tappable to set or clear a tier for that date (same chip component as Today).
- "That day:" mode choice through `dayModeChange` (put or remove).
- Future dates redirect to Today.

**Practice page:** keep the facts, pause/resume, edit and remove-with-confirm. Replace the cloth line with a strip of `Tile`s for this practice over 52 weeks, one tile per week showing the brightest tier.

**Editor:**
- Name (required).
- Time of day (`Segmented`: morning / midday / evening / any time).
- Cadence (as today).
- "Measure (optional)": unit, target, minimum.
- Why.
- Creating from the Today empty state skips the editor: it writes `{ name, why: '', cadence: daily, startedOn: today, pausedOn: null }` straight away.

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run apps/web/src/test/release2.test.tsx` and `npm run typecheck`
Expected: PASS, typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add modules/routeen/src/app apps/web/src/test/release2.test.tsx
git commit -m "routeen: the sky archive, past days and the practice editor"
```

---

### Task 9: The sky's look: theme, chrome, icon and manifest

**Files:**
- Modify: `modules/routeen/src/theme/routeen.css` (rewrite: remove `rt-stitch`, `rt-dye--*`, `rt-pattern--*`)
- Modify: `modules/routeen/src/theme/routeen.kit.css`
- Modify: `apps/web/public/icons/routeen.svg` and the PNG icons the manifest lists
- Modify: `apps/web/public/manifests/routeen.webmanifest` (`theme_color`, `background_color` from Fajar; add `shortcuts: [{ name: 'Mark today', url: '/routeen/' }]`, mirroring `casheen.webmanifest`)
- Test: `npm run lint`, `npm run build`; browser checks below.

- [ ] **Step 1: Write the styles**

- **Header:** a gradient from `--sky-top` to `--sky-bottom`.
- **Chips:** pill buttons, ≥ 44 px tall, with the pressed state shown by fill + glyph (not colour alone).
- **Tiles:** square with 4 px radius. `unlit` uses `--rule` outline and no fill.
- **Kit:** buttons on the sky paper, dialogs as a pale sky card, toasts as a small cloud label.
- **Motion:** `Lit` rises along the arc, ≤ 700 ms ease-out. Mode crossfade on `--sky-*` ≤ 400 ms. Everything inside `@media (prefers-reduced-motion: no-preference)`.
- **Phone (≤ 600 px):** chips wrap full-width, the year grid scrolls horizontally inside its own box, and the bottom bar holds Today · Sky and the raised New practice.
- **No `text-transform: uppercase`**: small caps via `font-variant-caps`.

- [ ] **Step 2: Verify**

Run: `npm run lint && npm run build`
Expected: zero warnings, budgets `ok` (RouteenApp chunk ≤ 90 KB gzip).

- [ ] **Step 3: Check in a real browser** (`npm run dev`, `/routeen/`)

Check at 390 / 768 / 1440 px, light and dark, with reduced motion on and off:
- Today in morning and evening (use the dev clock or change `dayEndsAt` to force the recap);
- Day off;
- the Sky page;
- a past day;
- the look picker with all four presets.

Fix anything unreadable or overlapping.

- [ ] **Step 4: Commit**

```bash
git add modules/routeen/src/theme apps/web/public/icons apps/web/public/manifests/routeen.webmanifest
git commit -m "routeen: the sky's look, icon and Mark today shortcut"
```

---

### Task 10: The year as a sky dome (optional 3D)

**Files:**
- Create: `modules/routeen/src/app/skyScene.ts` (default export `createSky(ctx: SceneContext, props: SkyProps): Promise<SceneHandle<SkyProps>>`)
- Modify: `modules/routeen/src/app/Sky.tsx` (a `DimensionToggle` above the year grid; `Stage3D` when 3D)
- Test: `modules/routeen/src/app/skyScene.test.ts` (pure helper only)

**Interfaces:**
- Consumes: `yearSky` (Task 3), `Stage3D` / `DimensionToggle` / `SceneContext` / `SceneHandle` / `themeColors` from `@eternall/stage` (pattern: `apps/web/src/house/chapters/ChaptersView.tsx:77-92,269-300` and `shelfScene.ts`).
- Produces:
  - `interface SkyProps { days: { date: ISODate; light: Tier | null; mode: Mode }[]; colors: { paper: string; ink: string; accent: string }; onOpen(date: ISODate): void }`
  - `domePosition(week: number, weekday: number): [number, number, number]` (exported pure helper)

- [ ] **Step 1: Write the failing test**

```ts
it('places 52 weeks around the dome and seven days up its side', () => {
  const [x0, y0] = domePosition(0, 0);
  const [x1, , z1] = domePosition(13, 0);
  expect(Math.hypot(x0, y0)).toBeGreaterThan(0);
  expect(domePosition(0, 6)[1]).toBeGreaterThan(domePosition(0, 0)[1]);
  expect(Math.atan2(z1, x1)).not.toBeCloseTo(Math.atan2(domePosition(0, 0)[2], x0));
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run modules/routeen/src/app/skyScene.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

- **Scene:** a hemisphere, with each lit day a point sprite whose size follows the tier (minimum small, more large) and Day-off days as faint stars. `OrbitControls` for turning. It renders on demand (the stage's contract), and clicking a point calls `onOpen(date)` → `/day/<ISO>`.
- **Gate:** `view = house.immersive.allowed ? dimension : '2d'`. The 2D year grid stays the default and the complete equivalent.
- **Label:** `copy.sky.dome`.

- [ ] **Step 4: Verify**

Run: `npx vitest run modules/routeen/src/app/skyScene.test.ts && npm run build`
Expected: PASS; the 3D chunk is listed separately and is ≤ 220 KB gzip; `RouteenApp` is still ≤ 90 KB.

Browser check with `?nobudget`: turn the dome, open a day, toggle back to 2D, and confirm with reduced motion.

- [ ] **Step 5: Commit**

```bash
git add modules/routeen/src/app/skyScene.ts modules/routeen/src/app/skyScene.test.ts modules/routeen/src/app/Sky.tsx
git commit -m "routeen: the year as a sky dome, with its flat sky"
```

---

### Task 11: Docs, ADR and full verification

**Files:**
- Create: `docs/adr/0015-routeen-langit-hari.md` (Context · Decision · Consequences · Alternatives, from spec §1–§3)
- Modify: `docs/design/routeen.md` (rewrite from spec §4; keep the "formerly REFRAIN, data under `refrain/*`" line)
- Modify:
  - `docs/MODULES.md` §6 (records: `tier`, `timeOfDay`, `measure`, `refrain/mode`, `refrain/day-mode`, `refrain/settings`; contributions as counts);
  - `docs/FLOWS.md` (marking, the recap, modes, past days);
  - `docs/PRODUCT.md` (the Practices line);
  - `docs/ROADMAP.md` (a "ROUTEEN · Langit Hari" entry);
  - `docs/adr/README.md` (index);
  - `CLAUDE.md` and `AGENTS.md`, identically (ROUTEEN is the sky, not the loom).
- Also commit: `docs/superpowers/specs/2026-11-24-routeen-langit-hari-design.md`, this plan, `.gitignore` (`.superpowers/`).

- [ ] **Step 1: Write the docs** as listed. In every doc, replace "loom", "thread", "woven" for ROUTEEN; leave historical ADRs 0011–0014 unchanged.

- [ ] **Step 2: Run every gate**

Run: `npm run typecheck && npm run lint && npm test && npm run build`
Expected: all green, zero lint warnings, budgets `ok`.

Then check that the loom is gone and no forbidden copy slipped in:

Run: `grep -rnE "loom|woven|stitch|streak|missed" modules/routeen/src`
Expected: no matches, except the "formerly the loom" note if present in a comment.

- [ ] **Step 3: Final browser pass**

Check the `DESIGN.md` §11 checklist for ROUTEEN at 390 / 768 / 1440, light and dark, reduced motion, 2D and 3D. Also open a vault that holds loom-era records (`npm run dev` with an existing dev vault) and confirm old marks show as ☀︎ Target and the old look opened as its nearest sky.

- [ ] **Step 4: Commit**

```bash
git add docs CLAUDE.md AGENTS.md .gitignore
git commit -m "docs: ROUTEEN becomes Langit Hari, the day's sky (ADR 0015)"
```
