# ADR 0016 — ROUTEEN's sky in full

Status: Accepted (built 2026-11-24; the owner approved the design spec) · Date: 2026-11-24 · Amends: ADR 0015 §4 (front-page sections) · Spec: `docs/superpowers/specs/2026-11-24-routeen-sky-in-full-design.md` · Design: `docs/design/routeen.md`

## Context
The owner was not satisfied with ROUTEEN's interface after ADR 0015, and named three things:
- **The sky sat in a box.** It was a rounded card with a small arc on its left half.
- **Chips jumped when tapped.** A lit practice moved from *Not yet today* into *For now*, and the tier buttons appeared after a lit chip and pushed the next chips onto another line.
- **The concept did not feel real.** Lighting a practice recoloured a pill; the sky never changed. The year read as a contribution grid, and the practices as underlined links.

## Decision
1. **The sky is the page.**
   - A band spans the page under the app bar, which wears the same `--sky-top`.
   - The arc runs horizon to horizon, and the sun stands at the current time.
   - The band's foot fills toward its full colour as the day is lit (`FrontPage.glow`, lit ÷ due). This is never shown as a number.
   - The weather (Low energy, Day off) lies over the whole band.
2. **Every practice is a body at a fixed place** (`placement.ts`).
   - Its time of day picks a third of the arc; any-time practices rest along the horizon.
   - Within a zone, bodies alternate between the arc and an outer orbit.
   - Placement is pure and stable: a mark never moves a body, and a new practice moves only its own zone.
   - Bodies are drawn as SVG shapes (ring, ◐, ☀︎, ✺, ✦), named on the sky while there are 12 or fewer, and hidden from screen readers. The band is one `role="img"` named in words.
3. **Lit plays in place:** the body rises, blooms and settles in ≤ 700ms. When the band is out of view, the house's Lit moment plays instead. Under reduced motion, nothing plays.
4. **Rows instead of chips, grouped by time of day in a fixed order:** Morning · Midday · Evening · Any time, then Also today, with a "now" marker on the current part.
   - Each row always shows its three tiers (◐ ☀︎ ✺). Tapping one lights at that tier; tapping the lit tier unlights it.
   - A row's size never depends on its state, so nothing on the page moves when something is lit.
   - This replaces *For now · Not yet today* (ADR 0015 §4). The evening recap keeps **All as planned** above the groups, and a Day off says so in one line above them.
5. **The Sky, a day and a practice use the same language.**
   - A shorter band on each.
   - Week tiles become small skies.
   - The year becomes a strip of sky with points: a lit day is its shape, a day off a star, an expected day with no light a faint ring.
   - The practices become rows showing their time of day and lit days.
6. **Dark skies are clear:** both ends of every dark sky have HSL saturation ≥ 0.25, and every accent stays ≥ 3:1 against both ends as a body (tested in `look.test.ts`).

## Consequences
- `front.ts` loses `forNow`, `notYet` and `ifYouLike`, and gains `groups`, `glow` and `groupByTime`.
- New modules: `placement.ts` (pure, tested) and the components `Body`, `SkyBand`, `PracticeRow` and `YearStrip`. `Chip` and `SunArc` are gone.
- No data, rule, dependency or contribution changed. Records stay under `refrain/*`.
- Pages carry `.rs-page`: the band spans the page, and every other child keeps the 1040px reading column through one margin rule.

## Alternatives considered
- **The sky as the only place to tap.** The most literal, but small touch targets on a phone, colliding labels and an awkward keyboard path.
- **A light fix** (remove the box, freeze the order). Fast, but it leaves the concept as unreal as before.
- **Keep *For now* and freeze membership.** A practice lit in the morning would read as *Not yet today* at midday; grouping by time of day says the same and never lies.
