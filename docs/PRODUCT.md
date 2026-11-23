# ETERNALL — Product definition (one page)

Status: accepted 2026-11-24 · ADR 0013 · Read with `VISION.md` (the long view) and `ROADMAP.md` (the order of work)

## The first product is AMAZEEN

**AMAZEEN is a private journal that turns everyday notes into a personal weekly issue you will want to read again.**

> **Write as usual. See your week again in a form you want to keep.**

### Who it is for first
People who have tried journaling but rarely read their journal again, who care where their most personal words are kept, and who like their things to feel made for them.

### The problem it solves
Journals get written and then never reread. Entries pile up in a list nobody opens, so the writing stops feeling worth it.

### Why they come back next week
- **The weekly issue.** On Sunday the week's entries are pressed into an issue with a cover: something to open, not a list to scroll.
- **The shelf.** Past issues stand on a shelf. Finding an old week is a matter of taking an issue down.
- **Their own edition.** A few ready-made looks and a small set of choices (accent, typeface, text size, density) make the issue theirs. None of it is needed before writing.

### How it should feel
- **Writing feels familiar.** Make a note, edit, save, search and go back the way every app does it.
- **The result feels unlike anything else.** The issue, the cover, the shelf, the type and the "Filed" moment carry the character.
- **Motion means something and never blocks work.** Saving, typing and moving between screens stay instant. 3D is an optional view; the flat view does everything, and reduced motion is respected.

## The family behind it

```
ETERNALL: a private personal toolkit
├── Journal: AMAZEEN    first product, the way in
├── Money: CASHEEN      a parallel product, opened directly
├── Practices: REFRAIN  later
└── Lifeline            optional: time across apps, once there is enough of it
```

- **AMAZEEN helps people reflect on their life. CASHEEN helps them manage everyday money.** They sit in one product because both are personal and both need strong privacy, but their jobs differ. Someone who only wants to track money opens CASHEEN directly, without learning about the journal or the lifeline.
- **CASHEEN is the first companion**, made available as AMAZEEN's core flow proves itself. It stays focused on writing an entry in one line and a monthly budget. Bank links, investments and anything complicated wait.
- **People and Reading (KINDRED, MARGINALIA) and Practices (REFRAIN)** exist in the code and can be switched on in Settings, but they are not part of the launch and are not marketed until people ask for them.
- **The lifeline is optional.** It is never the first page for a new person. It is offered once there is something to show, and only when they choose it.

## Firm boundaries between apps
Apps share foundations, not data:
- **Shared:** the encrypted vault, export, recovery, the lock and security settings, and the basic way controls work (back, search, save, lock).
- **Not shared:** an app never reads another app's content automatically. AMAZEEN does not see transactions. The lifeline and the house never show amounts, categories or spending habits; CASHEEN contributes nothing to them. A person who wants to reflect on money writes that in the journal themselves.

## Launch scope
**In:** AMAZEEN (Journal) and CASHEEN (Money), the vault and lock, export and recovery, personal looks for AMAZEEN, and the installable app on phone and desktop.

**Not in launch:**
1. All apps at once. The others stay switched off until a person turns them on.
2. The lifeline as a home page for new people.
3. Making everything fit the "life in weeks" idea. A journal needs an archive that is easy to read; money needs fast input.
4. Looks, animation or setup as a condition for writing.

## The privacy promise
- Everything is stored on the device, encrypted. Nothing you write is sent for analytics or to cloud AI.
- Export and basic recovery are never behind a subscription.
- **Across devices:** phone and desktop use is promised only once end-to-end encrypted sync is ready to use. Until then the product says plainly that it works on one device, with an encrypted export to move to another.

## Next three steps (owner)
1. Keep this page current: who, what problem, and why they return.
2. Test the core flow with prospective users: start writing, change the look, read a weekly issue, find an old entry. Watch where they get confused; don't only ask whether they like the look.
3. Settle backup, recovery and cross-device use before claiming the whole experience.
