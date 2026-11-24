# MARGINALIA — Design

Status: draft for review · Reading & underlines · New imprint (Release 2)

## 1. Metaphor
**An annotated book and a library card catalogue.** Every book, film, album or essay you take in gets a **catalogue card**, typed and filed in long wooden drawers. Open a work and you see it as a page with wide margins: the lines you underlined run in the text column, highlighted, and your thoughts sit in the margin beside them, the way readers have written in books for centuries.

*Moodboard in words:* off-white book paper; a soft yellow highlighter and graphite pencil; marginal brackets and asterisks; a wooden catalogue cabinet with brass pulls; typewritten index cards with a red-ruled header line; due-date stamps.

## 2. Palette (validated)

| Token | Light | Dark | Ratio vs paper (light / dark) |
|---|---|---|---|
| `--paper` (book page) | `#f8f5ee` | `#121110` | — |
| `--ink` | `#1d1b18` | `#ebe6dc` | 15.78 / 15.17 |
| `--ink-2` | `#4f4a42` | `#b1aa9c` | 8.07 / 8.17 |
| `--ink-3` (graphite notes) | `#68625a` | `#918a7d` | 5.54 / 5.51 |
| `--accent` (marginal blue; actions, links) | `#1d4ea8` | `#8db0ff` | 7.12 / 8.79 |
| `--highlight` (behind text) | `#ffe066` | `#4a3f0e` | ink on highlight 13.18 / 8.41 |
| `--on-accent` | `#f8f5ee` | `#0e1220` | 7.12 / 8.69 on accent |

Named dark mode: **After hours** (the library at night, with highlights glowing softly).

## 3. Typography
- **Reading text and quotes:** Literata, designed for long-form reading.
- **Catalogue cards:** IBM Plex Mono (typewritten index cards).
- **Margin notes:** Literata italic by default. An optional **handwritten margin** setting renders *short* notes (≤ 140 characters) in Caveat. It is off by default and never used for long text, to keep legibility.
- OFL, self-hosted.

## 4. Space and grid
**A text column and a wide margin.**
- **Work page:** a text column of 62ch and a margin column at ≈ ½ of the text width (overall ≈ 2:1), with a 40px gutter where **marginal brackets** are drawn. Margin notes align vertically with the passage they annotate (anchored, not stacked), and collide-avoid by nudging down.
- **Catalogue:** cards at a 5:3 ratio (index card), in **drawers** sorted by your choice (author · title · year read · kind). The drawer shows cards edge-on (a 12px visible header strip each). Selecting one pulls the full card up.
- **Rhythm:** text leading 1.65, and the margin uses the same baseline so notes sit on the text's lines.

*Why:* the margin *is* the product, where a reader's mind meets the text. Giving it real width is the whole idea.

## 5. Key screens

### 5.1 The catalogue (home)
```
┌ ↶ Back to the stacks     ┌▔▔▔ red rule ▔▔▔┐               ⌕  🔒  [ Add a work ] ┐
                            │028.8 MARGINALIA │  (a typed catalogue card, rod hole below)
   ╭Catalogue╮╭Every underline╮                 (guide cards: / and /underlines)
   Everything you underlined, kept.                ( author | title | year | kind )
   ┌ A–C ─────────┐ ┌ D–G ─────────┐ ┌ H–L ─────────┐ ┌ M–P ─────────┐
   │▔▔▔▔▔▔▔▔▔▔▔▔▔▔│ │▔▔▔▔▔▔▔▔▔▔▔▔▔▔│ │▔▔▔▔▔▔▔▔▔▔▔▔▔▔│ │▔▔▔▔▔▔▔▔▔▔▔▔▔▔│  ← card headers
   │ Calvino, I.  │ │ Didion, J.   │ │ Le Guin, U.  │ │ Morrison, T. │     edge-on
   │ Invisible C… │ │ The Year of… │ │ The Dispos…  │ │ Beloved      │
   └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
   CURRENTLY READING  ·  The Waves — Virginia Woolf — p. 112 · 14 underlines
```

### 5.2 A work (the annotated page)
```
   THE WAVES — Virginia Woolf                          read Oct–Nov 2026 · ★★★★
   ─────────────────────────────────────────────────┬──────────────────────────
   “I have made up thousands of stories; I have     ┃  This is the whole book
   ░░filled innumerable notebooks with phrases░░     ┃  in a sentence. — p.112
   to be used when I have found the true story…”    ┃
                                                    ┃
   “Life is not susceptible perhaps to the          │
   treatment we give it…”                           │
   ─────────────────────────────────────────────────┴──────────────────────────
   [ Add an underline ]                         ↳ Send to AMAZEEN's Overheard (opt-in)
```
- Underlines are passages you type or paste (MARGINALIA never stores whole texts), each with page/time and an optional margin note.

### 5.3 Add a work
A blank catalogue card in a typewriter carriage: *Title*, *By*, *Kind* (book · film · album · essay · podcast · other), *Started* / *Finished*, and *How it landed* (stars, or a single word). There is no internet lookup in v1 (privacy), so everything is typed by you.

## 6. Signature moment
- **2D (free):** *the highlighter sweep and the pulled card.* Adding an underline sweeps a highlighter across the passage left to right (an animated SVG mask with slightly irregular edges and a soft ink-bleed at the ends). In the catalogue, choosing a card **slides it up out of the drawer** and it flips to the work page.
- **3D (immersive):** *the catalogue cabinet.* A procedural oak cabinet in CSS 3D (lighter than WebGL and sharper for text). Drawers pull out with depth and shadow, cards tilt forward as you browse with the arrow keys or a sideways swipe (Shift + wheel; a plain wheel scrolls the page), and the selected card lifts toward you and opens.
  - *Accessibility:* the cabinet is a DOM tree of drawers (`tree` role) and cards (`treeitem`).

## 7. Motion vocabulary
| Moment | Motion | Duration |
|---|---|---|
| Highlighter sweep | mask reveal left→right, ends bleed | 500ms |
| Margin note appears | bracket draws, note fades in aligned to passage | 300ms |
| Card pull | translateY up + slight rotateX, then flip | 600ms |
| Drawer open (3D) | translateZ out with shadow | 420ms |
| Send to Overheard | quote lifts and slides off the page edge toward AMAZEEN, toast confirms | 600ms |

## 8. Components unique to MARGINALIA
Catalogue drawer (edge-on cards) · catalogue card (typewritten) · annotated page (text + anchored margin) · highlighter mark (SVG mask) · marginal bracket · rating (stars or one word) · "send to Overheard" action (cross-link) · cabinet (CSS 3D).

## 9. States
- **Loading:** drawers with blank card edges.
- **Empty:** an empty drawer and one blank card: *"What are you reading, watching or listening to? Add a work and keep the lines that stay with you."* plus **Add a work**.
- **A work with no underlines:** the page shows the title block and a faint pencil note in the margin: *"Underline a line that stayed with you."*
- **Error:** validation on the card (e.g. *"A work needs a title."*), with the typewriter carriage keeping your text.

## 10. Mobile
The margin column moves **inline**: each margin note follows its passage as an indented, bracketed note. Drawers become a single scrolling list of cards with sticky letter headers.

## 11. Clarity checks
- **Forbidden patterns:** none. There are no star-rating leaderboards, reading-goal progress bars or book-cover grids from the internet. The catalogue card is typographic.
- **5-second test:**
  - *Catalogue:* "These are the things I've read and watched; I can add one."
  - *Work:* "These are the lines I underlined and what I thought."
- **3 tasks:**
  1. Add the book you're reading now.
  2. Save a passage with a margin note.
  3. Find every underline from books you read last year.

## 12. Chrome and kit (its own site, ADR 0011; shared positions, ADR 0013)
MARGINALIA's chrome is an oak desk, set on the shared app bar (`DESIGN.md` §2):
- **The way back** is a cloth **ribbon bookmark** hanging from the head of the bar: **"Back to the stacks"**.
- **The name** is typed on a compact catalogue card: call number, red head rule, ruled stock.
- **The places are pencilled** in Caveat: Catalogue (`/`) and Every underline (`/underlines`). The current one is ringed by hand; a work's page keeps Catalogue ringed.
- **Add a work** (or Add an underline) is typed in brackets at the end of the bar; on a phone it is the raised "+" on the bottom bar, which is a card with a red head rule.

`theme/marginalia.kit.css` types and pencils the shared primitives:
- **Buttons:** square monospace; ghost buttons are bracketed.
- **Quiet actions:** a wavy pencil underline.
- **Dialogs:** index cards with the red head rule and blue ruling.
- **Toasts:** pencilled slips.
- **Choices:** guide-card tabs.
- **Unlock card:** the catalogue card again.

## 13. Ceremony (`DESIGN.md` §5.1)
- **The sweep:** on a new underline, the passage set large on an index card, a highlighter drawn under it from left to right, and a pencil tick in the margin.
- **Filed:** on a new work, its catalogue card drops into an oak drawer under its letter, with "Filed under W" pencilled beneath.

Both last 900ms; see `app/Ceremony.tsx`.
