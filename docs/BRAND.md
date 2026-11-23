# ETERNALL — Brand

Status: draft for review · Phase 0 · Related: `VISION.md`, `DESIGN.md`, `design/*`

---

## 1. Brand architecture: a house and its imprints

ETERNALL is modelled on a **publishing house**. The house has one name, one promise (privacy) and one binding: the lifeline. Under it sit **imprints**, each with its own name, look and voice, the way a publisher runs separate lines with distinct covers.

```
                    ETERNALL — a private publishing house for your life
           (the lifeline · inscriptions · chapters · almanac, on the house's own pages)
                                       │
        ┌──────────────┬───────────┴──┬──────────────┬──────────────┐
     AMAZEEN         REFRAIN        KINDRED       MARGINALIA       CASHEEN
     journal+letters rituals        people        reading          money
```

**Since ADR 0011 (2026-11-23):** four apps, each its own site. ENVOI became AMAZEEN's Letters, FOLIO and ALMANACK became house pages (Chapters, Almanac), and PROLOGUE was retired. All four names are now reserved (§2).

**Endorsement rule:** each app stands entirely on its own. The house is not mentioned inside it (ADR 0011).
- **Inside an app** (its pages, icon, manifest, unlock card, onboarding): only the app's name and function line, in its own type. There is no "an ETERNALL imprint", no house mark or seal, and no house wordmark. The way back is the app's own exit ("Close the drawer", "Fine", "Back to the stacks", "Leave").
- **In the house** (lifeline, doors menu, search): **"AMAZEEN · Journal"**. The function always sits beside the name (see §4).
- **In legal, privacy and payment contexts:** *"AMAZEEN by ETERNALL"*, because ETERNALL is the house that keeps the data. The recovery kit is also named ETERNALL, since it opens the whole vault.

AMAZEEN keeps its existing name, wordmark and magazine identity. Its users should feel nothing was taken away.

## 2. Naming system (for every future imprint)

New imprints are named under these rules, so the family stays coherent as it grows:

1. **One word from the world of books, printing, writing or performance.** Examples of the register: *envoi, folio, colophon, errata, ledger, gazette, codex, verso, epilogue*.
2. **The meaning maps to the job.** The word should explain the imprint once you know it (*envoi* = a closing verse addressed to someone → a letter to your future self).
3. **Written as an all-caps wordmark** in product (`ENVOI`), and in sentence case in running text when needed for readability ("Open Envoi").
4. **Pronounceable on first sight in English**, with ≤ 3 syllables preferred. MARGINALIA is the deliberate exception, because its length is part of its bookish charm.
5. **No collisions** with existing imprint names, initials or first letters where avoidable (the doors menu uses the initial as a fallback glyph).
6. **Checked before launch** (§8).

Retired names: ENVOI, FOLIO, ALMANACK, PROLOGUE (ADR 0011) and **LEDGER** (renamed CASHEEN, ADR 0013); they still name old data paths and redirect old doors. Reserved names for possible future imprints: **COLOPHON** (about you, your profile and settings as a printed colophon), **ERRATA** (corrections and regrets, a reflection practice), **GAZETTE** (a yearly printed review), **LEDGER** (finances, only if it can honour the privacy and "not a dashboard" principles).

## 3. The imprints

Accent values come from the validated palettes in `design/<imprint>.md`.

| Imprint | Function line | What the name means | Tagline | Mark idea | Accent (light / dark) |
|---|---|---|---|---|---|
| **ETERNALL** | *Your life in weeks* | eternal + all; the final L runs on into a seal | **Keep a life.** | The long L ending in a wax-seal dot (existing) | seal `#b8321f` / `#e0553a` |
| **AMAZEEN** | *Journal* | "a magazine", and "amazing" | *The weekly magazine of your own life.* | Existing AMAZEEN masthead | press `#b92e1a` / `#ff6b55` |
| ~~ENVOI~~ (now AMAZEEN · Letters; reserved) | *Letters to your future* | the closing stanza of a poem, addressed to someone | *Write to the person you're becoming.* | A postmark ring with a date line | airmail red `#b3202f` / `#f06a5a` |
| ~~FOLIO~~ (now house · Chapters; reserved) | *Chapters of your life* | a sheet folded into pages; a bound volume | *Every life is a book. Name its chapters.* | A book spine with two gilt bands | bookcloth `#2f4a3a` / `#7fae8f` |
| ~~ALMANACK~~ (now house · Almanac; reserved) | *Measures & reflections* | the old almanac of days, moons and seasons | *A life, measured gently.* | A crescent inside an engraved circle | prussian `#1f3d6b` / `#9db4e8` |
| **REFRAIN** | *Rituals & habits* | the line that returns in a song or poem | *The lines you come back to.* | A repeat sign (𝄆 𝄇) | indigo `#3b3a8f` / `#a6a4ff` |
| ~~PROLOGUE~~ (retired; reserved) | *Hopes for the season* | the opening of a play, before the first act | *Every season opens with a prologue.* | A proscenium arch | curtain `#8e1b2a` / `#e05a6a` |
| **KINDRED** | *The people who matter* | of the same kind; family by blood or by choice | *Keep the people close.* | Two overlapping letterpress circles | press green `#1f5f5b` / `#6fc2b8` |
| **CASHEEN** (ADR 0012, renamed from LEDGER in ADR 0013; "cash" + the -EEN of AMAZEEN, its sibling) | *Money, kept plainly* | the accountant's book where every sum is entered | *Write it in one line.* | A ruled page with a double red rule | bookkeeper green `#2f5d3a` / `#8fc79b` |
| **MARGINALIA** | *Reading & underlines* | notes written in the margins of a book | *Everything you underlined, kept.* | A pencil bracket in a margin | marginal blue `#1d4ea8` / `#8db0ff` |

## 4. Plain words beside every name (a hard rule)

Imprint names are memorable because they are unusual, and that makes them unclear on their own. The rule:

- **Every navigation surface shows the name and its function line together**, for example "KINDRED · The people who matter". This applies to the doors menu, the dashboard, search results, first-run screens, and each app's own masthead and unlock card.
- **Buttons and actions never use the imprint's metaphor as the only label.** It's "Write a letter", not "Compose an envoi", and "New chapter", not "Bind a folio".
- The metaphor lives in visuals, headings and delight moments, never in the instructions.

## 5. The ETERNALL logo (existing assets)

The house mark already exists in `public/brand/`:

| File | Use |
|---|---|
| `wordmark-ink.svg`, `wordmark-paper.svg` | The logotype on light and dark grounds. Monoline engraved letters; the final L runs on into a vermilion seal: *a line that keeps going*. |
| `logomark.svg` | App icon / avatar: the long L and its seal on an ink square. |
| `logo-lockup.svg` | Mark + wordmark, for headers and documents. |
| `maskable.svg`, `icon-*.png`, `apple-touch-icon.png` | Platform icons. |
| `og-image.png` | 1200×630 social card. |

Clear space equals the height of the seal dot × 3. The seal is always vermilion and never recoloured. It belongs to the house's own pages and never appears inside an app (ADR 0011).

**App marks** (`apps/web/public/icons/`) carry no house mark at all:
- **AMAZEEN** keeps its own monogram.
- **REFRAIN** is a beamed pair of notes on a staff, in indigo.
- **KINDRED** is a tabbed index card with a coral star, in press green.
- **MARGINALIA** is a page with a red margin rule, a highlighted line and a pencil note, in marginal blue.
- **CASHEEN** is a ruled ledger page with a double red rule and figures, in bookkeeper green.

Each app provides an SVG, PNGs at 180, 192 and 512 px, and a maskable 512.

## 6. Voice

One voice for the house, with a slight accent per imprint.

**The house voice:** warm, literate, unhurried and exact. It writes like a thoughtful editor and never like a growth marketer.

| Do | Don't |
|---|---|
| "Sealed until 20 November 2031." | "🎉 Awesome! Your capsule is all set!" |
| "Nothing inscribed this week. Most weeks slip by like this." | "You broke your streak! Don't give up!" |
| "This can't be undone." | "Are you sure? This action is irreversible and permanent." |
| "Everything stays on this device." | "We take your privacy very seriously." |

**Rules:**
- **Sentence case** everywhere except imprint wordmarks.
- **No exclamation marks** in product copy, and no emoji in UI chrome.
- **Errors say what happened and what to do next**, without blame. ("That date is before you were born." not "Invalid input.")
- **Numbers are exact where it matters** (dates, counts) and **gentle where it doesn't** ("about four thousand weeks").
- **Never guilt or nag.** Absence is normal, and the copy says so.

**Imprint accents:**

| Imprint | Accent of voice | Example |
|---|---|---|
| AMAZEEN | newsroom-wry, deadline-aware | "Going to press Sunday at midnight." |
| ENVOI | intimate, second person, patient | "It has waited 378 days for you." |
| FOLIO | literary, retrospective | "Every chapter ends. This one is still being written." |
| ALMANACK | observational, slightly antique | "Summers ahead: 56." |
| REFRAIN | rhythmic, kind about misses | "A rest is part of the music." |
| PROLOGUE | theatrical but brief | "The curtain rises on winter." |
| KINDRED | warm, attentive to people | "You last saw Ana in March." |
| MARGINALIA | bookish, quiet | "Underlined on page 112." |

## 7. Language

v1 copy is **English**. All strings live in per-imprint message catalogues (see `ARCHITECTURE.md`), so a translation such as Indonesian can be added without touching components. Imprint names are never translated.

## 8. Before public launch: name and domain checks (owner: product)

These checks need legal and commercial judgement, so they are listed here as **TODOs for the owner**, not decisions:

- [ ] Trademark search for ETERNALL and each imprint name in target markets (at minimum Indonesia (DJKI), US (USPTO), EU (EUIPO)) in classes 9 (software) and 42 (SaaS).
- [ ] Domain: primary `eternall.app` (or alternative), and redirect-only marketing domains per imprint where available (e.g. `amazeen.app`, which already exists for AMAZEEN, and `envoi.app`). All of them redirect to `/<imprint>` on the primary origin (see `ARCHITECTURE.md` §2).
- [ ] **CASHEEN** first (ADR 0013): it ships at launch beside AMAZEEN. Check "casheen" for marks in finance and software classes (9, 36, 42) and for close sound-alikes, plus `casheen.app`.
- [ ] App store name availability (for the later Capacitor builds).
- [ ] Social handles for ETERNALL (imprints do not get separate social accounts in v1).
- [ ] Confirm all imprint fonts are under licences that allow self-hosting and app embedding (current picks are all SIL OFL or Apache 2.0; see `design/*`).
