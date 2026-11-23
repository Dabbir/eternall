# CASHEEN — Design

*Formerly LEDGER (renamed 2026-11-24, ADR 0013). The name is "cash" with the -EEN ending it shares with AMAZEEN: the money book beside the journal. Its look, the bound ledger, is unchanged, and its data still lives under `ledger/*`.*

Status: as built · ADR 0012, ADR 0013 · Labelled *Money* in the app picker · Function line: *Money, kept plainly* · Door: `/casheen/`

## 1. Metaphor
**An accountant's bound ledger.** Pale green paper ruled in blue, with a double red rule before the money columns. Figures stand right-aligned in black ink, and red ink appears only for going over. You open the book, write a line, and close the book.

*Moodboard in words:* a cashbook on a shop counter; a fountain-pen tick; the double underline under a month's total; a brass clasp.

## 2. Palette (validated: body text ≥ 7:1, secondary ≥ 4.5:1, accent ≥ 4.5:1)

| Token | Light | Dark |
|---|---|---|
| `--paper` | `#eef1e4` | `#111611` |
| `--ink` | `#1d241c` | `#e6ecdf` |
| `--ink-2` / `--ink-3` | `#485243` / `#5c6756` | `#b4bfac` / `#939e8b` |
| `--accent` (bookkeeper green) | `#2f5d3a` | `#8fc79b` |
| `--red` ("over" only, always with words) | `#a3302a` | `#f0857a` |
| `--ruling` / `--margin-red` | blue 28% / red 55% | blue 20% / red 45% |

Red is never the only signal. "Over by Rp 35.000" is always written out, so the palette is safe for colour-vision deficiency.

## 3. Typography
- **Libre Caslon Text** for words: titles, the month, particulars, buttons.
- **DM Mono** (tabular) for every figure and for the quick line itself, so what you type looks like what gets written.
- Small caps are set with `font-variant-caps`, never uppercase (`DESIGN.md` §10).

## 4. Space and grid
- **The ruled page.** One row is 2.25rem, and every table row sits on a ruling.
- **Columns.** A narrow italic date column behind a single red rule; particulars; then In and Out, right-aligned behind a double red rule.
- **The page** is 980px max: a book page, not a dashboard.

## 5. Key screens

### 5.1 The month (home: `/casheen/`, `/casheen/2026-11`)
```
            L E D G E R   Money, kept plainly                       ┃ ⊐ Close the book
╞═══════════════════════════════════════════════════════════════════╡ ‹ 2026 ›
  [‹] November 2026 [›]                                             ┃ (J)(F)(M)…(N)  D
                                                                    ┃ Budget · Your words
                                                                    ┃ ⌕ 🔒 [+ Add an entry]
  WRITE ONE LINE
  ┌──────────────────────────────────────────────────────────┬──────────┐
  │ ✎ grab 32.500 kemarin                                    │ Write it │
  └──────────────────────────────────────────────────────────┴──────────┘
  [OUT] [Rp 32.500] [Transport ▾] [22 Nov 2026] [“grab”]     ← each part is a control
  ─────────────────────────────────────────────
  IN Rp 8.000.000    OUT Rp 577.500    KEPT Rp 7.422.500
  ═════════════════════════════════════════════
  Budget: Rp 32.500 left of Rp 160.000 · Food over by Rp 35.000
  DATE  │ PARTICULARS                 ║        IN │      OUT
  23 Nov│ makan siang  Food           ║           │   45.000
        │ kopi  Food                  ║           │   25.000
  ...
  CARRIED TO THE MONTH'S TOTAL        ║ 8.000.000 │  577.500
  ═════════════════════════════════════════════
```
- **Empty state:** an empty ruled page with "Try typing `kopi 25rb` above and pressing Enter."
- **Chips:** entries written twice or more in 90 days appear under the line ("kopi 25rb").
- **Correcting:** tapping an entry opens it on a ledger leaf to correct it or **Cross it out** (with Undo).

### 5.2 Budget (`/casheen/budget/<month>`)
The table lists each category with its limit (typed the short way, saved on Enter or on leaving the field), what was spent, and what is left, or "over by …" in red ink. A "With a limit" total sits under a double rule.

Further down the page:
- **Categories:** rename, put away (past entries stay), bring back, or add one for money out or in.
- **Reminder:** "Remind me on the 1st to set the month's budget" (off by default).
- **Import:** "Bring in a bank statement (CSV)".

### 5.3 Import (`/casheen/import`)
1. Choose a file.
2. Columns are guessed from the title row ("Tanggal", "Keterangan", "Jumlah"…) and can be changed.
3. Set two options: the first row is titles, and every row is money out.
4. A preview shows the first 8 rows, with "N rows ready · M left out".
5. **Write N entries**, with Undo.

## 6. Signature moment: the quick line
Writing a line takes under three seconds: type, glance at the preview, press Enter. The cursor stays in the line, so the next entry follows immediately. A correction sends the cursor straight back to the line, and next time the guess is right, marked *learned*. The rules are in `modules/casheen/src/quick.ts` and its tests.

## 7. Motion
Motion is almost none, on purpose:
- the line's offset shadow deepens on focus
- the "Add an entry" block presses in
- reduced motion removes both

## 8. Chrome and kit (its own site, ADR 0011)
- **The thumb index** (the navigation, fixed to the right edge, 64px; 46px on a phone): the book's **clasp** with "Close the book" (exit) at the top; the year with ‹ ›; **twelve half-moon month notches**, so any month is one tap away (the open month stands out in green; months still to come are dashed but open, to plan their budget, and say "December hasn’t begun"); the pages **The month**, **Budget** and **Your words** as tabs, so Budget always leads back to writing; then search, the lock and **Add an entry**, which focuses the quick line from anywhere. On the budget page the notches open that month's budget. Nothing in the index is ever squeezed: in a short window it scrolls.
- **The page** carries only a running head: the spaced CASHEEN name and its function line over a double rule.
- **`theme/ledger.kit.css`:**
  - Buttons: square, Caslon bold.
  - Fields: ruled lines.
  - Dialogs: ledger leaves with a double red margin and blue ruling.
  - Toasts: a mono slip with a green offset.
  - ⌘K highlight: a green edge.
  - Unlock card: "The book is closed."

## 9. States
- Loading: the house's quiet loader.
- Empty: the empty ruled page.
- Error: field messages in plain words, such as "Write an amount, like 25rb or 25.000." or "That limit isn't an amount."
- Storage failure: the house banner.

## 10. Mobile
- The thumb index stays on the right edge, narrowed to 46px; the clasp and action drop their words and keep their accessible names. The month title stays on one line with its ‹ › and the ruled page tightens to fit beside the index.
- Totals wrap to two columns.
- Particulars stack note over category.
- The quick line stays first on the page, and `enterKeyHint="done"` gives phone keyboards a done key.

## 11. Clarity checks
- **5-second test:** "a money book; I can write a line here."
- **3 tasks:**
  1. Write "kopi 25rb".
  2. Set a Food limit for this month.
  3. Correct yesterday's entry's category.
- **Forbidden patterns:** no KPI tiles, gauges, progress rings, charts or streaks.

## 12. Ceremony (`DESIGN.md` §5.1)
**Entered.** On writing an entry: the sum written digit by digit in DM Mono, then ruled off with a double line in red pen (green ink and rule for money in), with "Out · Food" beneath. It lasts 600ms and is see-through, and the cursor stays in the quick line, so the next entry can be typed while it plays. Several lines or an import show one sum ("3 entries · net out"). `app/Ceremony.tsx`.

## 13. Your words (`/casheen/words`)
Your own shorthand for the quick line. Built-in words keep working; yours are added on top.

- **Amount words:** units (`rebu` → × 1.000, `jeti` → × 1.000.000, typed glued or apart) and words that stand for a sum (`goceng` → Rp 5.000, `ceban` → Rp 10.000). A small count before a sum multiplies it ("2 ceban" → Rp 20.000).
- **Day words:** today, yesterday, two days ago, or the last Monday…Sunday (`semalem`, `tadi`, `sab`).
- **Money-in words:** words that make an entry money in (`cair`, `dapet`).
- **Words it has learned:** the category memory made visible. Each word can be pointed at another category or forgotten, and "Forget everything it learned" asks first and offers Undo.

How it stays honest:
- **One meaning per word.** A word can't collide with a built-in word of another kind ("“kemarin” already means a day") or repeat one ("“rb” is already understood").
- **The preview shows it.** When your words are used, the quick line says how it read them, in the order typed: "your words: goceng → Rp 5.000 · semalem → yesterday".
- **Try a line** at the top of the page shows any line's reading.

The rules are in `src/terms.ts` and `src/quick.ts`, with tests in `terms.test.ts`.

