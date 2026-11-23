# ADR 0012 — LEDGER: a fifth app for personal money, sold on writing it down in one line

Status: Accepted · Date: 2026-11-23 · Builds on: ADR 0011 (apps as their own sites), ADR 0010 (no cloud AI), ADR 0002 (one vault)

## Context
The owner wants personal money tracking: a monthly budget and a daily record of money in and out, for themselves only.

It sits a little apart from the house's purpose (remembering a life), and `VISION.md` rules out quantified-self dashboards. Privacy, though, is exactly where ETERNALL is strong, and money is among the most sensitive data a person keeps.

The one thing to sell: **writing an entry down is effortless.**

## Decision

**A fifth app, LEDGER ("Money, kept plainly"), at `/ledger/`.** It is its own site like the other four, with its own chrome, kit, unlock card, icons and manifest. The manifest includes an "Add an entry" shortcut.

**Rupiah only, whole numbers.**

**The quick line is the product.** One line, typed like a message to yourself, is read on the device by plain rules (`modules/ledger/src/quick.ts`):
- **Amounts:** `25rb`, `25.000`, `1,5jt`, `Rp 25.000`.
- **Days:** "kemarin", "sabtu", "3 hari lalu", "1/11"; a date without a year is never in the future.
- **Income** is recognised by its words ("gaji", "cashback") or a leading `+`.
- **Category** comes from a built-in Indonesian and English word list, overridden by what you have taught it.

Behaviour:
- A live preview shows every part, and each part is one tap to correct.
- Enter writes the entry, with Undo. Corrections are learned and kept as `ledger/words` in the vault.
- Entries written often appear as one-tap chips. Several pasted lines are written together.

**Budget.** Each month's limits start from the last month that had any. Going over is said plainly ("over by Rp 35.000") in red ink. There are no scores, streaks, gauges or charts.

**Amounts never leave LEDGER.** The house sees counts only: the Almanac shows "Months kept in LEDGER this year" and "Entries written this year". Nothing reaches the lifeline, week panel or house search.

**Import** reads a bank's CSV on the device (column mapping and preview), and the file itself is never kept.

**Reminders.** An opt-in local reminder on the 1st says "Set the budget for <month>".

## Consequences
- **New records:** `ledger/entry`, `ledger/category` (seeded with defaults on first change), `ledger/budget` (one per month), `ledger/words`, `ledger/pref`.
- **Two new self-hosted fonts:** Libre Caslon Text and DM Mono.
- **No new runtime dependency** and no network use.
- **Not included:** accounts and wallets, recurring entries, investments, charts and bank connections. Bank connections would put a third party in the data path, which `PRIVACY.md` forbids.

## Alternatives considered
- **A feature inside AMAZEEN:** rejected. Money is daily and practical, and would crowd the journal.
- **A separate product:** rejected for this scope (a budget and a daily record). The vault, sync and lock already fit.
- **Voice or receipt-photo input:** rejected for now. Chrome's speech recognition sends audio to a server. On-device OCR could come later under ADR 0010.
- **Natural-language parsing with an AI model:** rejected (ADR 0010). Plain rules plus learned words are enough and stay on the device.
