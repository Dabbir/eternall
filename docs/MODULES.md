# ETERNALL — Modules (imprints)

Status: as built, consolidated to four apps by ADR 0011 (2026-11-23) · Related: `ARCHITECTURE.md` §3 (contract), §5 (capabilities), `design/*`

> **Since ADR 0011** there are four apps, each its own site: AMAZEEN, REFRAIN, KINDRED and MARGINALIA. The sections below for ENVOI, FOLIO, ALMANACK and PROLOGUE describe where their records and behaviour live now. Collection paths never changed.

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
| `house/settings` | `theme` (`system`/`light`/`dark`, one preference for the whole house; every imprint has its own light and dark palette), `flatPages` (disable 3D), `lens` (`moments`/`chapters`/`plain`), `apps` (the apps switched on in Settings → Apps, ADR 0013; absent until the person first chooses, when Journal and Money plus every app holding data count as on), `hidden` (legacy: apps hidden before ADR 0013, read until `apps` is written), `dismissed` (one-time hints and suggestions), `autoLockMinutes` |
| `house/inscription` | `date`, `title` (≤ 80), `body` (≤ 10k), `tone` (shared tones). The **lightweight "mark this week"** from today's app, kept for people who don't use AMAZEEN; it colours the *Moments* lens. When AMAZEEN is enabled, "Inscribe this week" offers *a quick inscription* or *a piece in AMAZEEN*. |

**Lifeline:** combines all imprints' `WeekContribution`s per week.
- *Moments* lens: the tone of the house inscription > the AMAZEEN mood-derived tone > none.
- *Chapters* lens: the house's Chapters section (once FOLIO).
- Markers: AMAZEEN letters (once ENVOI), REFRAIN rituals, KINDRED people, MARGINALIA works.

**v1 (Release 1):** lifeline 2D + 3D coil, doors menu, unlock, recovery kit, binding onboarding, house inscriptions, command palette, settings.

## 2. AMAZEEN: Journal (`modules/amazeen`)

**Purpose:** everyday writing pressed into a weekly magazine. Existing v1.4 behaviour is kept.

| Entity | Fields (from `amazeen-app/src/domain/types.ts`) |
|---|---|
| `amazeen/entry` | `kind` (`story`/`note`/`quote`/`list`), `title?`, `body?`, `attribution?`, `items?`, `section` (life·work·ideas·culture·body·people·elsewhere), `mood` (1–5), `starred` |
| `amazeen/prefs` | id `look`: `preset` (`press`/`riso`/`broadsheet`/`night`), `accent?` (one of six curated swatches; absent = the preset's own), `type` (`classic`/`book`/`typewriter`), `size` (`s`/`m`/`l`/`xl`), `density` (`compact`/`regular`/`airy`). Read safely (`readLook`): anything unknown falls back to the default (ADR 0013). |
| `amazeen/magazine` | `title` (masthead), `editor` |
| `amazeen/override` | `weekKey` (`YYYY-Www`), `ink?` (riso ink), `headline?` |

- **Lifeline contribution:** per ISO week with entries, give `tone` = mood mapped to tones (5 sunny → joy, 4 → calm, 3 → wonder, 2 → tender, 1 → grief; mapping documented, and overridden by the house inscription tone if present), `count`, and line *"Issue 47 · '<cover story title>'"*. AMAZEEN uses ISO weeks while the lifeline uses birthday-anchored weeks, so an issue contributes to the lifeline week containing its Sunday press date.
- **Almanack facts:** issues published, words written, weather of the year (mood distribution), longest run of issues.
- **Capabilities:** consumes `people.mention`, `chapters.at` (an issue's chapter on its contents page), `letters.compose` ("Seal this cover story as a letter").
- **v1 (Release 1):** everything in v1.4 + vault storage + lifeline contribution + turnable covers (immersive).
- **Later:** a printed bound annual volume (à la carte).

## 3. Letters, in AMAZEEN (once ENVOI; `modules/amazeen/src/imprint/letters/`)

*Moved by ADR 0011.* The `envoi/*` records, rules and lifeline contributions below now belong to the `amazeen` definition (`imprint/letters/contributions.ts`). Routes are `/amazeen/letters`, `/amazeen/letters/write` and `/amazeen/letters/letter/<id>`, and `/envoi/*` redirects there. `letters.compose` is gone; sealing a piece as a letter is internal to AMAZEEN.


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

## 4. Chapters, a house section (once FOLIO; `apps/web/src/house/chapters/`)

*Moved by ADR 0011.* `chaptersSection` (a `HouseSection`) contributes the bands, week lines and facts below, and provides `chapters.at`. The page is `/chapters` (`?open=<id>`, `?new=1`), and `/folio/*` redirects there. Records stay `folio/chapter`.


| Entity | Fields |
|---|---|
| `folio/chapter` | `title` (≤ 60), `start`, `end` (null = still being written), `cloth` (bookcloth 1–6: ochre, cobalt, madder, viridian, violet, rose), `note` (≤ 400) |

- **Rules (existing, kept):** no overlapping chapters; an ongoing chapter can't start in the future; chapters fit within the horizon (or ±120 years without profile).
- **Lifeline contribution:** cloth colour for every week in range (*Chapters* lens), marker `chapter-start` on the first week, line *"Chapter · <title>"*.
- **Almanack facts:** chapters named, the longest chapter, unnamed years.
- **Capabilities:** provides `chapters.at`; the opened chapter's "bound in this chapter" list is built from other imprints' contributions in range (through the house, no direct imports).
- **v1 (Release 1):** shelf, spread, edit, life bar, bookshelf 3D (immersive).
- **Later:** sub-chapters ("parts"); a chapter cover image (local file, encrypted).

## 5. Almanac, a house section (once ALMANACK; `apps/web/src/house/almanac/`)

*Moved by ADR 0011.* The page is `/almanac`, and `/almanack/` redirects there. It gathers facts from the four apps and the house sections. Its record stays `almanack/settings`.


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

## 7. PROLOGUE (retired by ADR 0011)

*Retired.* Each `prologue/season`, with its `prologue/hope` acts and its epilogue, becomes one house inscription (`house/inscription/prologue_<season id>`, tone *wonder*). The conversion runs once per season, including seasons that arrive later by sync, and is logged in `house/migrations`; deleting the inscription does not bring it back. The original records stay in the vault and in exports. `/prologue/*` redirects to `/inscriptions`. The description below is historical.


| Entity | Fields |
|---|---|
| `prologue/season` | `name` (default "Winter 2026", editable), `theme?` (one line: "the season of staying close"), `start`, `end`, `closedAt?`, `epilogue?` (≤ 2k) |
| `prologue/hope` | `seasonId`, `title` (≤ 80), `state` (`wings`/`stage`/`bow`/`rewritten`/`letGo`), `reflection?` (≤ 600), `ritualRef?`, `peopleRefs?` |

- **Rules:** seasons don't overlap; meteorological quarters by default (hemisphere from the house profile or asked in onboarding). There are at most 7 hopes per season (a gentle limit with an explanation: a season holds only a few acts).
- **Lifeline contribution:** marker on the season's opening and closing weeks; line *"PROLOGUE · Winter: 2 hopes on stage"*.
- **Almanack facts:** seasons closed, hopes that took a bow.
- **Capabilities:** consumes `rituals.week`, `people.mention`, `letters.compose` ("Write to yourself at the end of this season"), `chapters.at` (suggests a FOLIO chapter when a season marks a change).
- **v1 (Release 2):** stage, hopes, closing and epilogue, lobby, curtain 2D, stage shader (immersive).

## 8. KINDRED → AMAZEEN · People (ADR 0014)

*Folded into AMAZEEN* as the People wall (`/amazeen/people`, code in `modules/amazeen/src/imprint/people/`). The records below keep their `kindred/*` paths and now belong to AMAZEEN's definition (its `collections`, lifeline `person` marker, week lines, memories, red-letter days, badge and reminders). Reminder keys keep their `kindred_` prefix, so nothing is delivered twice. The constellation and drawers are gone (`drawer` is now a card's **group**, shown as its pin colour). New: **appears in** — the pieces whose text names a person (`appearsIn`, read time only). The `people.mention` capability became AMAZEEN's own `MentionContext`. `/kindred/*` redirects to `/amazeen/people/*`. The original description follows.


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

## 9. MARGINALIA (retired by ADR 0014)

*Retired.* Each `marginalia/underline` becomes one AMAZEEN quote (`amazeen/entry/mg_<underline id>`: the passage, attribution "By, Title, locator" (≤ 80), the margin note as a second paragraph, section *culture*, dated at the underline). A finished work without underlines becomes one note (`mg_<work id>`, "Finished “Title” by X." with its landing). The migration (`migrateMarginalia`, `apps/web/src/house/domain/migrations.ts`) runs once per record, including records that arrive later by sync, and is logged in `house/migrations` (id `marginalia`); deleting a quote does not bring it back. The original records stay in the vault and in exports. `/marginalia/*` redirects to `/amazeen/shelf`. The description below is historical.


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

## 10. CASHEEN: Money, kept plainly (`modules/casheen`), ADR 0012, ADR 0013

*Formerly LEDGER. The collection paths below kept their `ledger/*` names through the rename, as ENVOI's did in ADR 0011: data never moves for a name. The app id is `casheen`; settings saved under `ledger` are read as `casheen` (`withCurrentIds`, `apps/web/src/house/domain/house.ts`), and `/ledger/*` redirects to `/casheen/*`.*

| Entity | Fields |
|---|---|
| `ledger/entry` | `kind` (`out`/`in`), `amount` (whole rupiah > 0, ≤ 1e12), `categoryId`, `date`, `note` (≤ 140), `createdAt` |
| `ledger/category` | `name` (≤ 30, unique), `kind`, `order`, `archived`. The starting set (Food, Transport, Shopping, Bills, Fun, Health, Other; Salary, Other income) is written to the vault on the first change. |
| `ledger/budget` | id `YYYY-MM`; `limits` (category id → rupiah). A month without one starts from the last month that had one. |
| `ledger/words` | one record, `map` (word → category id), at most 500 words, learned from what you write and correct |
| `ledger/pref` | `remindBudget` (off by default) |
| `ledger/terms` | your shorthand: `units` (word → × 1.000 / × 1.000.000), `fixed` (word → an amount, e.g. goceng → 5.000), `days` (word → today/yesterday/… or a weekday), `income` (words meaning money in); at most 40 of each; a word means one thing, and never collides with a built-in word of another kind |

- **Rules:** Rupiah only. The quick line is the main way in (`docs/design/casheen.md` §6). Going over is said plainly, never scored.
- **Money stays in CASHEEN** (ADR 0013). No lifeline layer, week lines, memories, Almanac facts or capabilities: the house shows nothing of it.
- **Reminders:** on the 1st, "Set the budget for <month>", when opted in and no budget exists yet.
- **Capabilities:** none.
- **Import:** CSV read on the device (`csv.ts`); categories are guessed from notes like the quick line.

---

## Cross-app map (since ADR 0011)

```
            (people.mention is internal to AMAZEEN since ADR 0014)
  KINDRED ───────────────▶ AMAZEEN ◀─────────────── MARGINALIA
                        (pieces + Letters)

  CASHEEN ── nothing: money stays in CASHEEN (ADR 0013)

  house · Chapters ── chapters.at ──▶ house inscriptions · AMAZEEN
  REFRAIN ── rituals.list / rituals.week ──▶ (no consumer today)

  Every app and house section ── lifeline() / weekLines() ──▶ house lifeline
                              ── almanacFacts() ──────────▶ house · Almanac
                              ── reminders() ─────────────▶ shell (local reminders)
```

All arrows are optional. Removing any imprint leaves every other imprint fully functional.
