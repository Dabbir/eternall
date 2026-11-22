# ENVOI — Design

Status: draft for review · Letters to your future · Replaces "Capsules" in the current ETERNALL app

## 1. Metaphor
**A writing desk and the post.** You sit at a desk and write a letter by hand. You fold it, address it to a future date, drip wax and press your seal. Then it goes into the post and waits. The letters still waiting sit in a pigeonhole rack, and the ones that have arrived lie opened on the desk.

*Moodboard in words:* manila and laid writing paper; blue-black fountain-pen ink; red-and-blue airmail chevrons; circular postmarks with dates; stamps with perforated edges; oxblood wax; the hush of a study at night.

## 2. Palette (validated)

| Token | Light | Dark | Ratio vs paper (light / dark) |
|---|---|---|---|
| `--paper` (desk) | `#f3ead8` | `#14110f` | — |
| `--sheet` (letter paper) | `#fbf6ec` | `#1d1915` | — |
| `--ink` (fountain-pen blue-black) | `#1c2433` | `#ece3d2` | 13.02 / 14.76 |
| `--ink-2` | `#4a5263` | `#b8ad9b` | 6.56 / 8.50 |
| `--ink-3` | `#636a79` | `#968c7c` | 4.54 / 5.68 |
| `--accent` (airmail red; actions, wax) | `#b3202f` | `#f06a5a` | 5.55 / 6.19 |
| `--accent-2` (airmail blue; postmarks, links) | `#23458f` | `#8fa8ff` | 7.58 / 8.25 |
| `--on-accent` | `#fff7ee` | `#1a0806` | 6.25 / 6.39 on accent |

Named dark mode: **By lamplight** (the desk at night, with a warm vignette around the active letter).

## 3. Typography
- **Letters:** EB Garamond (regular, italic). Letters are set like real correspondence at 1.3rem with a 1.65 line height.
- **Postal labels and addresses:** Courier Prime (the typewritten "To / Opens on" label, postmarks, dates).
- **UI:** EB Garamond small caps for headings, and system sans only inside form controls where legibility matters.
- All OFL, self-hosted.

## 4. Space and grid
**An asymmetric desk, not a grid.**
- The canvas is an open surface. The **focal letter** sits slightly left of centre (golden-section x ≈ 0.38), at a natural tilt of −1.5°.
- **Waiting letters** live in a **pigeonhole rack** along the right edge, as a column of slots. Each slot holds one envelope, showing only its address label and postmark.
- **Opened letters** are a loose, overlapping stack on the lower left: up to 5 visible, with the rest in an "archive drawer".
- Spacing is measured in **envelope units** (1 EU = envelope height at the current width, which is 110mm:220mm DL proportions). Gaps between objects are ¼ EU, margins ½ EU. Nothing aligns to a strict column, because real desks don't. Text inside letters follows a strict measure of 62ch.

*Why:* correspondence is personal and slightly untidy. A grid would make letters look like database rows.

## 5. Key screens

### 5.1 The desk (home)
```
┌ spine: [◖L•] ENVOI · Letters to your future      ⌘K         [ Write a letter ] ┐
                                                                    PIGEONHOLES
     ┌───────────────────────────────────┐   (tilted −1.5°)        ┌───────────┐
     │  ✉  A LETTER IS READY              │                         │▤ 2031 ○   │
     │                                     │                         ├───────────┤
     │   “A letter from last autumn”       │                         │▤ 2030 ○   │
     │   Sealed 5 Nov 2025 · waited 378d   │                         ├───────────┤
     │                                     │                         │▤ 2034 ○   │
     │             (wax seal)              │                         ├───────────┤
     │         [ Break the seal ]          │                         │  + empty  │
     └───────────────────────────────────┘                         └───────────┘
  ┌─────────┐
  │ opened  │┐   OPENED · 3 letters that found you
  │ letters │┘┐
  └─────────┘ ┘
```
- The primary action ("Write a letter") lives in the spine.
- When a letter is ready, it becomes the focal object. Otherwise the focal object is a blank sheet inviting you to write.

### 5.2 Writing a letter
A full-bleed sheet of letter paper with ruled lines appearing as you type. The **address label** at the top reads: `TO: Mira, on ______ (date picker + quick choices: in one year · in five years · on your 40th birthday)`. A footer note says *"Once sealed, nobody can read or change it before it opens. Not even you."* The single action is **Seal letter**.

### 5.3 A waiting letter
The envelope, front side: address label, postmark with the sealing date, the "opens" date stamped in the corner, and a thin progress line of the wait elapsed as a dotted airmail border that fills. Actions: *Leave it sealed* and *Destroy unread* (with confirmation).

### 5.4 Reading
The envelope opens, the letter unfolds into the reading measure, and a verification line confirms the seal ("Seal intact — exactly as you wrote it.", the SHA-256 check that exists today).

## 6. Signature moment
- **2D (free):** *seal and post.* The letter folds in thirds (CSS 3D on two creases), slides into an envelope, the flap closes, a wax drop lands and is pressed by the seal (the generative seal from the fingerprint, which exists today), then a postmark is stamped with the date. Opening reverses it, ending with the seal cracking in two.
- **3D (immersive):** *a physical envelope.* A procedural paper envelope (a folded plane mesh with subtle cloth physics on open) and a wax seal as an extruded disc with the generative relief normal-mapped. On opening, the wax **fractures into 6–10 Voronoi shards** that fall with simple rigid-body motion (a hand-rolled minimal physics step, no physics library), and the letter rises out.
  - *Accessibility:* identical DOM controls ("Break the seal" button); 3D is purely presentational.

## 7. Motion vocabulary
| Moment | Motion | Duration |
|---|---|---|
| Fold | two crease rotations, sequential | 2 × 260ms |
| Envelope close | flap rotateX 180° → 0° | 420ms |
| Wax drop + press | scale 2.4 → 0.92 → 1, rotate −20° → 0 (spring) | 700ms |
| Postmark | stamp drop with a 2px ink-spread blur fading out | 300ms |
| Pigeonhole slide-in | envelope slides into slot along x | 420ms |
| Seal break | halves rotate apart and fade (2D) / shards (3D) | 900ms |
| Letter rise and unfold | rotateX −70° → 0, paragraphs fade in staggered 260ms | 900ms + stagger |

## 8. Components unique to ENVOI
Desk canvas · envelope (front/back) · address label · postmark (date-driven SVG) · wax seal (generative, existing `Seal.tsx`) · pigeonhole rack · letter sheet (ruled, writable) · seal verdict line.

## 9. States
- **Loading:** empty pigeonhole outlines and a blank sheet silhouette.
- **Empty:** a single blank sheet on the desk: *"Write to the person you're becoming. It will wait for you."* plus **Write a letter**.
- **Error:** if sealing fails (crypto unavailable), the letter text stays in the sheet with *"This browser couldn't seal the letter. Your words are safe here; try again in a current browser."*
- **Tampered:** *"The seal didn't match. This letter may have been altered."* in accent colour with an icon, and the letter is still readable.

## 10. Mobile
The desk becomes a vertical stack: the focal letter first, then pigeonholes as a horizontally scrollable rack, then the opened stack. Writing is a full-screen sheet, and the spine's primary action turns into **Seal** while writing.

## 11. Clarity checks
- **Forbidden patterns:** none. Objects on a desk replace cards, and the tilt is subtle (≤ 2°) so that text stays straight to read.
- **5-second test:**
  - *Desk:* "These are letters to my future; one is ready; I can write another."
  - *Writing:* "I'm writing a letter that opens on a date I choose."
- **3 tasks:**
  1. Write a letter that opens in five years.
  2. Open the letter that is ready.
  3. Find out when your next letter opens.
