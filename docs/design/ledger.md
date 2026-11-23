# LEDGER — Design

Status: as built · ADR 0012 · Function line: *Money, kept plainly* · Door: `/ledger/`

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

### 5.1 The month (home: `/ledger/`, `/ledger/2026-11`)
```
┌ ⊐ Close the book          L E D G E R            ⌕  🔒  [ Add an entry ] ┐
│                         Money, kept plainly                              │
╞══════════════════════════════════════════════════════════════════════════╡
  THE MONTH   BUDGET
  [‹] November 2026 [›]
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

### 5.2 Budget (`/ledger/budget/<month>`)
The table lists each category with its limit (typed the short way, saved on Enter or on leaving the field), what was spent, and what is left, or "over by …" in red ink. A "With a limit" total sits under a double rule.

Further down the page:
- **Categories:** rename, put away (past entries stay), bring back, or add one for money out or in.
- **Reminder:** "Remind me on the 1st to set the month's budget" (off by default).
- **Import:** "Bring in a bank statement (CSV)".

### 5.3 Import (`/ledger/import`)
1. Choose a file.
2. Columns are guessed from the title row ("Tanggal", "Keterangan", "Jumlah"…) and can be changed.
3. Set two options: the first row is titles, and every row is money out.
4. A preview shows the first 8 rows, with "N rows ready · M left out".
5. **Write N entries**, with Undo.

## 6. Signature moment: the quick line
Writing a line takes under three seconds: type, glance at the preview, press Enter. The cursor stays in the line, so the next entry follows immediately. A correction sends the cursor straight back to the line, and next time the guess is right, marked *learned*. The rules are in `modules/ledger/src/quick.ts` and its tests.

## 7. Motion
Motion is almost none, on purpose:
- the line's offset shadow deepens on focus
- the "Add an entry" block presses in
- reduced motion removes both

## 8. Chrome and kit (its own site, ADR 0011)
- **The head of a ledger page:** the book's **clasp** with "Close the book" (exit), the spaced LEDGER title with its function line, search, the lock, and **Add an entry**, which focuses the quick line from anywhere.
- **Places** are set as folio headings: The month · Budget.
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
- The head keeps the clasp, title, search, lock and action, with the exit label carried by its accessible name.
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
