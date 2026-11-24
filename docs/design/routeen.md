# ROUTEEN — Design

Status: as built (2026-11-24) · ADR 0015 (amends ADR 0014 §4), ADR 0016 (the sky in full) · Function line: *A routine that bends with your day* · Door: `/routeen/` · Labelled *Practices* in the app picker
*Formerly REFRAIN (a musical score), then the loom (ADR 0014). Its data still lives under `refrain/*`.*

## 1. Metaphor
**Langit Hari, the day's sky.** A day is a **sun arc** (morning, midday, evening) with the sun at the current time. A practice kept today adds **light**; a life mode is the **weather**. The front page is "for now", never a grid of every practice.

| Tier | Glyph | Shape | Copy |
|---|---|---|---|
| Minimum | ◐ | half disc | a little |
| Target | ☀︎ | full disc | as planned |
| More | ✺ | rayed disc | more |

| Mode | Weather | Glyph |
|---|---|---|
| Normal | clear | ☀︎ |
| Low energy | cloudy | ☁︎ |
| Day off | starry night | ✦ |

Shapes always carry the meaning; colour only supports them (CVD-safe). An expected day that passed with no mark is **unlit**: a dim, empty sky with a faint outline, never a glyph, never red, never the word "missed".

*Moodboard in words:* first light on a kitchen window; a midday sky over paper; the amber-to-violet of dusk; a quiet night with a few stars.

## 2. Palette (`modules/routeen/src/look.ts`; validated by `validateLookSpec`: body ≥ 7:1, secondary ≥ 4.5:1, accent text and buttons ≥ 4.5:1)
Four skies, each with a light and a dark variant (the house owns light and dark). Default: **Fajar** with the **Amber** accent.

| Preset | Feel | `--paper` light / dark | `--ink` light / dark | Sky (top → bottom, light) |
|---|---|---|---|---|
| **Fajar** (dawn) | peach to pale blue; dark: plum `#4a2c3f` to night blue `#1d2a3f` | `#f8efe8` / `#1a1618` | `#27201f` / `#f1e6e0` | `#f7d9c6` → `#d6e6f3` |
| **Siang** (midday) | clear blue, bright paper | `#eef4fa` / `#0f1722` | `#142030` / `#e4edf8` | `#bcd8f2` → `#e6f1fa` |
| **Senja** (dusk) | amber into violet; dark: `#5c3540` to `#2a2148` | `#f7eee6` / `#181220` | `#2a1d22` / `#f0e5ea` | `#f5c98a` → `#cdbde3` |
| **Malam** (night) | deep blue paper, warm ink | `#e6e9f1` / `#0c1220` | `#1b1d2a` / `#f0e4cf` | `#b9c0d9` → `#d4d7e8` |

Accents (light / dark): **Amber** `#9a5a14` / `#f0b968`, **Sky** `#2a5a94` / `#9cc4f2`, **Dusk** `#6a4a94` / `#c4a8ee`, **Leaf** `#46612f` / `#9cc07f`, **Stone** `#4c5560` / `#a9b3bd`. Each preset suggests one (Fajar and Malam: Amber; Siang: Sky; Senja: Dusk).

**Tiers in colour:** Minimum is an outlined tile in accent text; Target a soft accent fill; More the full accent with on-accent text. The glyph always says the same.

## 3. Typography
- **Young Serif** for the name, headings and practice names (the *Hand-drawn* pairing, default).
- **Work Sans** for everything else.
- Alternative pairing (a look option): **Literata** + Work Sans (*Bookish*).
- Small caps via `font-variant-caps`.

## 4. Space and grid (ADR 0016)
- **The sky band:** every page opens under a band that spans the page, with no card around it. The app bar wears the same `--sky-top`, so bar and band are one sky; a horizon line closes the band onto the paper.
  - Today and a day: `clamp(180px, 28vh, 280px)` of drawing.
  - The Sky: 72px.
  - A practice: 110px.
- **The reading column:** everything under the band keeps one 1040px column (`.rs-page`), and the band's headline aligns with it.
- **Placement** (`placement.ts`, pure and tested):
  - a practice's time of day picks a third of the arc (morning left, midday high, evening right), and any-time practices rest along the horizon;
  - within a zone, bodies alternate between the arc and an outer orbit;
  - a mark never moves a body, and a new practice moves only its own zone;
  - names show on the sky while there are 12 or fewer bodies and the sky is at least 600px wide.
- **Rows:** one per practice. They are grouped Morning · Midday · Evening · Any time, then Also today, in that fixed order. Each row has its body, name and a line (measure, or the lit tier) on the left, and ◐ ☀︎ ✺ on the right, always there. A row's size never depends on its state.
- **Tiles:** a day is a small sky (rounded 6px in the week). The year is 52 columns of seven points on a strip of sky, with month names on top, scrolling sideways on a phone and opening at today.

## 5. Key screens
### 5.1 Today (home: `/routeen/`)
```
[← Leave]  ROUTEEN  A routine that bends with your day     TODAY · SKY      ⌕ 🔒 [+ New practice]
░░░░░░░░░░░░░░░░░░░░░░░ the sky, edge to edge ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
 Tuesday morning                                                         [☀︎ Normal ▾]
            ☀ Run          ◐ Stretch            ○ Read
     ● Meditate                  (sun)                  ○ Journal
 ──────────────── ○ Drink water ───────────── horizon ─────────────────────────────────
  Morning · now
  ● Meditate  15 minutes                                                ◐  ☀︎  ✺
  ✺ Run       more                                                      ◐  ☀︎  ✺
  Midday · Evening · Any time · Also today …
  Yesterday: 2 not marked →
```
- **The sky:**
  - The headline (weekday and part of day) and the mode control sit on it.
  - The sun stands at the current time. Each practice listed (due, plus Also today) is a body at its place: an empty ring until lit, then its tier's shape.
  - The sky fills toward its full colour as the due practices are lit (`glow`), never as a number.
  - It reads aloud as "Today's sky: 2 of 6 lit". The bodies are hidden from screen readers.
- **Mode control:** shows the current mode; one tap opens Normal / Low energy / Day off. A change runs from today ("Low energy for today", with **Undo**).
- **Rows:**
  - Grouped by time of day in a fixed order, with "now" beside the current part. Time of day only orders and groups; it never hides.
  - Tapping the row lights it at the mode's tier (Target, Minimum in Low energy) and plays **Lit** in place. Tapping a lit row unlights it.
  - Tapping ◐, ☀︎ or ✺ lights at exactly that tier; tapping the lit tier unlights it.
  - Each mark and unmark shows a toast with **Undo**. Nothing on the page moves.
- **Today's recap** (from 17:00 until the day ends): **All as planned** above the groups (Low energy: **All, a little**). It lights every unmarked due practice except *n a week* ones, with **Undo**, and keeps its place once nothing is left for it.
- **Day off:** the sky is a quiet night and unlit bodies are small stars ✦. One line says "A day off, and nothing asked of it. Light anything if you feel like it." Every active practice is still listed; there is no bulk action.
- **Yesterday** (morning only, until 11:00, and not after a Day off): "Yesterday: N not marked →" opens yesterday's page.
- **Back to Normal?** After three days in Low energy or Day off, offered once a day with **Back to Normal** and **Not yet**.
- **Empty:** the sky with only the sun, "Add something you want to return to." and one name field; the rest has defaults.
- **Resting:** when every practice is paused, "Every practice is resting for now." with **New practice**.

### 5.2 The Sky (`/routeen/sky`; old `/routeen/cloth` redirects here)
- **Header:** a short band with the title and the caption "N days lit this year" (days with at least one mark, from practices that still exist).
- **This week:** seven small skies, Mon→Sun, today outlined. Each shows the brightest tier kept that day and ☁︎ or ✦ for the day's mode; a day with nothing expected is plain. Every past or present tile opens that day. **Earlier** steps back a week at a time, then **Later** and **Back to this week** return, so any past day can be filled in from here.
- **The year:** 52 rows of seven tiles, with month bands, and a **Flat · Dome** toggle. The flat year is the default and the complete equivalent. Year tiles are for reading, not links (days open from the week strip or the dome's list).
- **Practices:** every practice by start date as a row (its body, its name, its time of day, "N days lit", *paused*), each a link to its page.
- **Your sky's look** (§9) and **Your day** ("My day ends at…", 00:00–05:00).

### 5.3 A day (`/routeen/day/<date>`)
Under that day's sky (its weather, its bodies placed as on Today, its brightness): the day's mode as its eyebrow (☀︎ ☁︎ ✦), its date, and a row for each practice active that day (or marked on it), each with its state in words ("lit, a little", "not lit", "day off", "not expected"). One tap lights or unlights; the tiers are on every row, as on Today. **That day:** Normal / Low energy / Day off sets this date's own mode and never changes the running one. A future date opens Today instead.

### 5.4 A practice (`/routeen/practice/<id>`)
A short band with this practice's body at its place, then: name, why, how often, when, measure ("5 to 20 minutes"), since, lit (a count of days), paused on; its year as 52 weekly tiles. **Edit practice**, **Pause** / **Resume**, **Remove…** (asks first, offers Undo).

### 5.5 The practice editor (dialog)
Only the name is required. Time of day (Morning · Midday · Evening · Any time), how often (Every day · Some days a week · Once a week, on…), measure (optional unit, target and minimum; "Marking never asks for a number"), why, started. Discarding a changed form asks first.

## 6. Signature moment — Lit (`DESIGN.md` §5.1, ADR 0016)
On lighting a practice from Today, its body in the sky plays the moment in place: it rises a little, blooms with the accent's light and settles at its tier's shape. 700 ms, ease-out, once. When the sky has been scrolled out of view, the house's ceremony layer plays the same moment instead (a small sun with the tier's glyph and "<name> lit"). It is decorative and never awaited, so the next tap is never blocked. Under reduced motion nothing plays. Marking a past day from its page does not play it.

## 7. Motion
- **Lit** (§6).
- **The sky's brightness** follows the day, 320 ms.
- **Mode change:** the weather over the header crossfades (clear → cloud → night), 320 ms.
- Rows, bodies and tier buttons fade their colours in 160 ms.
- Nothing loops. All motion is skipped under `prefers-reduced-motion`.

## 8. Chrome and kit (shared app bar, ADR 0013)
- Way back: **Leave**, with a small sun mark.
- Name: ROUTEEN in Young Serif, with the function line.
- Places: **Today** · **Sky**. A practice's page belongs to Today, a day's page to the Sky.
- Primary action: **New practice**. Marking happens on the page, not in the bar.
- Search and lock: the same positions as every app. On a phone, places and the raised primary action sit in the bottom bar.
- `theme/routeen.kit.css` restyles the shared primitives for the sky; the lock card reads "The sky is drawn."
- PWA: the icon is a sun over the horizon; the manifest shortcut **Mark today** opens Today.

## 9. Your sky's look (ADR 0014, ADR 0015)
Under the Sky: four skies (**Fajar**, **Siang**, **Senja**, **Malam**), five accents, the two type pairings, text size and density. Looks change tokens only, never layout; glyph shapes never change. Stored at `refrain/look`. A loom-era look opens as its nearest sky through `LookSpec.aliases` (`linen`→Fajar, `indigo`→Siang, `madder`→Senja, `night`→Malam; accents `indigo`→Sky, `madder`→Dusk, `walnut`→Amber, `lichen`→Leaf, `iron`→Stone), keeping its other choices.

## 10. 3D — the dome (optional view of the year)
The year as a sky dome: each week a step around the horizon, Monday low and Sunday high; lit days are points of light sized by their brightest tier, days off faint stars. Drag to turn, Ctrl/⌘ + scroll to zoom, click a point to open its day. It lazy-loads `skyScene.ts` through `@eternall/stage` (`Stage3D`, render on demand, frame-time downgrade), sits behind the immersive gate, and lists its lit days and days off as links below for the keyboard. The flat year is the complete equivalent.

## 11. States
Empty: an empty sky with "Add something you want to return to." Resting: every practice paused. Day off: "A day off, and nothing asked of it." when nothing is listed. Not found: "That practice is not in your sky." / "That day is not in your sky." with **Back to Today**. Loading: the house loader.

## 12. Mobile
- The sky is shorter and shows bodies without names, and the mode control sits under the headline.
- Rows are full width, with the three tiers kept on the right; a long name wraps without moving them.
- The year scrolls sideways and opens at today.
- Places and **New practice** are in the bottom bar.

## 13. Clarity checks
- 5-second test: "what I can do for my routine right now, and that a hard day still counts."
- Tasks: add a practice; light it a little; switch to Low energy; fill in last Tuesday.
- Forbidden: streak counters, scores, flames, percentages, red for an unlit day, the word "missed", anything that needs typing to mark, anything that moves under the finger.
