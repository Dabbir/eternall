# ETERNALL

**Your life, in weeks.** A private, local-first archive that lays out every week of your life on a single page. Inscribe the weeks worth keeping, name the chapters of your life, and seal letters that can't be opened until the week they're addressed to.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 46 unit + integration tests
npm run build      # type-check + production build
npm run dev:api    # local sync + licence API (wrangler, :8788; Vite proxies /api)
```

Choose **Explore a sample life** on the welcome screen to see a fully populated archive, then erase it from Settings when you're ready to start your own.

## What it does

| Screen | Purpose |
| --- | --- |
| **Lifeline** | Canvas grid of every week (one row = one year, birthday to birthday). Three lenses: *Moments* (tone of your memories), *Chapters*, *Plain*. Click or use the arrow keys to open a week. |
| **Archive** | Every inscription grouped by year of life, with full-text search and tone filters. |
| **Capsules** | Letters to your future self. A sealed letter is fingerprinted with SHA-256 and cannot be read or edited until its date. Opening it verifies the seal. |
| **Chapters** | Named eras of your life. No overlaps allowed. Shown as a life bar and as colours on the lifeline. |
| **Almanac** | Weeks lived and remaining, life measured in other units, *Echoes* (memories from this same week in earlier years), streaks, and charts. |
| **Settings** | Profile, theme (paper / night / system), JSON backup and restore, erase. |

**⌘K / Ctrl+K** opens the command palette: actions, navigation, memory search, or a date (`YYYY-MM-DD`) to jump to that week.

## Architecture

```
src/
  domain/      pure logic, no React: week math, validation, stats, capsules (unit-tested)
  store/       reducer + persistence (localStorage, versioned, validated on load and import)
  lib/         router (hash + View Transitions), formatting, theme, ids
  components/  design-system primitives (Button, Field, Dialog, Toast, Seal, Logo…)
  features/    one folder per screen, plus editors/ (all dialogs) and shell/
  styles/      tokens.css (colour/type/motion), base, components, app
```

- **Date math** works in whole UTC day numbers, so daylight saving can't shift a week. Leap-day birthdays fall on 28 Feb in common years.
- **Untrusted data** (stored archives, imports) goes through `readArchive`, which rejects malformed input and drops unknown fields. Damaged storage opens a recovery screen and is never overwritten silently.
- **Accessibility**: native `<dialog>` handles focus trapping. The lifeline is keyboard navigable with a live region. Charts include a table view. Reduced-motion preferences are respected. The tone palette was checked for colour-vision deficiency in both themes.
- **Dependencies**: React only. No router, state, UI, or animation libraries.

## Brand assets

`public/brand/` holds the wordmark (ink and paper versions), the logomark, a lockup, and a maskable icon. PNG icons, `apple-touch-icon.png`, `og-image.png` (1200×630), and `site.webmanifest` are wired up in `index.html`.
