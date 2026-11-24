# ROUTEEN · Langit Hari — design

Status: built 2026-11-24, for owner approval · Replaces the loom (ADR 0014 §4) · ADR 0015 · As built: `docs/design/routeen.md`

## 1. Intent and the why

ETERNALL is now framed as **private personal record-keeping** (not "productivity"), for Indonesian people first, in two languages later. It keeps three apps. ROUTEEN is the one whose concept no longer fits its job.

Most habit apps lose people through rigid psychology, not missing features:
- a streak that resets after one bad day;
- all-or-nothing marks;
- heavy setup;
- a dashboard of every habit at once;
- schedules that ignore illness, holidays or busy weeks.

The loom answers some of this (no streak, no red), but its home screen is a day × practice grid: the passive archive these apps are criticised for.

**ROUTEEN's one promise: a routine that bends with your life.** Concretely:
- a day can be kept *a little*, *as planned* or *more*;
- a person can switch the whole routine into a lighter mode for a while without breaking anything;
- the front page shows only what matters now.

**Shared principle across the three apps (owner):** one action from the front page, using the fastest input for that kind of data:

| App | Its data | The fastest action |
|---|---|---|
| Journal | new text | type a note |
| Money | changing amounts | one line of everyday words |
| Routine | the same things, repeated | **one tap** |

## 2. Goals, non-goals, anti-goals

**Goals**
- Marking a practice is one tap from the front page, with no typing.
- Tiers (Minimum / Target / More) and life modes (Normal / Low energy / Day off) make a hard day still count.
- The front page is "for now". It works for people who mark through the day *and* for people who can only mark once, at night.
- A new concept and theme, **Langit Hari** (the day's sky), with personal looks on the existing look engine.
- No data is lost: existing practices and marks keep working.

**Non-goals (this project)**
- Bilingual UI. That is its own project. This one writes every string through the message catalogue so Indonesian can drop in (§9).
- Business model changes. Sync and the Patron gate stay as built.
- Correlation insights, a rhythm page in AMAZEEN's issue, and "Done" buttons on Android reminders are deferred (§10).
- Widgets, smartwatch, Health/Fit and location triggers are impossible as a PWA, so they are out.

**Anti-goals: failure even if it works**
- Any streak counter, score, flame, or red for a missed day.
- A front page that lists every practice with equal weight all day.
- Typing required to mark a practice.
- A mode or tier that makes a day look "failed" after the fact.
- Looking like a game (avatars, coins) or like a spreadsheet.

## 3. Approaches considered

**The promise**
- **A · Flexible routine** (tiers, modes, rest without guilt). **Chosen.** It is felt from day one and needs no history.
- **B · Find your keystone habits** (insights). Deferred: it needs weeks of data and is easy to overclaim.
- **C · One thing for now.** Adopted as how A is *presented*, not as the promise.

**Input**
- **One sentence of everyday words** ("lari 10 menit, baca dikit"), like CASHEEN. Rejected by the owner: typing the same habit every day is slower than tapping.
- **One tap, with optional tier.** **Chosen.**

**Concept and theme**
- **A · Langit Hari (the day's sky).** **Chosen.** The sky divides a day naturally, which fits "for now".
- **B · Jalan Setapak (a trail map).** The best fit for "flexible", but its weekly map is hard to read at a glance.
- **C · Kebun Musim (seasonal garden).** "Fallow" is a lovely rest metaphor, but plant metaphors are common (Forest, Finch) and easily childish.

**Customisation**
- **1 · One world, many looks** (presets, accent, type, size, density on the existing engine). **Chosen.**
- **2 · A choice of metaphor** (sky / trail / garden). Rejected for now: 3× the glyphs, motion, CVD checks and copy, and it breaks "looks never change layout". B and C stay candidates for future editions.
- **3 · One structure, a choice of glyph set.** Rejected: a half-metaphor (leaves under a sun arc).

## 4. Decided design

### 4.1 Concept: the day as a sky
- A day is a **sun arc**: morning, midday, evening, with the sun at the current time.
- A practice kept today adds **light** to the day:

  | Tier | Glyph | Shape |
  |---|---|---|
  | Minimum | ◐ | half disc |
  | Target | ☀︎ | full disc |
  | More | ✺ | rayed disc |

  Shape always carries the meaning, colour only supports it (CVD-safe).
- A life mode is the **weather**:

  | Mode | Weather | Glyph |
  |---|---|---|
  | Normal | clear | ☀︎ |
  | Low energy | cloudy | ☁︎ |
  | Day off | starry night | ✦ |

### 4.2 Practices
- **Creating** needs only a name. Everything else gets a default and can be changed later on the practice's page:
  - **time of day**: `morning` · `midday` · `evening` · `anytime` (default `anytime`);
  - **cadence**: the existing `daily` · `times n per week` · `weekly on a weekday` (default `daily`);
  - optional **measure**: a unit label (e.g. "menit", "halaman"), a target amount and a minimum amount. It is shown as a hint on the tier choice. Marking never asks for a number.
- **Pause and resume**, rename, and delete (with confirmation) stay as today.

### 4.3 The front page ("for now")
- **Header:** the day and part of day ("Tuesday morning"), the sun arc, and the mode control (one tap opens Normal / Low energy / Day off).
- **"For now":** chips for practices due today whose time of day matches the current part of day, plus `anytime` ones.
- **"Not yet today":** every other practice due today and not yet marked. Time of day **only orders chips, never hides them.** A chip leaves the page only when it is marked or the day ends.
- **Tapping a chip** marks it at **Target**. It shows ✓ and an inline "a little · more" choice. Tapping one of those changes the tier, tapping the chip again unmarks it, and an Undo toast appears.
- **Evening becomes "Today's recap"** automatically (from the evening part of day until the day ends):
  - every practice due today in one list, each still one tap;
  - one extra action, **"All as planned"**, which marks every unmarked practice at Target, with Undo.
- **Yesterday:** until midday of the next day (the midday part begins at 11:00), a small row reads "Yesterday: N not marked →". It opens yesterday's chips, one tap each. Older days are filled in from the archive.
- **Empty state:** an empty sky with "Add something you want to return to." and the name field.

Phone sketch:
```
┌────────────────────────────────────────────┐
│  Tuesday morning · Normal ▾                │
│   ── ☀ ─────────────────── (sun arc)        │
│  For now                                   │
│  ( Drink water )  ( Meditate )  ( Run ✓ )  │
│                    a little · more         │
│  Not yet today                             │
│  ( Read )                                  │
└────────────────────────────────────────────┘
```

### 4.4 The day boundary
- **A day ends at 03:00 by default**, so marking at 00:30 counts for the previous day.
- The hour is a setting ("My day ends at…", 00:00–05:00), stored with ROUTEEN's settings.
- Parts of day are fixed:

  | Part | Hours |
  |---|---|
  | Morning | 03:00–11:00 |
  | Midday | 11:00–17:00 |
  | Evening | 17:00 until the day ends |

  *(Hour bounds are the builder's to tune; see §8.)*

### 4.5 Life modes
- **Normal:** each practice expects its Target.
- **Low energy:** a day where the practice reached Minimum counts as fully kept. Archive glyphs still show the real tier.
- **Day off:** nothing is expected. Days in this mode show as a starry night, never as empty or missed.
- A mode applies **from the day it is chosen until it is changed**.
- After 3 days in Low energy or Day off, the header offers "Back to Normal?" once a day, dismissible.
- Modes apply to the whole routine, not to one practice.
- Mode history is kept, so past days keep the mode they had.

### 4.5a Day states and "kept" *(settled after the builder check; marked as Claude's calls)*
- **Kept** (a practice on a day) means there is a mark at any tier. Minimum counts as kept in every mode. The tier only changes the brightness. *(Claude's call: "a hard day still counts" is the promise.)*
- **Per-day state** of a practice, replacing `Stitch`:

  | State | Meaning |
  |---|---|
  | `lit-minimum` / `lit-target` / `lit-more` | marked, at that tier |
  | `unlit` | expected, the day passed in Normal or Low energy, no mark |
  | `open` | expected today, not marked yet |
  | `rest` | the day was a Day off |
  | `plain` | not expected (cadence, paused, before start) |
  | `future` | after today |

- **`unlit` renders as a dim, empty sky:** no glyph, no colour change, no word like "missed", but a faint outline so it differs from `plain`. Never red. *(Claude's call)*
- **A week is kept** for a practice when its marks meet the cadence's expectation for days that were not Day off. For `times n per week`, the expectation is n minus Day-off days, floor 0.
- **Counts, not percentages:** "N of M kept" (house week line) and the Almanac's "steadiest" fact become counts. The Almanac's percentage is replaced by "lit in N weeks this year". *(Claude's call)*
- **The routine day.** ROUTEEN uses its own "routine day" helper (local time minus `dayEndsAt`) everywhere it computes today: the app, `home()`, `badge()`, `weekLines()`, `lifeline()`, `almanacFacts()` and `rituals.week`. It does not rely on the shell's midnight `ctx.today`. Changing `dayEndsAt` never re-dates existing marks. *(Claude's call)*

### 4.5b Cadence and modes on the front page *(Claude's calls)*
- **`times n per week`** practices show in "For now" / "Not yet today" until the week's n is reached (n reduced by Day-off days). After that they move to a collapsed "Also today" list, still one tap. "All as planned" **never** marks them. They appear in the recap as their own row. Home's "N of M today" counts only practices due that day (`daily`, and `weekly` on its weekday), plus `times` practices still short of their week.
- **Low energy:** chips are listed the same way, but **a tap marks Minimum**, with "as planned · more" inline. "All as planned" becomes "All, a little" and marks Minimum.
- **Day off:** nothing is "due". All chips move to one list, "If you feel like it", still markable. There is no recap bulk action, and no Home count (Home reads "Day off"). The Yesterday row ignores a day that was a Day off.

### 4.6 Archive
- **This week:** seven sky tiles, Mon→Sun, today outlined. Each shows the day's overall light and weather:
  - the brightest tier kept;
  - ☁︎ or ✦ for the day's mode;
  - plain for a day with nothing expected.

  Tapping a tile opens that day's marks for viewing and editing. *(As built: **Earlier** / **Later** / **Back to this week** step the strip through past weeks, so any past day can be filled in from here. Year tiles are for reading, not links.)*
- **Per practice:** its page shows its history as a strip of the same glyphs.
- **The year:** 52 rows, one per week, each row seven day tiles, with month bands. The caption counts **days with at least one mark** ("Lit on 214 days this year"). *(Claude's call)* No percentages, no streaks.
- **3D (optional view of the year):** a sky dome to turn, with each day a point of light. It lazy-loads through `@eternall/stage`, has a full 2D equivalent (the year grid) and a `DimensionToggle`, and stays behind the existing immersive gate.

### 4.7 Signature moment and motion
- **Lit:** on marking from Today, a small sun with the tier's glyph rises along a fixed curve in the centred ceremony layer and settles, with "<name> lit" under it. ≤ 700 ms, never blocks the next tap, skipped under reduced motion. *(As built: it does not start from the tapped chip; the ceremony layer has no anchor to it.)*
- **Mode change:** the sky's tint crossfades (clear → cloud → night). ≤ 400 ms.
- Nothing loops.

### 4.8 Looks (existing engine, `packages/core/src/look.ts`)
- **Presets:**

  | Preset | Feel |
  |---|---|
  | **Fajar** (dawn, default) | peach to pale blue |
  | **Siang** (midday) | clear blue, bright paper |
  | **Senja** (dusk) | amber to violet |
  | **Malam** (night) | deep blue paper, warm ink |

  Each has a light and a dark variant (the house still owns light/dark).
- **Also:** a few accents, two type pairings from fonts already self-hosted (Young Serif + Work Sans, Literata + Work Sans), text size and density.
- Looks change tokens only, never layout. Glyph shapes never change.
- Every combination passes `validateLookSpec`.
- An existing `refrain/look` record with an old preset id (`linen`, `indigo`, `madder`, `night`) maps to the nearest new preset (`linen`→Fajar, `indigo`→Siang, `madder`→Senja, `night`→Malam). Its other choices are kept.

### 4.9 Chrome (shared app bar, ADR 0013)
- **Way back:** "Leave" in ROUTEEN's idiom.
- **Name:** ROUTEEN.
- **Places:** **Today** · **Sky** (the archive).
- **Primary action:** **New practice**. Marking happens on the page, not in the bar.
- **Search and lock:** same positions as every app.
- **Phone:** places and the raised primary action sit in the bottom bar.
- `theme/routeen.kit.css` is restyled for the sky.
- The PWA manifest shortcut becomes "Mark today", opening Today.

### 4.10 Data (vault; paths never move)
- `refrain/ritual` (practice) gains:
  - `timeOfDay?`: `'morning' | 'midday' | 'evening' | 'anytime'`, absent = `anytime`;
  - `measure?`: `{ unit: string ≤ 20, target: number, minimum: number }`.

  `thread` and `pitch` are no longer written. Old ones are ignored.
- `refrain/mark` gains `tier?`: `'minimum' | 'target' | 'more'`, **absent = `target`**, so every existing mark reads as Target. The id stays `${ritualId}_${date}`, one mark per practice per day.
- **New `refrain/mode`:** one record per start date, `{ id: from, mode: 'normal' | 'low' | 'off', from: ISODate }`. A second change on the same day overwrites that day's record (same id, so two synced devices settle on the last write). The running mode of a day is the record with the latest `from ≤ day`. No record means Normal.
- **New `refrain/day-mode` (owner: past days can have their own mode):** `{ id: date, date: ISODate, mode }`. It overrides the running mode **for that one date only** and never changes the running mode. It is set from a past day's page in the archive ("That day: Normal / Low energy / Day off"). One record per date, so last write wins. Choosing the same mode as the running one deletes the override. The mode of a day is the `dayMode` for that date if present, else the running mode.
- **New `refrain/settings`** (id `settings`): `dayEndsAt` (hour 0–5, default 3) and `backToNormalDismissedOn` (date or null). ROUTEEN had no settings record, so this is its own.
- `refrain/look` is kept, with presets remapped (§4.8).
- **Kept:** the lifeline marker `ritual`, capabilities `rituals.list` / `rituals.week`, and `home()`. Home's status line counts practices marked today ("2 of 4 today"), never streaks.
- Export and recovery are unchanged.

## 5. Constraints (from `CLAUDE.md`)
- Local-first. All data through `ctx.vault`. No new runtime dependency; three.js only in the lazy 3D chunk.
- ROUTEEN imports no other app.
- Domain logic is pure TypeScript in `modules/routeen/src/` with a test for every exported function. "Expected", "kept" and "lit" are now computed with tier, mode and day boundary.
- WCAG 2.1 AA, keyboard paths (chips are buttons, tier choice reachable by keyboard), reduced motion, validated palettes (contrast + CVD).
- Bundle budgets (`DESIGN.md` §7) stay green.
- Small caps via `font-variant-caps`. Action labels in plain words. Copy in the message catalogue.
- Checked at 390 / 768 / 1440, light and dark, reduced motion, and 2D/3D for the year view.

## 6. Copy (English now, Indonesian ready)
Key strings, written through the catalogue. The Indonesian column is for the bilingual project.

| Key idea | English | Bahasa Indonesia |
|---|---|---|
| function line | A routine that bends with your day | Rutinitas yang mengikuti harimu |
| for now / not yet / recap | For now · Not yet today · Today's recap | Untuk saat ini · Belum tercatat hari ini · Rekap hari ini |
| tiers | a little · as planned · more | sedikit · sesuai target · lebih |
| all | All as planned | Semua sesuai target |
| modes | Normal · Low energy · Day off | Normal · Hemat energi · Libur |
| back to normal | Back to Normal? | Kembali ke Normal? |
| yesterday | Yesterday: N not marked | Kemarin: N belum tercatat |
| day end | My day ends at… | Hariku berakhir jam… |

## 7. Docs to update when built
- A new ADR (Langit Hari replaces the loom; tiers, modes, day boundary).
- `docs/design/routeen.md` rewritten.
- `docs/MODULES.md` §6 (data).
- `docs/FLOWS.md` (marking, recap, modes).
- `docs/PRODUCT.md` (Practices line).
- `CLAUDE.md` / `AGENTS.md` (ROUTEEN = the sky, not the loom).

## 8. Left to the builder
- Exact palette values per preset, accents, glyph drawing, and the sun-arc illustration. Must pass contrast and CVD.
- Exact part-of-day hour bounds, and when the evening recap starts.
- Animation curves and timing within the limits in §4.7.
- How the 3D sky dome looks, within stage budgets.
- Whether yesterday's row opens a sheet or switches the page to yesterday.
- Where `dayEndsAt` is stored, if ROUTEEN has no settings record yet.

## 9. Bilingual readiness
This project does not add language switching. It must leave no hard-coded UI strings in ROUTEEN, so the bilingual project only adds the Indonesian catalogue and a language preference.

## 10. Deferred
- Correlation insights, honestly worded and shown only once there is enough data.
- ROUTEEN contributing a rhythm page to AMAZEEN's issue through `rituals.week`.
- "Done" action buttons on Android local reminders.
- Sky / trail / garden as alternative editions.
