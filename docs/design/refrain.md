# REFRAIN — Design

Status: draft for review · Rituals & habits · New imprint (Release 2)

## 1. Metaphor
**A score and a repeated verse.** Each ritual is a line of music that returns, a refrain. A week is a bar with seven beats, one per day. Keeping a ritual places a note on its line, and missing a day leaves a **rest**, which in music is part of the piece, not a failure. Over weeks, your rituals become a melody you can play back.

*Moodboard in words:* engraved sheet music on warm white; indigo printer's ink; the precise geometry of noteheads and stems; a conductor's pencil marks; programme notes from a concert hall; the stillness before the downbeat.

## 2. Palette (validated)

| Token | Light | Dark | Ratio vs paper (light / dark) |
|---|---|---|---|
| `--paper` (score paper) | `#f7f4ec` | `#101016` | — |
| `--ink` (engraving black) | `#16161a` | `#ecebf2` | 16.42 / 16.01 |
| `--ink-2` | `#4a4a52` | `#b2b1c0` | 7.99 / 8.98 |
| `--ink-3` | `#66666f` | `#8f8e9e` | 5.17 / 5.90 |
| `--accent` (indigo; actions, played notes) | `#3b3a8f` | `#a6a4ff` | 8.73 / 8.46 |
| `--on-accent` | `#f7f4ec` | `#101016` | 8.73 / 8.46 on accent |

Rituals do **not** get separate colours, because pitch, position and label identify them. That makes the score naturally colour-blind-safe. Named dark mode: **Late rehearsal**.

## 3. Typography
- **Display:** Bodoni Moda (concert programme elegance; high contrast, used ≥ 24px only).
- **Notation:** Bravura (SMuFL music font, OFL) for clefs, notes, rests and repeat signs, rendered as text glyphs, so it scales crisply and is accessible with labels.
- **UI and body:** Libre Franklin (clear and sturdy at small sizes).
- OFL, self-hosted.

## 4. Space and grid
**The five-line staff is the grid.**
- Base unit `s` = staff space (the distance between two staff lines) = 10px at default, scaling with the viewport (8–14px).
- **Vertical rhythm:** every vertical measure is a multiple of `s`. Each ritual occupies one staff system of 4s height + 3s padding. Text baselines snap to staff lines.
- **Horizontal rhythm:** a **bar = one week**, divided into 7 equal beats (Mon→Sun, following the locale's first day of the week). The bar width is `7 × 4s` minimum, and 4 bars are visible per line on desktop.
- **Left margin:** the clef and the ritual's name, as the instrument name in a score (Bodoni italic), 18s wide.
- **Bar lines** are 1px rules, with a **double bar** at month boundaries and **repeat signs** at the start and end of a season (linked to PROLOGUE when available).

*Why:* music notation is the original human system for writing repetition and rhythm, and the staff gives REFRAIN a precise, unmistakable rhythm.

## 5. Key screens

### 5.1 The score (home: this month)
```
┌ spine: [◖L•] REFRAIN · Rituals & habits          ⌘K            [ Mark today ] ┐
   REFRAIN                                                November · week 47
   The lines you come back to.                            [ ▶ Play this week ]
   ─────────────────────────────────────────────────────────────────────────────
               │ M  T  W  T  F  S  S │ M  T  W  T  F  S  S │ M  T  W  …
   Morning run 𝄞│ ♩  𝄽  ♩  ♩  𝄽  ♩  𝄽 │ ♩  ♩  𝄽  ♩  ♩  𝄽  𝄽 │ ♩  ♩  ·
   ════════════╪═════════════════════╪═════════════════════╪══════════════
   Call Mum   𝄞│ 𝄽  𝄽  𝄽  𝄽  𝄽  ♩  𝄽 │ 𝄽  𝄽  𝄽  𝄽  𝄽  ♩  𝄽 │ 𝄽  𝄽  ·
   ════════════╪═════════════════════╪═════════════════════╪══════════════
   Read 20 p. 𝄞│ ♩  ♩  ♩  𝄽  ♩  ♩  ♩ │ ♩  ♩  ♩  ♩  ♩  𝄽  ♩ │ ♩  ♩  ·
                                                             ↑ today
```
- **Rituals have a cadence:** daily, n times per week, or weekly on a day. A weekly ritual (Call Mum on Saturdays) shows rests on the other days *in grey* so that they don't read as misses. Only an expected beat that wasn't kept is a black rest.
- **Marking today:** the spine action marks today's note for the selected ritual, or tapping any beat toggles it (with undo).

### 5.2 A ritual's page
Programme notes: the ritual's name, why it matters (your words), its cadence, its "instrument" (the timbre used on playback: piano, marimba, strings, or soft bell), and a long view as the full score of the year, reduced to a dense line.

### 5.3 New ritual
One question per step in Bodoni: *What do you want to return to?* → *How often?* (daily · n per week · weekly on…) → *Why does it matter?* (optional) → *Choose its sound*. The staff draws in as you go.

## 6. Signature moment
- **2D (free):** *the score writes itself.* A kept beat places a notehead with a short ink-blot settle, and a completed week draws its bar line. **▶ Play this week** plays the week back (Web Audio API, synthesized, no samples to download): each ritual is a pitch in a pentatonic scale (so any combination sounds consonant) and each kept day is a note in time. A **playhead** moves across the bars and notes light up as they sound. The audio is never automatic, and the visual playhead conveys the same information silently.
- **3D:** not used. REFRAIN's immersion is **sound**. A paid mode adds richer synthesized instruments and a "year as a piece" playback (52 bars, about 90 seconds). The 2D score and basic playback are free.

## 7. Motion vocabulary
| Moment | Motion | Duration |
|---|---|---|
| Mark a beat | notehead scales 0.6 → 1 with ink settle; rest morphs into note | 220ms |
| Unmark | note fades back to rest | 120ms |
| Week complete | bar line draws top to bottom | 300ms |
| Playback | playhead moves at tempo (default ♩= 96), notes glow while sounding | tempo |
| New ritual | staff lines draw left to right, clef appears | 600ms |

## 8. Components unique to REFRAIN
Staff system (SVG + Bravura glyphs) · beat cell (toggle with ARIA `switch`) · bar / double bar / repeat signs · instrument picker · playback transport (play/stop, tempo, volume, mute) · programme-notes page · year-in-one-line score.

## 9. States
- **Loading:** empty staves with clefs.
- **Empty:** a single empty staff with a fermata: *"What do you want to return to? A refrain is anything you come back to: a run, a call, a page a day."* plus **New ritual**.
- **Misses:** rests are always neutral. After a long gap the copy reads *"A rest is part of the music. Pick up where you are."* There is never a broken-streak alarm.
- **Audio unavailable:** the play button shows *"Sound isn't available in this browser; follow the playhead instead."* and plays silently.

## 10. Mobile
One bar (a week) per screen width, swiping between weeks. Beats are 44px touch targets (the staff stretches vertically to fit). The spine's primary action **Mark today** opens a sheet listing today's expected rituals as large toggles.

## 11. Clarity checks
- **Forbidden patterns:** none. There are no streak flames, percentages or progress rings. The staff is the only visualisation.
- **Understandability:** the day letters above every bar, the plain legend "♩ kept · 𝄽 rest", and the first-run explanation ("Each line is a ritual. Each bar is a week. A note means you did it.") keep notation readable for people who can't read music.
- **5-second test:** *"These are my rituals for each day of the week; I can mark today."*
- **3 tasks:**
  1. Add a ritual "Read 20 pages, daily".
  2. Mark today's run as done.
  3. Play back this week.
