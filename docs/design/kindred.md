# KINDRED — Design

Status: draft for review · The people who matter · New imprint (Release 2)

## 1. Metaphor
**A letterpress card file and a sky of people.** Everyone who matters has a card, printed by letterpress on thick cotton stock, with the impression you can almost feel. The cards live in a **card file** of drawers. Step back and the same people become a **constellation**: the people closest to you are the brightest and nearest, and the ones you haven't seen in a while drift quietly toward the edge, a reminder, never an alarm.

*Moodboard in words:* heavy cotton card; deep-teal and coral letterpress ink with visible impression; a wooden card file with brass label holders; handwritten dates on the back of a card; an observatory star chart at dusk.

## 2. Palette (validated)

| Token | Light | Dark (dusk) | Ratio vs paper (light / dark) |
|---|---|---|---|
| `--paper` (cotton card) | `#f6f2ea` | `#111615` | — |
| `--ink` | `#1f2422` | `#e7ece8` | 14.10 / 15.28 |
| `--ink-2` | `#4b5350` | `#a9b3ae` | 7.09 / 8.48 |
| `--ink-3` | `#646c69` | `#89938e` | 4.83 / 5.77 |
| `--accent` (press teal; actions) | `#1f5f5b` | `#6fc2b8` | 6.61 / 8.77 |
| `--accent-2` (press coral; dates, birthdays) | `#a8452f` | `#f08a6e` | 5.29 / 7.45 |
| `--on-accent` | `#f6f2ea` | `#0c1413` | 6.61 / 8.96 on accent |

Named dark mode: **Dusk**. The card file recedes and the constellation view becomes the default backdrop.

## 3. Typography
- **Names on cards:** Young Serif, a heavy, warm serif that reads as letterpress impression.
- **Details:** Work Sans (addresses, dates, notes; very clear at small sizes).
- **Dates on the back of cards:** Work Sans italic.
- OFL, self-hosted.

## 4. Space and grid
**Fixed card modules in drawers.**
- **The card:** a fixed **85:55** ratio (business card), at 340×220px on desktop and full-width minus gutters on mobile. Internal padding is generous at 28px, because cards breathe.
- **The card file:** cards are arranged in **drawers** (labelled groups chosen by you: *Family*, *Old friends*, *Workshop*…, plus an automatic *Recently seen*). Each drawer is a horizontal row of cards that overlap by 70% (like cards standing in a drawer) and fan out on hover or focus. Drawers are separated by a 56px "brass rail" label row.
- **The constellation:** a radial layout where distance from centre = time since last seen (log-scaled), size = closeness (your choice: inner circle · close · around), and angle = drawer (each drawer gets a sector). It is labelled; names are always visible for the nearest 12 people, and on focus for everyone else.

*Why:* a fixed card ratio makes every person equal in the file, and the constellation adds the one dimension that matters for keeping people close: time.

## 5. Key screens

### 5.1 The card file (home)
```
┌ ← Close the drawer        ▐● KINDRED ●▌ (brass plate)         ⌕  🔒  [ ADD A PERSON ] ┐
   ╱Card file╲ ╱Constellation╲          (index tabs: / and /sky)
   Keep the people close.   4 cards in the file
   ─ RECENTLY SEEN ──────────────────────────────────────────────────────────────
   ┌────────────┐┐┐┐
   │ Ana Sousa  ││││   (cards overlap like a drawer; fan out on hover)
   │ seen 3 days│┘┘┘
   └────────────┘
   ─ FAMILY ─────────────────────────────────────────────────────────────────────
   ┌────────────┐┐┐
   │ Dad        │││   ⟡ birthday in 9 days
   └────────────┘┘┘
   ─ OLD FRIENDS ────────────────────────────────────────────────────────────────
   ┌────────────┐┐┐┐┐
   │ Tomás      │││││   last seen March  (gently faded impression)
   └────────────┘┘┘┘┘
```

### 5.2 A person's card (opened)
The card flips to show its **back**: dates (birthday, anniversaries), *how you met* (one line), and **the shared timeline**: weeks you were together, mentions across AMAZEEN entries and ENVOI letters, chapters (FOLIO) they were part of. Actions: *I saw them today*, *Edit card*, *Show on lifeline*.

### 5.3 Constellation
```
                 ·  Tomás (March)
        ·                         ·
              ✦ Dad      ✦ Ana
                    ◉ you
              ✦ Leo
        ·                     · Old friends sector
```

## 6. Signature moment
- **2D (free):** *the letterpress card.* Cards render with a subtle **impression** effect: an inner shadow on type and an offset highlight, which deepens when you mark "I saw them today" (the press comes down). Opening a card flips it over in CSS 3D.
- **3D (immersive):** *the constellation in the round.* A three.js star field where people are softly glowing points with labels. Orbit and zoom are available, and selecting a star flies to it and opens their card. Faint lines connect people who share drawers or chapters.
  - *Accessibility:* the constellation is backed by a sortable DOM list ("by last seen", "by closeness"). A 2D canvas force layout is the fallback.

## 7. Motion vocabulary
| Moment | Motion | Duration |
|---|---|---|
| Drawer fan-out | cards spread from 70% overlap to 8% gap | 300ms |
| Card flip | rotateY 180° with a slight lift | 500ms |
| "I saw them today" | press-down impression (inset shadow deepens), the card moves to *Recently seen* | 420ms |
| Constellation drift | position updates animate on open only (no ambient drift) | 800ms |

## 8. Components unique to KINDRED
Letterpress card (front/back) · drawer row (overlap/fan) · brass-rail label · constellation (SVG / canvas / 3D) · shared-timeline list · closeness picker · "seen today" button · mention picker (used by other imprints through the cross-link registry).

## 9. States
- **Loading:** blank card outlines in drawers.
- **Empty:** one blank card in an empty drawer: *"Who do you want to keep close? Add one person to begin."* plus **Add a person**.
- **Long time no see:** the card's impression fades a little (decorative), with the plain text "last seen March". There are no notifications unless the person opts into a gentle local reminder.
- **Privacy note on first run:** *"KINDRED is for you. People you add never receive anything and are never contacted."*

## 10. Mobile
Drawers become vertical lists of full-width cards (no overlap), and tapping flips a card. The constellation becomes a portrait radial view with pinch-zoom and the list toggle.

## 11. Clarity checks
- **Forbidden patterns:** none. This is not a CRM: no "contact frequency scores", no overdue badges, no avatars from the internet. Cards are typographic, with an optional photo you add yourself.
- **5-second test:** *"These are the people I want to keep close; I can add someone or note that I saw them."*
- **3 tasks:**
  1. Add your father with his birthday.
  2. Note that you saw a friend today.
  3. Find who you haven't seen in the longest time.

## 12. Chrome and kit (its own site, ADR 0011)
KINDRED is the face of a card cabinet:
- A **brass label plate** holds the name, letterpressed on card, with the function line.
- **Index tabs** stand up from the drawer: Card file (`/`) and Constellation (`/sky`).
- **Search and the key** sit at the right, with the primary action as a **pressed letterpress block**.
- **"Close the drawer"** goes back to the house.

`theme/kindred.kit.css` re-cuts the shared primitives as letterpress on card stock:
- **Buttons:** square, small caps, with a pressed-in shadow.
- **Ghost buttons:** card with an ink border and an offset shadow.
- **Fields:** ruled lines.
- **Dialogs:** cards with a coral head rule and an offset shadow.
- **Toasts:** calling cards with a teal edge.
- **Choices:** index tabs.
- **Unlock card:** a card behind the brass plate.

## 13. Ceremony (`DESIGN.md` §5.1)
**Letterpress strike.** On "I saw them today" and on a new card: the name comes down onto card stock like a platen, presses in (the inset shadow deepens), leaves a faint ring of ink, and lifts (900ms). `app/Ceremony.tsx`, styles in `theme/kindred.kit.css`.
