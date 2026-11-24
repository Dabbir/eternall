# ROUTEEN — Design

Status: as built (2026-11-24) · ADR 0015 (amends ADR 0014 §4) · Function line: *A routine that bends with your day* · Door: `/routeen/` · Labelled *Practices* in the app picker
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
| **Fajar** (dawn) | peach to pale blue | `#f8efe8` / `#1a1618` | `#27201f` / `#f1e6e0` | `#f7d9c6` → `#d6e6f3` |
| **Siang** (midday) | clear blue, bright paper | `#eef4fa` / `#0f1722` | `#142030` / `#e4edf8` | `#bcd8f2` → `#e6f1fa` |
| **Senja** (dusk) | amber into violet | `#f7eee6` / `#181220` | `#2a1d22` / `#f0e5ea` | `#f5c98a` → `#cdbde3` |
| **Malam** (night) | deep blue paper, warm ink | `#e6e9f1` / `#0c1220` | `#1b1d2a` / `#f0e4cf` | `#b9c0d9` → `#d4d7e8` |

Accents (light / dark): **Amber** `#9a5a14` / `#f0b968`, **Sky** `#2a5a94` / `#9cc4f2`, **Dusk** `#6a4a94` / `#c4a8ee`, **Leaf** `#46612f` / `#9cc07f`, **Stone** `#4c5560` / `#a9b3bd`. Each preset suggests one (Fajar and Malam: Amber; Siang: Sky; Senja: Dusk).

**Tiers in colour:** Minimum is an outlined tile in accent text; Target a soft accent fill; More the full accent with on-accent text. The glyph always says the same.

## 3. Typography
- **Young Serif** for the name, headings and practice names (the *Hand-drawn* pairing, default).
- **Work Sans** for everything else.
- Alternative pairing (a look option): **Literata** + Work Sans (*Bookish*).
- Small caps via `font-variant-caps`.

## 4. Space and grid
- Today is a single column: header (headline, sun arc, mode), then sections of chips that wrap.
- A chip is a pill button; once lit it fills and the other two tiers sit right after it.
- The Sky's week is seven tiles in a row; the year is 52 rows of seven tiles with month bands, scrolling sideways on a phone and opening at today.
- The page is 1040px max.

## 5. Key screens
### 5.1 Today (home: `/routeen/`)
```
[← Leave]  ROUTEEN  A routine that bends with your day     TODAY · SKY      ⌕ 🔒 [+ New practice]
  Tuesday morning
   ── ☀ ──────────────────── (the sun arc)              [☀︎ Normal ▾]
  For now
  ( Drink water )  ( Meditate )  ( Run ☀︎ as planned )  [◐ a little] [✺ more · 30+ min]
  Not yet today
  ( Read )
  Also today
  ( Swim )                                   (n a week, already met this week)
  Yesterday: 2 not marked →
```
- **Headline:** the weekday and part of day ("Tuesday morning").
- **Mode control:** shows the current mode; one tap opens Normal / Low energy / Day off. A change runs from today ("Low energy for today", with **Undo**).
- **For now:** practices due today whose time of day matches the current part, plus *any time* ones, plus any already lit today.
- **Not yet today:** the rest that are due. Time of day only orders chips, never hides them.
- **Also today:** active practices not due today (an *n a week* practice whose week is already met, a weekly one on another day), still one tap.
- **Tapping a chip** lights it at Target (Minimum in Low energy) and plays **Lit**. The lit chip shows its glyph and tier; the other tiers sit inline, with the measure as a hint ("10 minutes"). Tapping the chip again unmarks it. Each mark and unmark shows a toast with **Undo**.
- **Today's recap** (from 17:00 until the day ends): every due practice in one list, and **All as planned** (Low energy: **All, a little**), which lights every unmarked due practice except *n a week* ones, with **Undo**.
- **Day off:** every active practice moves to **If you feel like it**, still markable; no bulk action.
- **Yesterday** (morning only, until 11:00, and not after a Day off): "Yesterday: N not marked →" opens yesterday's page.
- **Back to Normal?** After three days in Low energy or Day off, offered once a day with **Back to Normal** and **Not yet**.
- **Empty:** "Add something you want to return to." and one name field; the rest has defaults.
- **Resting:** when every practice is paused, "Every practice is resting for now." with **New practice**.

### 5.2 The Sky (`/routeen/sky`; old `/routeen/cloth` redirects here)
- **Caption:** "N days lit this year" (days with at least one mark, from practices that still exist).
- **This week:** seven tiles, Mon→Sun, today outlined. Each shows the brightest tier kept that day and ☁︎ or ✦ for the day's mode; a day with nothing expected is plain. Every past or present tile opens that day. **Earlier** steps back a week at a time, then **Later** and **Back to this week** return, so any past day can be filled in from here.
- **The year:** 52 rows of seven tiles, with month bands, and a **Flat · Dome** toggle. The flat year is the default and the complete equivalent. Year tiles are for reading, not links (days open from the week strip or the dome's list).
- **Practices:** every practice by start date, *paused* noted, each a link to its page.
- **Your sky's look** (§9) and **Your day** ("My day ends at…", 00:00–05:00).

### 5.3 A day (`/routeen/day/<date>`)
The day's mode as its eyebrow (☀︎ ☁︎ ✦), its date, and a chip for each practice active that day (or marked on it), each with its state in words ("lit, a little", "not lit", "day off", "not expected"). One tap lights or unlights; tiers are inline as on Today. **That day:** Normal / Low energy / Day off sets this date's own mode and never changes the running one. A future date opens Today instead.

### 5.4 A practice (`/routeen/practice/<id>`)
Name, why, how often, when, measure ("5 to 20 minutes"), since, lit (a count of days), paused on; its year as 52 weekly tiles. **Edit practice**, **Pause** / **Resume**, **Remove…** (asks first, offers Undo).

### 5.5 The practice editor (dialog)
Only the name is required. Time of day (Morning · Midday · Evening · Any time), how often (Every day · Some days a week · Once a week, on…), measure (optional unit, target and minimum; "Marking never asks for a number"), why, started. Discarding a changed form asks first.

## 6. Signature moment — Lit (`DESIGN.md` §5.1)
On lighting a practice from Today: a small sun with the tier's glyph rises along a fixed curve into the centre of the house's ceremony layer, overshoots slightly and settles, with "<name> lit" under it. 700 ms, ease-out, once. It is decorative and never awaited, so the next tap is never blocked; under reduced motion the shell does not mount it. Marking a past day from its page does not play it.

## 7. Motion
- **Lit** (§6).
- **Mode change:** the weather over the header crossfades (clear → cloud → night), 320 ms.
- Chips and tier buttons fade their colours in 160 ms.
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
Chips wrap to the width; the year scrolls sideways and opens at today; places and **New practice** are the bottom bar.

## 13. Clarity checks
- 5-second test: "what I can do for my routine right now, and that a hard day still counts."
- Tasks: add a practice; light it a little; switch to Low energy; fill in last Tuesday.
- Forbidden: streak counters, scores, flames, percentages, red for an unlit day, the word "missed", anything that needs typing to mark.
