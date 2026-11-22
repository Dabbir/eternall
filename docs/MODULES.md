# ETERNALL — Modules (imprints)

Status: draft for review · Phase 0 · Related: `ARCHITECTURE.md` §3 (contract), §5 (capabilities), `design/*`

Conventions:
- All dates are civil ISO dates (`YYYY-MM-DD`); timestamps are ISO-8601.
- Every entity has `id`, `createdAt` and `updatedAt`. Deletions are tombstones in the vault.
- Every entity is stored as an encrypted vault record in collection `<imprint>/<collection>`.
- "Lifeline contribution" is what `weekSummary()` returns; "Almanack facts" is what `almanacFacts()` returns.
- Every imprint must work **standalone** (no other imprint, no lifeline profile). Cross-links are optional capabilities.

---

## 1. ETERNALL: the house (`apps/web`)

**Purpose:** the overview of a life in weeks, the doors between imprints, the vault UI.

| Entity | Fields |
|---|---|
| `house/profile` | `name`, `birthDate`, `horizonYears` (50–120), `hemisphere` (`north`/`south`, for PROLOGUE seasons), `createdAt` |
| `house/settings` | `theme` (`system`/`light`/`dark`, one preference for the whole house; every imprint has its own light and dark palette), `flatPages` (disable 3D), `lens` (`moments`/`chapters`/`plain`), `hidden` (imprints hidden from the doors), `dismissed` (one-time hints and suggestions), `autoLockMinutes` |
| `house/inscription` | `date`, `title` (≤ 80), `body` (≤ 10k), `tone` (shared tones). The **lightweight "mark this week"** from today's app, kept for people who don't use AMAZEEN; it colours the *Moments* lens. When AMAZEEN is enabled, "Inscribe this week" offers *a quick inscription* or *a piece in AMAZEEN*. |

**Lifeline:** combines all imprints' `WeekContribution`s per week.
- *Moments* lens: the tone of the house inscription > the AMAZEEN mood-derived tone > none.
- *Chapters* lens: FOLIO.
- Markers: ENVOI letters, REFRAIN rituals.

**v1 (Release 1):** lifeline 2D + 3D coil, doors menu, unlock, recovery kit, binding onboarding, house inscriptions, command palette, settings.

## 2. AMAZEEN: Journal (`modules/amazeen`)

**Purpose:** everyday writing pressed into a weekly magazine. Existing v1.4 behaviour is kept.

| Entity | Fields (from `amazeen-app/src/domain/types.ts`) |
|---|---|
| `amazeen/entry` | `kind` (`story`/`note`/`quote`/`list`), `title?`, `body?`, `attribution?`, `items?`, `section` (life·work·ideas·culture·body·people·elsewhere), `mood` (1–5), `starred` |
| `amazeen/magazine` | `title` (masthead), `editor` |
| `amazeen/override` | `weekKey` (`YYYY-Www`), `ink?` (riso ink), `headline?` |

- **Lifeline contribution:** per ISO week with entries, give `tone` = mood mapped to tones (5 sunny → joy, 4 → calm, 3 → wonder, 2 → tender, 1 → grief; mapping documented, and overridden by the house inscription tone if present), `count`, and line *"Issue 47 · '<cover story title>'"*. AMAZEEN uses ISO weeks while the lifeline uses birthday-anchored weeks, so an issue contributes to the lifeline week containing its Sunday press date.
- **Almanack facts:** issues published, words written, weather of the year (mood distribution), longest run of issues.
- **Capabilities:** consumes `people.mention`, `quotes.offer` (Overheard candidates, opt-in), `chapters.at` (an issue's chapter on its contents page), `letters.compose` ("Seal this cover story as a letter").
- **v1 (Release 1):** everything in v1.4 + vault storage + lifeline contribution + turnable covers (immersive).
- **Later:** a printed bound annual volume (à la carte).

## 3. ENVOI: Letters to your future (`modules/envoi`)

| Entity | Fields |
|---|---|
| `envoi/letter` | `title` (≤ 80), `body` (≤ 20k), `sealedOn`, `opensOn` (> sealedOn, ≤ horizon end or ≤ +120 years if no profile), `fingerprint` (SHA-256 of canonical content, existing), `openedAt` (null until opened), `mentions?` (KINDRED refs) |
| `envoi/draft` | unsent letter text (encrypted like everything) |

- **Rules (existing, kept):** a sealed letter is immutable; it can be destroyed unread (with confirmation and undo) but never edited; it opens on or after `opensOn`; opening verifies the fingerprint.
- **Lifeline contribution:** marker `letter-sealed` on the opening week (ring), `letter-ready` when ready (filled), opened letters as a small dot; line *"A letter opens · '<title>'"* (the title is shown; the body never).
- **Almanack facts:** letters waiting, next opening date (red-letter day), letters opened this year, the longest wait.
- **Capabilities:** provides `letters.compose`; consumes `people.mention`.
- **v1 (Release 1):** desk, writing, sealing ceremony 2D, physical envelope 3D (immersive), pigeonholes, reading with verification.
- **Later:** letters to other people (`PRIVACY.md` §9), with an optional cryptographic time-lock.

## 4. FOLIO: Chapters of your life (`modules/folio`)

| Entity | Fields |
|---|---|
| `folio/chapter` | `title` (≤ 60), `start`, `end` (null = still being written), `cloth` (bookcloth 1–6: ochre, cobalt, madder, viridian, violet, rose), `note` (≤ 400) |

- **Rules (existing, kept):** no overlapping chapters; an ongoing chapter can't start in the future; chapters fit within the horizon (or ±120 years without profile).
- **Lifeline contribution:** cloth colour for every week in range (*Chapters* lens), marker `chapter-start` on the first week, line *"Chapter · <title>"*.
- **Almanack facts:** chapters named, the longest chapter, unnamed years.
- **Capabilities:** provides `chapters.at`; the opened chapter's "bound in this chapter" list is built from other imprints' contributions in range (through the house, no direct imports).
- **v1 (Release 1):** shelf, spread, edit, life bar, bookshelf 3D (immersive).
- **Later:** sub-chapters ("parts"); a chapter cover image (local file, encrypted).

## 5. ALMANACK: Measures & reflections (`modules/almanack`)

- **Entities:** none of its own beyond `almanack/settings` (which measures to show, e.g. hide "heartbeats"). It is a **reader** of the house profile and other imprints' `almanacFacts()`.
- **Standalone behaviour:** without a profile, it measures from the vault's creation date and offers to add a birth date.
- **Existing logic reused:** `computeAlmanac` (time measures, echoes, streaks, tone distribution) from `src/domain/stats.ts`.
- **Lifeline contribution:** none (it reflects on the lifeline rather than adding to it). It may mark **red-letter days** (birthdays, letter openings) as subtle markers.
- **v1 (Release 1):** almanac page, echoes, weather of memory, red-letter days, printable year sheet, engraved orrery 2D, mechanical orrery 3D (immersive).

## 6. REFRAIN: Rituals & habits (`modules/refrain`), Release 2

| Entity | Fields |
|---|---|
| `refrain/ritual` | `name` (≤ 60), `why?` (≤ 400), `cadence` (`daily` · `{ timesPerWeek: n }` · `{ weekly: weekday }`), `instrument` (`piano`/`marimba`/`strings`/`bell`), `pitch` (assigned automatically from a pentatonic set), `startedOn`, `pausedOn?` |
| `refrain/mark` | `ritualId`, `date` (one per ritual per day) |

- **Rules:** expected beats come from the cadence. A missed expected beat is a *rest* (neutral). Pausing a ritual stops expectations without deleting history.
- **Lifeline contribution:** marker `ritual` with `count` = marks that week; line *"REFRAIN · 3 of 4 rituals kept"*.
- **Almanack facts:** total marks, the most constant ritual, rituals kept this year.
- **Capabilities:** provides `rituals.week`; PROLOGUE hopes can link to a ritual.
- **v1 (Release 2):** score, marking, playback 2D, ritual pages; richer instruments and year playback (immersive).

## 7. PROLOGUE: Hopes for the season (`modules/prologue`), Release 2

| Entity | Fields |
|---|---|
| `prologue/season` | `name` (default "Winter 2026", editable), `theme?` (one line: "the season of staying close"), `start`, `end`, `closedAt?`, `epilogue?` (≤ 2k) |
| `prologue/hope` | `seasonId`, `title` (≤ 80), `state` (`wings`/`stage`/`bow`/`rewritten`/`letGo`), `reflection?` (≤ 600), `ritualRef?`, `peopleRefs?` |

- **Rules:** seasons don't overlap; meteorological quarters by default (hemisphere from the house profile or asked in onboarding). There are at most 7 hopes per season (a gentle limit with an explanation: a season holds only a few acts).
- **Lifeline contribution:** marker on the season's opening and closing weeks; line *"PROLOGUE · Winter: 2 hopes on stage"*.
- **Almanack facts:** seasons closed, hopes that took a bow.
- **Capabilities:** consumes `rituals.week`, `people.mention`, `letters.compose` ("Write to yourself at the end of this season"), `chapters.at` (suggests a FOLIO chapter when a season marks a change).
- **v1 (Release 2):** stage, hopes, closing and epilogue, lobby, curtain 2D, stage shader (immersive).

## 8. KINDRED: The people who matter (`modules/kindred`), Release 2

| Entity | Fields |
|---|---|
| `kindred/person` | `name` (≤ 60), `drawer` (label), `closeness` (`inner`/`close`/`around`), `howWeMet?` (≤ 200), `dates[]` (`{ label, date, yearly }`) |
| `kindred/seen` | `personId`, `date`, `note?` (≤ 280) |
| `kindred/photo` | keyed by the person's id; `src`: a JPEG data URL shrunk on the device to ≤ 360 px and ≤ 200,000 characters (optional, added by you) |
| `kindred/pref` | `remind`: `off` / `day` / `eve` / `week` (local reminders for dates; off by default) |

- **Rules:** people never receive anything and are never contacted. Birthdays come from `dates` with `yearly: true`.
- **Reminders:** `reminders(ctx)` returns the dates due today under the chosen lead (on the day, and once at 1 or 7 days before); the house delivers them (`FLOWS.md` F20).
- **Lifeline contribution:** marker `person` on weeks with a `seen` entry; line *"KINDRED · Saw Ana and Dad"*.
- **Almanack facts:** people kept, people seen this year, upcoming dates (red-letter days).
- **Capabilities:** provides `people.mention` (picker + resolver). A mention in another imprint adds to the person's shared timeline (resolved at read time, no back-writes into other imprints).
- **v1 (Release 2):** card file, card front/back, seen-today, constellation 2D, constellation 3D (immersive), local birthday reminders (opt-in), optional photos.

## 9. MARGINALIA: Reading & underlines (`modules/marginalia`), Release 2

| Entity | Fields |
|---|---|
| `marginalia/work` | `title` (≤ 160), `by?`, `kind` (`book`/`film`/`album`/`essay`/`podcast`/`other`), `started?`, `finished?`, `landing?` (`{ stars: 1–5 }` or `{ word }`) |
| `marginalia/underline` | `workId`, `text` (≤ 2k; a passage, never whole works), `locator?` (page, timestamp, track), `note?` (≤ 1k), `offered` (bool, opt-in to Overheard) |
| `marginalia/pref` | one record: `hand` (handwritten margins for short notes, off by default) |

- **Rules:** no network lookups in v1 (privacy). Everything is typed by the person.
- **Lifeline contribution:** marker `work` on the week a work is finished; line *"MARGINALIA · Finished The Waves"*.
- **Almanack facts:** works finished this year by kind, the most-underlined work, echoes of underlines from the same week in earlier years.
- **Capabilities:** provides `quotes.offer` (opt-in per underline).
- **v1 (Release 2):** catalogue, annotated page, highlighter sweep 2D, cabinet (immersive).

---

## Cross-imprint map

```
            people.mention                     quotes.offer
  KINDRED ───────────────▶ AMAZEEN ◀─────────────── MARGINALIA
     │                        │ ▲
     │ people.mention         │ │ letters.compose
     ▼                        ▼ │
   ENVOI ◀── letters.compose ─ PROLOGUE ──▶ rituals.week ◀── REFRAIN
                               │
                               └─ chapters.at ─▶ FOLIO ─ chapters.at ─▶ house · AMAZEEN · ALMANACK

  Every imprint ── weekSummary() ──▶ house lifeline;  almanacFacts() ──▶ ALMANACK
```

All arrows are optional. Removing any imprint leaves every other imprint fully functional.
