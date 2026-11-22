# AMAZEEN — Design

Status: draft for review · Journal imprint · **Existing system** ("The Production Room", AMAZEEN v1.4). This doc records it and lists what changes when it joins ETERNALL.

## 1. Metaphor
**A small magazine's production room.** You file pieces all week, and on Sunday at midnight the week goes to press as a laid-out issue: a riso-printed cover, a contents page, feature spreads with drop caps and pull quotes, "Dispatches", an "Overheard" page, a *By the numbers* spread with a mood weather report, and a back page.

*Moodboard in words:* newsprint and coated stock; an ink-black spine; vermilion for action; non-photo "proof blue" for editor's marks; riso inks bleeding slightly off-register; deadline clocks; rubber stamps.

## 2. Palette (existing, validated by AMAZEEN's own audit, plus recomputed here)

| Token | Light | Dark | Ratio vs paper (light / dark) |
|---|---|---|---|
| `--paper` | `#efe9dd` | `#12100d` | — |
| `--sheet` | `#f8f4ec` | `#1a1713` | — |
| `--ink` | `#15130f` | `#ece4d4` | 15.35 / 15.03 |
| `--ink-2` | `#46403a` | `#c3baa9` | 8.45 / 9.87 |
| `--ink-3` | `#655d52` | `#a29a8c` | 5.36 / 6.82 |
| `--press-text` (small red text) | `#b92e1a` | `#ff6b55` | 5.01 / 6.77 |
| `--press` (fills, large type) | `#cc3720` | `#ff5a42` | ≥ 3:1 (large/fill use only) |
| `--press-ink` (on press) | `#fff8ef` | `#1b0c08` | 5.74 / 6.79 |
| `--proof` (annotations) | `#2747c9` | `#8ea4ff` | — |
| Riso inks (covers) | blue `#2f5bd3` · teal `#00808a` · violet `#6f4fb8` · orange `#ff6a2b` · yellow `#ffd60a` · pink `#ff4fa3` · green `#11a35f` | same | decorative, always with ink text on paper |

Named dark mode: **Night edition**.

## 3. Typography (existing)
- **Display:** Fraunces Variable (mastheads, headlines, drop caps).
- **Copy:** Newsreader Variable (stories and notes, set for long reading).
- **Production notes and UI:** JetBrains Mono Variable.
- Self-hosted via `@fontsource-variable/*` (OFL).
- Modular scale `--step--2 … --step-6` (fluid `clamp()`); the cover masthead uses `--step-6` (up to 17rem).

## 4. Space and grid (existing)
- **Magazine grid:** `--max: 1360px` with fluid gutters `clamp(16px, 4vw, 56px)` and `--radius: 3px` (print-sharp corners).
- **Baseline-driven spreads** in the Reader; asymmetric feature columns; display type may cross columns; pull quotes break the measure.
- **Desk:** the current issue's live cover proof is the anchor, with a "press check" column beside it, then filed pieces grouped by day.

*Why:* a magazine earns attention through hierarchy and contrast of scale, not boxes.

## 5. Key screens (existing)
| Screen | Essence |
|---|---|
| Onboarding | Name your magazine; the masthead appears live on a sample cover |
| Desk | This week in production: cover proof, press check, deadline countdown, filed pieces |
| Composer | Distraction-free writing for story, note, quote and list; section, mood and cover toggle; *FILED* stamp |
| Reader | The issue page by page, with page rail, swipe, keys, page-turn motion and print |
| Shelf | Issues as covers by month; full-text search with highlighted, deep-linked results |
| Office (settings) | Masthead, export/import, sync |

## 6. What changes when AMAZEEN joins ETERNALL

| Area | Today | In ETERNALL | Why |
|---|---|---|---|
| Navigation spine | AMAZEEN's own 76px ink-black left spine | The **shared ETERNALL spine** (`DESIGN.md` §2). AMAZEEN's sections (Desk · Shelf · Office) move into an in-canvas **masthead strip** set in Fraunces small caps; "Write" becomes the spine's primary action | One spine across imprints. The strip keeps AMAZEEN's voice. *Largest visible change, so it needs a migration note in-app.* |
| Storage and sync | Own IndexedDB + own sync account | The ETERNALL vault (encrypted at rest) and vault sync | Platform privacy (`PRIVACY.md`) |
| Routes | `/`, `/write/:kind`, `/issue/:week`, `/shelf`, `/settings` | Same, under `/amazeen/` | One origin, many doors |
| PWA | `amazeen-app` manifest | Its own manifest with `scope: /amazeen/`, installable as **AMAZEEN** | Keeps its identity |
| Entries on the lifeline | none | Each issue contributes to its week: dominant mood → tone, cover story title, piece count | Lifeline principle |
| Cross-links | none | Mentions of KINDRED people; MARGINALIA quotes as candidates for "Overheard" (opt-in) | Bonuses, never requirements |

## 7. Signature moments
- **Existing (2D):** the Sunday *press*: the issue is compiled, the cover is riso-printed, and the *FILED* rubber stamp lands.
- **New (immersive, CSS 3D):** *the turnable cover.* On the Shelf, an issue lifts off the stack. Its cover can be flipped like coated paper (a slight curl via a CSS 3D transform and a light sheen gradient), and it opens into the Reader with a page-turn. The 2D fallback is the existing cover grid and page-turn.

## 8. Motion (existing vocabulary, kept)
Page turns in the Reader; the rubber-stamp *FILED*; the deadline countdown; the masthead drawing in at onboarding; and the "A new edition of AMAZEEN is ready" update prompt. Easing `--ease-out`/`--ease-spring` as defined in its CSS.

## 9. States (existing)
`States.tsx` covers loading and empty states in newsroom voice; a rescue export appears when stored data is unreadable; and the backup reminder appears after 14 days of un-exported changes. In ETERNALL, the backup reminder becomes a vault-level reminder (`FLOWS.md`).

## 10. Mobile (existing)
A 56px top bar replaces the spine below 900px today. In ETERNALL the shared spine moves to the bottom on mobile (`DESIGN.md` §2), and the masthead strip becomes a horizontally scrollable tab row.

## 11. Clarity checks
- **Forbidden patterns:** none. The only card-like grid is the Shelf of covers, which is a real object (magazines on a shelf), not a generic card grid.
- **5-second test:**
  - *Desk:* "This is this week's issue; I can write a piece."
  - *Shelf:* "These are my past issues; I can open or search one."
- **3 tasks:**
  1. File a quick note about today.
  2. Open last month's issue on page 3.
  3. Find every piece that mentions "Lisbon".
