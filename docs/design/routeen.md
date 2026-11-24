# ROUTEEN — Design

Status: as built · ADR 0014 · Function line: *Practices, woven daily* · Door: `/routeen/` · Labelled *Practices* in the app picker
*Formerly REFRAIN (a musical score). Its data still lives under `refrain/*`.*

## 1. Metaphor
**A hand loom.** Each practice is a **thread** stretched on the loom. Every day the shuttle passes and weaves one **row**. A day you kept is a coloured stitch; an expected day that passed leaves the bare warp showing, a quiet gap that becomes part of the pattern; a day off is plain undyed weave. A week is a short strip of cloth; a year is **the cloth**. Nothing breaks, nothing turns red, there is no streak to lose.

*Moodboard in words:* undyed linen; indigo vats; a shuttle's clack; a selvedge edge; a sampler that shows its maker's rhythm.

## 2. Palette (validated: body ≥ 7:1, secondary ≥ 4.5:1, accent text and buttons ≥ 4.5:1, thread colours ≥ 3:1 against the cloth)

| Token | Light (Linen) | Dark |
|---|---|---|
| `--paper` / `--sheet` | `#efe8da` / `#f7f2e7` | `#15130f` / `#1c1a15` |
| `--ink` / `--ink-2` / `--ink-3` | `#22201b` / `#4a453b` / `#5f584b` | `#ece5d6` / `#c6bead` / `#a39b8b` |
| `--accent` (indigo) | `#2e4a7d` | `#9db4e3` |

**Threads** take natural dyes, assigned in turn and stored on the practice: indigo `#2e4a7d`/`#8ea9dc`, madder `#a33a2b`/`#e98a76`, weld `#7d6000`/`#d9b44a`, walnut `#6b4a2e`/`#c49a74`, lichen `#4a6636`/`#9cc07f`, iron `#4c5560`/`#a9b3bd`. **Each thread also has its own weave pattern** (plain, twill, dotted, rib, herringbone, basket), so threads are told apart without colour (CVD-safe).

## 3. Typography
- **Young Serif** for the name, headings and the practice names: chunky, hand-made.
- **Work Sans** for everything else.
- Alternative pairing (a look option): **Literata** + Work Sans.
- Small caps via `font-variant-caps`.

## 4. Space and grid
- A row is a day; a column is a practice's thread. Cells are square stitches with 2px of warp between them.
- The page is 1100px max. On a phone the week's strip fills the width.

## 5. Key screens
### 5.1 The loom (home: `/routeen/`)
```
[← Leave the loom]  ROUTEEN  Practices, woven daily    THE LOOM · THE CLOTH     ⌕ 🔒 [+ Mark today]
  This week · 2 of 4 woven today
  ┌ Morning run   ▓▓░▓▓  ▒ ▒   (each square a day, Mon→Sun; today raised)
  ├ Call Mum      ··· ▓ ···
  └ Read 20 pages ▓░ ▓ · ·
  legend: ▓ woven  ░ bare warp (expected, not kept)  · plain weave (not expected)
```
- Tapping a practice opens its page; tapping today's cell weaves or unweaves it, with Undo.

### 5.2 The cloth (`/routeen/cloth`)
The year as one textile: 52 rows of weeks, each practice a band of its own pattern; months are selvedge bands. A caption: "Woven 214 times this year". Under it: "Your cloth's look" (§9).

### 5.3 A practice (`/routeen/practice/<id>`)
Its thread (colour and pattern), why, cadence, started on, pause or resume, rename, and its history as a long strip. Delete asks first.

### 5.4 Mark today (sheet)
One checkbox per practice expected today, then the others ("Also today"). **Weave** writes them.

## 6. Signature moment — Woven (`DESIGN.md` §5.1)
On marking: the shuttle crosses the screen and today's row tightens into place, ≤ 700ms, see-through, skipped under reduced motion.

## 7. Motion
The shuttle; a raised row for today. Nothing loops.

## 8. Chrome and kit (shared app bar, ADR 0013)
- Way back: **"Leave the loom"**, with a small shuttle mark.
- Name: ROUTEEN in Young Serif over a woven selvedge rule.
- Places: **The loom** · **The cloth**.
- Primary action: **Mark today** (or **New practice** when there are none).
- `theme/routeen.kit.css`: buttons with a stitched border, fields on linen, dialogs as a folded cloth with a selvedge edge, toasts as a woven label.

## 9. Your cloth's look (ADR 0014)
Presets: **Linen** (default), **Indigo vat**, **Madder**, **Night loom**. Dye sets for the threads, the two type pairings, text size and density. Patterns never change, so threads stay distinguishable.

## 10. States
Empty: an empty loom with "Add your first practice — something you want to return to." Loading: the house loader.

## 11. Mobile
The week's strip fills the width; practice names sit above their row. Places and the raised **Mark today** are the bottom bar.

## 12. Clarity checks
- 5-second test: "my practices, and which days I kept them."
- Tasks: add a practice; mark today; see last month.
- Forbidden: streak counters, flames, scores, red for missed days.
