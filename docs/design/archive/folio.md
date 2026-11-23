# FOLIO — Design

> **Archived (ADR 0011, 2026-11-23).** This imprint was retired as a separate app. It lives on in the house's Chapters page (`docs/design/eternall.md` §Chapters). Kept for its reasoning, palette and spatial system; the spine rows in its wireframes describe the old shared spine.


Status: draft for review · Chapters of your life · Replaces "Chapters" in the current ETERNALL app

## 1. Metaphor
**A bookbinder's shelf.** Each chapter of your life is a bound volume: cloth-covered, its title stamped in gilt on the spine, its thickness proportional to its length. Chapters that are still being written lean at the end of the shelf with their last pages blank. Opening a volume shows its title page, its dates, a line about it, and the memories bound inside.

*Moodboard in words:* buckram and bookcloth in deep colours; gilt lettering and raised bands; cream laid endpapers; marbled papers; the smell of a quiet library; a ribbon bookmark.

## 2. Palette (validated)

| Token | Light | Dark | Ratio vs paper (light / dark) |
|---|---|---|---|
| `--paper` (endpaper) | `#f4efe4` | `#121410` | — |
| `--ink` | `#221d17` | `#e8e2d2` | 14.58 / 14.33 |
| `--ink-2` | `#544b40` | `#b3ac9b` | 7.45 / 8.20 |
| `--ink-3` | `#6d6355` | `#938c7c` | 5.14 / 5.54 |
| `--accent` (bookcloth green; actions) | `#2f4a3a` | `#7fae8f` | 8.47 / 7.37 |
| `--accent-2` (gilt; text-safe) | `#7a5f18` | `#d4b25c` | 5.27 / 9.11 |
| `--on-accent` | `#f4efe4` | `#0d140f` | 8.47 / 7.43 on accent |

**Bookcloth palette** (chapter colours; categorical, CVD-validated in light *and* dark: lightness and chroma pass, adjacent ΔE ≥ 7.8, covered by labels since every spine carries its title):

| 1 ochre | 2 cobalt | 3 madder | 4 viridian | 5 violet | 6 rose |
|---|---|---|---|---|---|
| `#a8760c` | `#2f6fca` | `#c2452f` | `#22906a` | `#9b45b0` | `#d4607f` |

> **Correction for the current app:** today's chapter inks (`ochre #c39a52 … slate #80878f`) **fail** the CVD validator (chroma floor, deutan ΔE 4.9). They are replaced by the bookcloth palette above in Phase 4. Existing chapter ink ids map 1:1 by order.

Named dark mode: **Reading room** (lamplit shelf, with gilt catching the light).

## 3. Typography
- **Spine and title-page lettering:** Cinzel (Roman inscriptional capitals), letter-spaced, in gilt on bookcloth.
- **Text:** Crimson Pro, a book face for notes and chapter text.
- **Numerals:** Crimson Pro oldstyle figures in prose, lining tabular figures in date ranges.
- OFL, self-hosted.

## 4. Space and grid
**Classical book proportions.**
- **Opened volume (chapter page):** a 2:3 page built on the **Van de Graaf canon**. The text block is ⅔ of the page width; the inner margin is 1/9 and the outer 2/9 of the page width; the top margin is 1/9 and the bottom 2/9 of the page height. On wide screens the volume opens as a two-page spread with a gutter shadow.
- **Shelf:** one shelf row per decade of life. Spine width ∝ chapter length (min 28px, max 140px), and spine height is uniform at 260px (it scales with the viewport). There is a 2px gap between spines (shadow, no rule) and 64px of vertical space between shelves (the plank).
- **Running heads and folios** (page numbers) appear on chapter pages: the chapter title verso and the date range recto, in 11px Cinzel.

*Why:* the canon is what makes a page feel like a book before you read a word, and it gives FOLIO its calm.

## 5. Key screens

### 5.1 The shelf (home)
```
┌ spine: [◖L•] FOLIO · Chapters of your life        ⌘K          [ New chapter ] ┐
   FOLIO
   Every life is a book.                                       Age 0 ─────── 90
   Name its chapters.                                          ████▒▒█▓██░░░░░░  ← life bar
   ─────────────────────────────────────────────────────────────────────────────
   0–9    ┃CH┃I┃L┃D┃H┃O┃O┃D┃ ┃ IN ┃ PORTO┃                                       ← spines
   ═════════════════════════════════════════════════════════════════════  plank
   10–19  ┃ ┃ ┃ (gap: unnamed years shown as a dusty blank volume, "unnamed")
   ═════════════════════════════════════════════════════════════════════
   20–29  ┃THE LEEDS┃FIRST JOB, SMALL FLAT┃LISBON┃
   ═════════════════════════════════════════════════════════════════════
   30–39  ┃THE WORKSHOP ╱  (leaning: still being written)
```
- Hovering or focusing a spine lifts it 8px and shows a gilt label: dates · weeks · memories.
- **Unnamed years** appear as pale, untitled volumes, a gentle invitation to name them ("Name these years").

### 5.2 An opened chapter
A two-page spread. **Verso:** title page (Cinzel title, dates in small caps, the one-line note in Crimson italic, length in years and weeks). **Recto:** "Bound in this chapter": entries contributed by other imprints in this date range (AMAZEEN issues, ENVOI letters sealed or opened, REFRAIN rituals kept), each as a contents line with its page (week) number. The actions are *Edit chapter* and *Show on lifeline*.

### 5.3 New or edit chapter
A title page being set: the title field in Cinzel, Began / Ended dates, "still being written" toggle, bookcloth swatches (6 cloths shown as real swatches with weave texture), and a note. Overlaps are refused with the existing validation message ("Overlaps with 'The Leeds years'").

## 6. Signature moment
- **2D (free):** *pull and open.* A spine slides forward off the shelf, rotates 90° to show its cover (CSS 3D), and opens into the spread. Closing reverses it. The page curl on turning between chapters uses a CSS mask and gradient curl.
- **3D (immersive):** *the bookshelf in the round.* A procedural walnut shelf with books as box meshes, cloth normal map and gilt titles rendered via canvas texture. The camera dollies along the decades. Selecting a book pulls it out, the cover hinges open, and pages turn with a **page-curl vertex shader**.
  - *Accessibility:* the shelf is a DOM list of chapters grouped by decade, and arrow keys move along spines.

## 7. Motion vocabulary
| Moment | Motion | Duration |
|---|---|---|
| Spine hover | translateY −8px, gilt sheen sweep | 220ms |
| Pull and open | translateZ forward, rotateY 90°, cover hinge | 800ms |
| Page turn | curl (mask + gradient) / shader in 3D | 600ms |
| New chapter bound | a blank volume slides into its place on the shelf; neighbours shift | 420ms |
| Life bar segment hover | segment rises 6% | 220ms |

## 8. Components unique to FOLIO
Shelf (decade rows, plank) · spine (variable width, gilt type, lean state) · unnamed-years volume · two-page spread · title page · contents list (cross-imprint) · bookcloth swatch picker · life bar.

## 9. States
- **Loading:** grey spine silhouettes of plausible widths on planks.
- **Empty:** one empty shelf with a single blank volume: *"Childhood. The first apartment. The years in another city. Name a chapter and it joins the shelf."* plus **New chapter**.
- **Error:** an overlap or invalid date is shown on the title page field in gilt-on-accent error styling with an icon, and the input is kept.

## 10. Mobile
Each decade shelf scrolls horizontally, with spines at min 36px for touch. An opened chapter is a single page (verso then recto as you scroll), and canon margins scale down but keep their ratio.

## 11. Clarity checks
- **Forbidden patterns:** none. Spines replace cards, and gilt is decorative only on spines (text-safe gilt `#7a5f18` is used where gilt carries text on paper).
- **5-second test:**
  - *Shelf:* "These books are the chapters of my life; I can add one."
  - *Spread:* "This is one chapter and what happened in it."
- **3 tasks:**
  1. Name the years you lived in another city as a chapter.
  2. Open your current chapter and see its memories.
  3. Change a chapter's end date.
