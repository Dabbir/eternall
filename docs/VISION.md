# ETERNALL — Vision

> **ETERNALL is a private publishing house for your life.**
> Each of its imprints helps you keep one part of a life (your weeks, your words, your letters, your people, your chapters) and binds them all into a single, quiet picture of the time you've had and the time you have left.

Status: accepted · Owner: product · **Launch scope and the first product: `PRODUCT.md` (ADR 0013).** This page is the long view; where they differ on what ships first, `PRODUCT.md` wins.

---

## 1. The problem

A life leaves traces everywhere, and they are scattered and borrowed.

- **The traces live in other people's products.** Photos sit in one cloud, notes in another, habits in a streak app, books in a social network, and letters nowhere at all. Each app keeps its own fragment, and none of them shows the whole.
- **The tools are built for output, not for meaning.** Most "productivity" software optimises tasks, streaks and dashboards. Very little helps you *notice* your life: what a year was about, who mattered, what you hoped for and whether it came true.
- **The most personal writing carries the biggest privacy cost.** A journal, a letter to your future self, and notes about the people you love are the most sensitive things you will ever write. Most services ask you to trust their servers with them.
- **Time is abstract until you can see it.** "Four thousand weeks" is a statistic. A page with every one of your weeks on it is a feeling.

## 2. What ETERNALL is

ETERNALL is **one place, with many doors**. Each app is a complete product with its own name, look, layout and character, and it feels like its own site: it carries no trace of the house (ADR 0011).

| | What it keeps | The object it borrows from |
|---|---|---|
| **ETERNALL** (the house) | the overview: your life in weeks, plus inscriptions, the chapters of your life, and an almanac of your time | an atlas / ledger with a wax seal |
| **AMAZEEN** | your journal, pressed into a weekly magazine, and letters to your future self, sealed in its post room | a magazine and its post room |
| **REFRAIN** | the rituals you return to | a musical score, a repeated verse |
| **KINDRED** | the people who matter | an address book, letterpress cards |
| **MARGINALIA** | what you read, watch and underline | an annotated page, a card catalogue |
| **CASHEEN** (formerly LEDGER) | your money, in and out, and a monthly budget, written in one line | an accountant's bound ledger |

**Launch (ADR 0013):** AMAZEEN is the first product and the way in, with CASHEEN (formerly LEDGER, labelled *Money*) beside it as a parallel product. REFRAIN, KINDRED and MARGINALIA are built but opt-in, and the lifeline is optional, never a new person's first page. Apps share the vault, not data: money never reaches the house.

*Consolidated on 2026-11-23 (ADR 0011):* ENVOI became AMAZEEN's Letters, FOLIO and ALMANACK became house pages, and PROLOGUE was retired, with its seasons kept as inscriptions.

You can use a single imprint on its own, for example AMAZEEN as a journal and nothing else. When you use two or more, ETERNALL offers to bind them together on the lifeline.

## 3. Positioning

- **For** people who want to remember their lives deliberately, and who care where their most personal words are kept,
- **ETERNALL is** a private, local-first collection of beautifully made tools for keeping a life,
- **that** turns scattered days into a single, legible picture: weeks lived, chapters named, people kept close, letters waiting.
- **Unlike** general note apps, habit trackers or social journaling platforms, every imprint is designed around one human ritual, and **nothing you write is readable by anyone but you**, including us.

Short forms:
- *Tagline:* **Keep a life.**
- *Descriptor:* *A private publishing house for your life.*

## 4. Three principles

Every product, design and engineering decision is tested against these three. If a feature violates one, it does not ship.

### 4.1 Everything can contribute to the lifeline (when it fits)
*Amended by ADR 0013:* not everything has to become part of one story. A journal needs an archive that is easy to read and money needs fast input; money contributes nothing to the house at all.

The week is the shared unit of time. Every imprint leaves a trace on the week it belongs to: a journal issue, a sealed letter, a ritual kept, a person met, a book finished. ETERNALL's lifeline is where those traces meet.
*Test:* "Which week does this belong to, and what does it add to that week?" A feature that has no answer is probably a feature for a different product.

### 4.2 Privacy for everything, not just the journal
ETERNALL has one encrypted vault for the whole platform. Your content is encrypted on your device, it syncs end-to-end encrypted, and there are no accounts, ads or tracking. We say plainly what we *cannot* protect, too (see `PRIVACY.md`).
*Test:* "Could we, or anyone who breaches us, read this?" The answer must be no.

### 4.3 Bold on the surface, clear in the hand
Every imprint looks and moves like its own publication: unique, unexpected, crafted, sometimes three-dimensional. Every imprint is also immediately understandable: plain words, predictable controls, one clear action per screen (see `DESIGN.md`).
*Test:* "Is this unforgettable?" and "Would a first-time visitor know what to do within five seconds?" Both must be yes.

## 5. How people arrive and grow

ETERNALL is built for people who come in through **one door**, not through the platform.

```
 Arrive through one imprint          Discover a second            Bind them together
 ───────────────────────────         ──────────────────           ───────────────────
 eternall.app/amazeen        ──▶     a gentle suggestion   ──▶    ETERNALL offers the
 installs as "AMAZEEN"               inside AMAZEEN:              lifeline: every issue,
 focus mode, nothing else            "Seal this week's            letter and chapter on
 to learn                            cover story as a             one page of weeks
                                     letter to next year?"
                                     → AMAZEEN · Letters
```

1. **Arrive.** Someone opens an imprint directly by link, install or recommendation. They meet that imprint's own onboarding and its own visual world, with no platform tour and no birth date asked.
2. **Settle.** The imprint works completely on its own. Most people may stay here for a long time, and that is a success, not a failure.
3. **Discover.** Inside the imprint, a contextual and dismissible suggestion points to a neighbouring imprint when it would genuinely help. Discovery is never forced and never repeated once dismissed.
4. **Bind.** Once two imprints are in use, ETERNALL offers the lifeline. Only then do we ask for a birth date, because the lifeline is the only thing that needs it.
5. **Keep.** Over years, the lifeline becomes the most honest record of a life you'll own.

## 6. What ETERNALL is not

Saying no is part of the design.

- **Not a to-do or project manager.** No tasks, deadlines or kanban.
- **Not a second brain or wiki.** No backlinks graph, databases or templates marketplace. Notion and Obsidian do that well.
- **Not social.** No feeds, likes, followers or public profiles. Sharing, when it comes, is one-to-one and deliberate (for example a future letter to a loved one).
- **Not an AI writer.** No AI in v1. Any future AI runs on your device and never sends your words anywhere.
- **Not a quantified-self dashboard.** The Almanac measures gently, as reflection, never as performance. There are no scores, rankings or guilt.
- **Not an engagement machine.** No streak-shaming, dark patterns or notifications designed to pull you back. Reminders are local, opt-in and kind.

## 7. People we design for

| Persona | Who they are | Arrives through | What success looks like |
|---|---|---|---|
| **The Keeper** | Mid-30s. Has journaled on and off for years, in paper notebooks and abandoned apps. Wants the habit to stick and the archive to feel worth keeping. | AMAZEEN | A shelf of weekly issues they actually reread. Six months later they name their first chapter. |
| **The Parent** | New parent who wants to remember the years that blur together and leave something for their child. | AMAZEEN · Letters | Letters sealed for their child's 18th birthday (when sending to others ships), plus a lifeline that shows the early years at a glance. |
| **The Transitioner** | Just moved city, changed career or ended something. Feels the need to mark a "before" and "after". | ETERNALL · Chapters | A named chapter, a letter sealed to the person on the other side of it, and the lifeline marking the turn. |
| **The Reader** | Reads widely, underlines everything, loses all of it. | MARGINALIA | Their highlights found again years later, surfacing in AMAZEEN's "Overheard" page and on the lifeline. |
| **The Privacy-minded** | Won't write anything personal into a cloud service. Has read the threat model. | Any imprint | Trusts ETERNALL enough to write the truth, because the architecture makes that rational. |

### Scenarios
- *A Sunday evening:* AMAZEEN presses the week's issue. On the lifeline that week takes the colour of its mood, and REFRAIN has added three marks for the runs kept.
- *A birthday:* AMAZEEN unseals a letter written five years ago. The Almanac notes how many summers have passed since, and the letter mentions someone now kept in KINDRED.
- *A turning point:* a new chapter is named in the house, and the lifeline changes colour from that week on.

## 8. Module map

- **ETERNALL** is the house and the overview. It holds the lifeline (every week of a life on one page, or as a 3D coil you can travel along), inscriptions, **Chapters** (the eras of your life as books on a shelf, colouring the lifeline), the **Almanac** (gentle measures, echoes of earlier years), the vault, and the doors to the apps. It never appears inside an app.
- **AMAZEEN** turns everyday writing (stories, notes, quotes, lists) into a laid-out weekly magazine issue every Sunday. It already exists (v1.4) and keeps its identity and its loyal users.
- **AMAZEEN · Letters** (once ENVOI) holds letters to your future self. A letter is fingerprinted, sealed, and unreadable, even to you, until its day arrives.
- **REFRAIN** holds the rituals you return to, each written as a line in a score. A week of rituals becomes a short melody you can play back.
- **KINDRED** keeps the people who matter: when you last saw them, what you've shared, the dates you shouldn't forget. They can be mentioned in AMAZEEN's pieces and letters.
- **CASHEEN** (ADR 0012, formerly LEDGER) keeps your money plainly: a daily record of money in and out, written in one line like a message to yourself ("kopi 25rb"), and a monthly budget. Amounts never leave it.
- **MARGINALIA** keeps what you read, watch and listen to, and the lines you underlined, filed like a card catalogue.

The data model, contributions to the lifeline and cross-links for each imprint are in `MODULES.md`.

## 9. How we'll know it's working

ETERNALL does not track people (no analytics in v1), so success is measured only through signals that respect that.

| Signal | Source | Target (first 12 months after Release 1) |
|---|---|---|
| People who keep coming back without being nagged | Voluntary, anonymous check-ins we ask for in-app ("How is ETERNALL fitting into your life?"), at most twice a year | Majority report it "fits naturally" |
| Imprints per person | Same opt-in check-in | A meaningful share uses ≥ 2 imprints, and the lifeline is opened by those who do |
| Sustainable business | Count of active anonymous licences (the only thing the server knows) | Covers infrastructure and ongoing development |
| Trust | Independent review of the privacy architecture, public issue reports | Review completed before Release 1, and no content-exposing vulnerability |
| Craft | Accessibility audits (axe, WCAG 2.1 AA), performance budgets in CI, design review against `DESIGN.md` | Zero critical accessibility issues, and budgets green on every release |
| Existing AMAZEEN users | Migration success in-app (local, not reported) and support messages | No AMAZEEN user loses data or their familiar experience |

What we explicitly won't optimise: time-in-app, daily active streaks, notification open rates.

## 10. Open questions (to be resolved in later docs)

- Pricing, currency and exactly which features sit in the paid tier → `BUSINESS.md`.
- How letters to *other people* work without breaking zero-knowledge → `PRIVACY.md`, `MODULES.md` (designed now, built later).
- Final wordmarks and accent colours for each imprint, plus trademark and domain checks → `BRAND.md`.
