# PROLOGUE — Design

> **Archived (ADR 0011, 2026-11-23).** This imprint was retired as a separate app. It lives on in house inscriptions (each season became one; `apps/web/src/house/domain/migrations.ts`). Kept for its reasoning, palette and spatial system; the spine rows in its wireframes describe the old shared spine.


Status: draft for review · Hopes for the season · New imprint (Release 2)

## 1. Metaphor
**A theatre: playbill, script and stage.** Each season of your life opens like a play. Before the curtain rises you write the **prologue**: what you hope this season holds. The hopes are the **acts**. When the season ends, the curtain falls and you write the **epilogue**: what happened, what came true, what changed. Past seasons hang in the lobby as playbills.

*Moodboard in words:* letterpress playbills with heavy Didone type; a deep crimson house curtain; gilt proscenium; typewritten scripts with pencil revisions; a single spotlight; the hush of house lights going down.

## 2. Palette (validated)

| Token | Light (playbill) | Dark (house lights down) | Ratio vs paper (light / dark) |
|---|---|---|---|
| `--paper` | `#f1e8d4` | `#0f0b0a` | — |
| `--ink` | `#1a1310` | `#f0e6d2` | 15.06 / 15.81 |
| `--ink-2` | `#4d3f35` | `#bba98f` | 8.29 / 8.56 |
| `--ink-3` | `#68584b` | `#9a8b75` | 5.58 / 5.90 |
| `--accent` (curtain crimson; actions) | `#8e1b2a` | `#e05a6a` | 7.36 / 5.44 |
| `--accent-2` (gilt; text-safe) | `#7a5a0f` | `#f2c46b` (spotlight) | 5.23 / 12.01 |
| `--on-accent` | `#fbf3e3` | `#160709` | 8.13 / 5.47 on accent |

Named dark mode: **House lights down**. The canvas becomes the dark auditorium, and the active season sits in a soft spotlight (radial gradient, decorative only).

## 3. Typography
- **Playbill display:** Abril Fatface (Didone poster type; large sizes only, ≥ 32px).
- **Script:** Special Elite (typewriter), used *only* for short hope titles and stage directions, never for paragraphs.
- **Body:** Libre Baskerville.
- OFL / Apache, self-hosted.

## 4. Space and grid
**A proscenium frame.**
- The **stage**, the central content column, max 720px, is framed by a proscenium arch drawn as a thin double line with corner ornaments, with a top margin of 1/8 viewport height (the fly space).
- **Wings:** two narrow side columns (180px each on ≥ 1200px) hold supporting material: left wing *Cast* (KINDRED people involved, optional), right wing *Notes* (stage directions: dates, days remaining).
- **Playbill layout** for overviews: centred, symmetrical, stacked type with strong scale contrast. This is the one imprint where **symmetry** is the system, because that's what a playbill is.
- **Vertical rhythm** follows the script format: act headings with 3 blank lines above, hopes set like dialogue (name in caps, line below indented 4ch).

*Why:* a stage focuses attention on one thing at a time, which is exactly what setting a few hopes for a season needs.

## 5. Key screens

### 5.1 This season (home)
```
┌ spine: [◖L•] PROLOGUE · Hopes for the season     ⌘K           [ Add a hope ] ┐
          ╔═══════════════════════════════════════════════════════╗
  CAST    ║                    W I N T E R                         ║   NOTES
  · Ana   ║               ─── the season of ───                    ║   Dec 1 → Feb 28
  · Dad   ║                  STAYING CLOSE                         ║   47 days remain
          ║                                                         ║
          ║   ACT I.   Finish the blue glaze series                ║
          ║            ( on stage · 3 notes )                      ║
          ║   ACT II.  Visit Dad every other Sunday                ║
          ║            ( on stage · REFRAIN line linked )          ║
          ║   ACT III. Learn to sit still for ten minutes          ║
          ║            ( waiting in the wings )                    ║
          ╚═══════════════════════════════════════════════════════╝
                        [ Close the season ]  (appears in the last 14 days)
```
- **Seasons** default to meteorological quarters (hemisphere-aware: the hemisphere is chosen in onboarding, defaulting from the time zone). Custom seasons are allowed (e.g. "the move", 10 weeks).
- **Hopes** have a state (*in the wings* → *on stage* → *taken a bow* / *rewritten* / *let go*). "Let go" is a valid, respected ending, never a failure.

### 5.2 Closing the season (epilogue)
The curtain lowers. For each act, one question: *How did this play out?* (took a bow · rewritten · let go) plus a line. Then a free epilogue paragraph. The season becomes a **playbill** in the lobby.

### 5.3 The lobby (past seasons)
Playbills hung in rows, each typeset from its season (title, theme line, acts, outcome marks). Selecting one opens its full programme.

## 6. Signature moment
- **2D (free):** *curtain up.* At the start of a season, the crimson curtain (SVG with pleat gradients) parts from the centre and the season title types itself in Special Elite, then resolves into Abril Fatface. At close, the curtain lowers and a bow is taken (hopes that came true rise slightly).
- **3D (immersive):** *the stage.* A WebGL fragment-shader curtain with real pleat lighting and cloth sway driven by the cursor, a volumetric-looking spotlight cone (additive shader) following the focused act, and the proscenium in subtle relief.
  - *Accessibility:* the DOM script remains the interface, and the shader is a background layer with `aria-hidden`.

## 7. Motion vocabulary
| Moment | Motion | Duration |
|---|---|---|
| Curtain up | halves translate apart with easing like rope pull (slow-fast-slow) | 1400ms |
| Title typing | typewriter reveal 40ms/char, max 1s, then crossfade to display face | ≤ 1400ms |
| Hope moves on stage | slides from the wing into the act list | 420ms |
| Taken a bow | slight rise + gilt underline draws | 600ms |
| Curtain down | halves close, house lights dim (paper → dark) | 1200ms |

## 8. Components unique to PROLOGUE
Proscenium frame · curtain (SVG / shader) · act list (script format) · hope state chip set (in the wings · on stage · taken a bow · rewritten · let go) · wings (cast and notes) · epilogue questionnaire · playbill (generated layout) · lobby.

## 9. States
- **Loading:** an empty proscenium with the curtain closed.
- **Empty (no season yet):** the closed curtain with *"Every season opens with a prologue. What do you hope this one holds?"* plus **Begin this season**.
- **Season overdue (end date passed, not closed):** a quiet note in the right wing: *"Winter has ended. Close the season when you're ready."* There is no badge or red.
- **Error:** validation inline in the script (e.g. *"A hope needs a few words."*).

## 10. Mobile
The wings collapse into two disclosure rows above and below the stage ("Cast · 2", "Notes"). The proscenium becomes a simple double-line frame. The curtain animation is preserved at reduced scale.

## 11. Clarity checks
- **Forbidden patterns:** none. Hopes are not tasks: no checkboxes, due dates or percentages, only states with humane names, each shown with a plain-word tooltip ("On stage = you're working on it").
- **5-second test:** *"These are my hopes for this season; I can add one or close the season."*
- **3 tasks:**
  1. Start a new season with two hopes.
  2. Mark a hope as on stage.
  3. Close last season and read its playbill.
