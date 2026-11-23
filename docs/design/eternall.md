# ETERNALL (the house) — Design

Status: draft for review · The lifeline dashboard, the doors menu, the vault screens

## 1. Metaphor
**An atlas plate / a ledger page with a wax seal.** A single large sheet on which an entire life is surveyed, the way an atlas plate surveys a coastline: precise, quiet and spacious, labelled in small engraved type. The one warm thing on the page is the vermilion seal that marks *now*.

*Moodboard in words:* warm laid paper; carbon-black ink; engraved hairlines; generous white margins; a single vermilion wax seal; numbers set like coordinates; the stillness of a museum reading room.

## 2. Palette (validated)

| Token | Light | Dark | Ratio vs paper (light / dark) |
|---|---|---|---|
| `--paper` | `#f2ede3` | `#131210` | — |
| `--ink` | `#1b1915` | `#ede6d8` | 15.04 / 15.08 |
| `--ink-2` | `#4c463d` | `#b9b09f` | 8.00 / 8.71 |
| `--ink-3` (small meta text) | `#6f675a` | `#948b7c` | 4.78 / 5.57 |
| `--seal` (accent, house mark) | `#b8321f` | `#e0553a` | 5.12 / 4.93 |
| `--on-seal` | `#fff6ef` | `#1a0b07` | 5.60 / 5.05 on seal |
| `--cell-lived` / `--cell-future` | `rgb(27 25 21 / .58)` / `/.085` | `rgb(237 230 216 / .42)` / `/.07` | non-text |

> **Correction for the current app:** `--ink-3` is `#8a8174` today, which measures **3.29:1** on paper and fails AA for small text. The values above (`#6f675a` / `#948b7c`) replace it in Phase 1.

**Tones**, shared by all imprints (validated with the CVD tool: light passes with WARN, which is covered by labels; dark passes with WARN):

| Tone | Light | Dark |
|---|---|---|
| joy | `#d99a1e` | `#bf8410` |
| calm | `#1f7fb8` | `#3a8cc4` |
| tender | `#d0508a` | `#d8609e` |
| bold | `#e2731c` | `#cf6418` |
| grief | `#3f8c5e` | `#4a9a6c` |
| wonder | `#8b5fd0` | `#9a70dc` |

## 3. Typography
- **Display:** Instrument Serif (regular + italic). Headlines are set large, with tight tracking and italic for the one emphasised word (accented in seal red).
- **UI and body:** Instrument Sans 400/500/600.
- **Data and coordinates:** JetBrains Mono 400/500, uppercase eyebrows with 0.12em tracking.
- All self-hosted via `@fontsource` (licence: OFL).

## 4. Space and grid
The lifeline is the page. Everything else is marginalia around it.
- **Page:** max 1440px; outer margins `clamp(16px, 4vw, 48px)`, wider than typical apps, like an atlas plate's border.
- **The grid:** 52 columns (weeks) × horizon rows (years). Cell pitch is `min(17px, (width − gutter) / 52)`, the cell is 76% of the pitch, and a **decade gap** of 0.9 × pitch is inserted every 10 rows. The decade gap is the main rhythmic device.
- **Gutters as labels:** ages on the left every 5 years (every 10 on narrow screens), and week numbers 1/13/26/39/52 on top, all in 10px mono.
- **Side column (week panel):** 380px, sticky, separated by space alone (no rules), on screens ≥ 1100px. Below that it becomes a bottom sheet.
- **Vertical rhythm:** a headline block, then a stat strip, then the toolbar, then the grid, with spacing in a 3:2:1 ratio (48 / 32 / 20px on desktop). The heaviest space sits above the grid, so the eye lands on it.

*Why:* an atlas spends its space on the map, not the chrome. The decade gap gives a life its chapters visually even before FOLIO names them.

## 5. Key screens

### 5.1 Lifeline (dashboard)
```
┌ spine ─────────────────────────────────────────────────────────────────────────────┐
│ [◖L•] ETERNALL · Your life in weeks           ⌘K Search        [ Inscribe this week ] │
└────────────────────────────────────────────────────────────────────────────────────┘
   YOUR LIFELINE · 90-YEAR HORIZON                                         ← 11px mono
   Mira, this is week 19                                                   ← hero, 5.6rem
   of your 35th year.
   1,786 lived · 2,894 ahead · 35 inscribed  ━━━━━━━━━━━━━──────────────   ← stat strip
   ↕ 48px
   ( Moments | Chapters | Plain )   ● joy ● calm … ○ letter    [ 2D | 3D coil ]
   ↕ 20px
     1          13          26          39          52     │  AGE 34 · WEEK 19  THIS WEEK
   0 ▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪   │  18 – 24 November 2026
     ▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪   │  ● FOLIO · The workshop
     …                                                     │
     (decade gap)                                          │  AMAZEEN · Issue 47
  30 ▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪◉····························   │   "Kiln opened — the blue…"
     ·······○··············································│  ENVOI · 1 letter ready
                                                           │  REFRAIN · 3 of 4 kept
                                                           │  [ Inscribe ] [ Write to the future ]
```
- Each imprint contributes to the week panel through `weekSummary()` (`ARCHITECTURE.md` §3). The panel lists contributions **by imprint, with name + function**, and each row opens that imprint at that week.

### 5.2 Doors menu (from the house mark)
```
┌──────────────────────────────────────────────┐
│  Your lifeline                    ETERNALL ◖L• │
│  ──────────────────────────────────────────── │
│  AMAZEEN     Journal                 ● open  │
│  ENVOI       Letters to your future  1 ready │
│  FOLIO       Chapters of your life           │
│  ALMANACK    Measures & reflections          │
│  ──────────────────────────────────────────── │
│  Discover    REFRAIN · Rituals & habits    → │
│              KINDRED · The people who matter→ │
│  ──────────────────────────────────────────── │
│  Lock now  ·  Settings  ·  Recovery kit       │
└──────────────────────────────────────────────┘
```
Each row is set in **that imprint's own wordmark style** (a tiny preview of its identity), with the function line in plain house type.

### 5.3 Unlock (vault locked)
A centred paper card, the only centred layout in the house, on purpose: the threshold. It holds the wordmark, "Your archive is locked", a passphrase field or a passkey button, and a quiet link to "Use recovery kit". At an app's door the unlock card is **that app's own lock**, with nothing of the house: its name and function line instead of the wordmark, its own heading ("The card file is locked."), and its kit's look (ADR 0011).

### 5.4 Chapters (once FOLIO; ADR 0011)
A house page (`/chapters`, `?open=<id>` for one chapter) set in the house's own type and palette. It is a shelf of the eras of your life, one plank per decade, with gaps shown as pale "unnamed" volumes. An opened chapter keeps FOLIO's page proportions (`archive/folio.md`). The bookshelf in the round (3D) remains. Chapters colour the lifeline's chapters lens and provide `chapters.at`.

### 5.5 Almanac (once ALMANACK; ADR 0011)
A house page (`/almanac`) set in the house's own type. It holds your time measured gently, facts gathered from the four apps and the house, echoes of this week in earlier years, and red-letter days ahead. The mechanical orrery (3D) remains.

## 6. Signature moment
- **2D (free):** *the drawing of a life.* At first binding, the grid fills row by row while a counter climbs to the number of weeks lived, then the "now" seal pulses (this exists today).
- **3D (immersive mode):** *the life coil.* The same weeks wound into a gently rising helix, one turn per year, with decades as visible bands and chapters as coloured segments. Drag rotates it, scroll travels along the years, and clicking a cell flies the camera to that week and opens the week panel.
  - *Technique:* three.js instanced mesh (≤ 6,240 instances for a 120-year horizon), one draw call, and colours from the same model as the 2D canvas (`buildLifeline`).
  - *Accessibility:* a parallel DOM list grouped by year, using the same keyboard model as the 2D grid (arrows, Page Up/Down, T for today).

## 7. Motion vocabulary
| Moment | Motion | Duration |
|---|---|---|
| Lens change | colour cross-fade per cell, staggered by row (8ms/row, capped at 300ms total) | 300ms |
| Select week | selection ring glides to the cell | 220ms |
| "Now" | seal halo pulse (the only ambient loop allowed) | 2.4s loop |
| Panel content | fade + 14px rise, staggered | 420ms |
| 2D → 3D | grid rows lift and wind into the coil (rows become turns) | 1200ms |

## 8. Components unique to the house
Lifeline canvas · week panel (multi-imprint) · doors menu · unlock card · recovery kit sheet (print) · binding onboarding (birth date, horizon) · lens switch · 2D/3D switch.

## 9. States
- **Loading:** grid outline in `--cell-future`, drawn instantly; data colours fade in.
- **Empty (no contributions yet):** the grid itself plus one line: "Each square is a week. Your imprints will fill them in."
- **Error (vault read failure):** the recovery screen, which never overwrites data (the pattern exists today in `Recovery.tsx`).
- **Locked:** the unlock card (§5.3). The grid is never drawn from plaintext while locked.

## 10. Mobile
- The grid fits the width (pitch about 6px at 390px).
- Tapping selects the nearest week, and the week panel is a bottom sheet with week/year steppers for fine adjustment (exists today).
- The 3D coil is available on capable phones, portrait-first, with the camera following a vertical scroll.

## 11. Clarity checks
- **Forbidden patterns:** none. There are no cards. The single centred layout is the unlock threshold, which is intentional.
- **5-second test:**
  - *Lifeline:* "This is my life in weeks; I can inscribe this week."
  - *Doors:* "These are the parts of ETERNALL; I can open one."
- **3 tasks:**
  1. Find the week you started your current job and open it.
  2. Inscribe something about this week.
  3. Open the imprint that has a letter ready.
