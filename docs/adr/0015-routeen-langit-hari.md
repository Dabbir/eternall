# ADR 0015 — ROUTEEN becomes Langit Hari, the day's sky

Status: Proposed (built 2026-11-24, awaiting the owner's approval) · Date: 2026-11-24 · Amends: ADR 0014 §4 (ROUTEEN as the loom) · Spec: `docs/superpowers/specs/2026-11-24-routeen-langit-hari-design.md` · Design: `docs/design/routeen.md`

## Context
ETERNALL is now framed as private personal record-keeping, for Indonesian people first. Of its three apps, ROUTEEN is the one whose concept no longer fits its job.

Habit apps mostly lose people through rigid psychology, not missing features: a streak that resets after one bad day, all-or-nothing marks, heavy setup, a dashboard of every habit at once, and schedules that ignore illness, holidays or busy weeks. The loom (ADR 0014) already avoided streaks and red, but its front page was a day × practice grid, the passive archive these apps are criticised for.

The owner set one principle for all three apps: one action from the front page, using the fastest input for that kind of data. Journal types a note, Money writes one line, and a routine (the same things, repeated) is **one tap**.

## Decision
1. **ROUTEEN's one promise: a routine that bends with your life.** Function line: *A routine that bends with your day*.
2. **The concept is Langit Hari, the day's sky.** A day is a sun arc (morning, midday, evening). A practice kept today adds light: ◐ Minimum, ☀︎ Target, ✺ More. A life mode is the weather: ☀︎ Normal, ☁︎ Low energy, ✦ Day off. Shapes carry the meaning; colour only supports them.
3. **Marking is one tap, with an optional tier.** A tap marks Target (Minimum in Low energy); the other tiers sit inline. Marking never asks for a number. A practice needs only a name; time of day, cadence and an optional measure (unit, target, minimum, shown as a hint) have defaults.
4. **The front page is "for now":** For now · Not yet today · Also today. Time of day orders chips and never hides them. From 17:00 the page becomes **Today's recap**, with **All as planned** (Undo). Until 11:00 a row offers yesterday's unmarked practices.
5. **The routine day ends at 03:00** by default (a setting, 00:00–05:00), so 00:30 still counts for the day before. ROUTEEN uses it everywhere it computes today, including its house contributions, instead of the shell's midnight date.
6. **Life modes** apply to the whole routine from the day they are chosen; a past day can carry its own mode without changing the running one. Low energy makes Minimum count as kept; a Day off expects nothing and reads as a quiet night. After three days away from Normal, "Back to Normal?" is offered once a day.
7. **"Kept" is any mark at any tier.** A week is kept when it meets the cadence's expectation for days that were not a Day off; a week whose whole expectation fell on Day-off days counts as kept. The house sees **counts only** ("N of M kept", "lit in N weeks this year", "Days lit"), never percentages or streaks.
8. **Data never moves.** `refrain/ritual` gains `timeOfDay?` and `measure?`; `refrain/mark` gains `tier?` (absent reads as Target, so every loom-era mark is kept as Target); new records `refrain/mode`, `refrain/day-mode` and `refrain/settings`. Old `thread`, `pitch` and `instrument` are ignored and never written. Loom-era looks open as their nearest sky (`LookSpec.aliases`).
9. **The archive is the Sky** (`/routeen/sky`, `/routeen/cloth` redirects): a week strip that steps back through past weeks, the year as 52 rows, and an optional 3D dome of the year behind the immersive gate, with the flat year as its full equivalent.
10. **Signature moment: Lit** (≤ 700 ms, never blocks, skipped under reduced motion), replacing "Woven".

## Consequences
- ROUTEEN's domain is rewritten as pure modules with tests: `sky.ts` (routine day, parts, settings), `practices.ts`, `modes.ts`, `days.ts` (day states, weeks, the year), `front.ts` (the front page). `stitchOf`, `weave` and `clothLine` are gone.
- Every UI string sits in `modules/routeen/src/copy.ts`, so the bilingual project only adds a catalogue.
- Shared packages gain two small, optional fields: `LookSpec.aliases` in `packages/core` (old preset and accent ids read as new ones) and `DimensionToggle`'s `label2d` in `packages/stage`.
- The vault only allows lower-case collection paths, so the per-day mode lives at `refrain/day-mode`.
- No new dependency. three.js stays inside the lazy `skyScene.ts` chunk.
- **Known gap:** Resume clears `pausedOn`, so a paused stretch later reads as unlit rather than plain. Fixing it needs pause ranges on the practice; it is left for the owner to schedule (`ROADMAP.md`).

## Alternatives considered
- **One sentence of everyday words to mark** ("lari 10 menit, baca dikit"), like CASHEEN. Rejected by the owner: typing the same habit every day is slower than a tap.
- **Find your keystone habits** (insights) as the promise. Deferred: it needs weeks of data and is easy to overclaim.
- **Jalan Setapak** (a trail map). The best fit for "flexible", but its weekly map is hard to read at a glance.
- **Kebun Musim** (a seasonal garden). "Fallow" is a lovely rest metaphor, but plant metaphors are common and easily childish.
- **A choice of metaphor** (sky / trail / garden) as looks. Rejected for now: three times the glyphs, motion, colour checks and copy, and it breaks "looks never change layout". Trail and garden stay candidates for future editions.
- **Keep the loom.** No streaks, but its front page is the passive grid the promise argues against.
