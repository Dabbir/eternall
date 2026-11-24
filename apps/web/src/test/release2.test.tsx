import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { addDays, todayISO } from '@eternall/core';
import { createMemoryStore, type VaultRecord } from '@eternall/vault';
import { markId } from '@eternall/routeen/practices';
import { routineDay } from '@eternall/routeen/sky';
import { copy } from '@eternall/routeen/copy';
import { Root } from '../shell/Root';

/**
 * The apps, each on its own, and what crosses between them (docs/adr/0011, docs/adr/0014):
 * every consumer works with its provider and degrades cleanly without it.
 */
const today = todayISO();
const stamp = new Date().toISOString();
const rec = (key: string, value: unknown): VaultRecord => ({ key, updatedAt: stamp, deleted: false, value });
const INTROS = ['routeen', 'amazeen', 'casheen'].map((i) => `intro:${i}`);
const settings = (hidden: string[] = []) => rec('house/settings/prefs', { id: 'prefs', theme: 'system', lens: 'moments', flatPages: false, dismissed: INTROS, hidden, autoLockMinutes: 15 });

const ritual = rec('refrain/ritual/run', { id: 'run', name: 'Morning run', why: '', cadence: { kind: 'daily' }, instrument: 'piano', pitch: 0, startedOn: addDays(today, -30), pausedOn: null });
const dad = rec('kindred/person/dad', { id: 'dad', name: 'Dad', drawer: 'Family', closeness: 'inner', howWeMet: '', dates: [], createdAt: stamp });
const work = rec('marginalia/work/waves', { id: 'waves', title: 'The Waves', by: 'Virginia Woolf', kind: 'book', started: addDays(today, -20), finished: null, landing: null, createdAt: stamp });
const line = rec('marginalia/underline/u1', { id: 'u1', workId: 'waves', text: 'I have made up thousands of stories.', locator: 'p. 112', note: '', offered: true, createdAt: stamp });
const magazine = rec('amazeen/meta/main', { id: 'main', magazine: { title: 'The Weekly Me', editor: 'Ada', createdAt: stamp }, overrides: {} });

function at(path: string) {
  window.history.replaceState(null, '', path);
}
beforeEach(() => {
  window.matchMedia = ((q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
});

describe('ROUTEEN, the day’s sky', () => {
  it('lights a loom-era ritual in one tap, as Target, in the old place in the vault', async () => {
    const user = userEvent.setup();
    const store = createMemoryStore([settings(), ritual]);
    at('/routeen/');
    render(<Root store={store} />);
    const chip = await screen.findByRole('button', { name: /^Morning run/, pressed: false });
    await user.click(chip);
    const day = routineDay(new Date(), 3);
    await waitFor(() => expect(store.dump().find((r) => r.key === `refrain/mark/${markId('run', day)}`)?.value).toMatchObject({ tier: 'target' }));
  });

  it('changes the tier from the inline choice, and unmarks on a second tap', async () => {
    const user = userEvent.setup();
    const store = createMemoryStore([settings(), ritual]);
    at('/routeen/');
    render(<Root store={store} />);
    const day = routineDay(new Date(), 3);
    const key = `refrain/mark/${markId('run', day)}`;
    const live = () => store.dump().find((r) => r.key === key && !r.deleted);
    await user.click(await screen.findByRole('button', { name: /^Morning run/, pressed: false }));
    await user.click(await screen.findByRole('button', { name: copy.tiers.minimum }));
    await waitFor(() => expect(live()?.value).toMatchObject({ tier: 'minimum' }));
    await user.click(await screen.findByRole('button', { name: /^Morning run/, pressed: true }));
    await waitFor(() => expect(live()).toBeUndefined());
    expect(await screen.findByRole('button', { name: /^Morning run/, pressed: false })).toBeInTheDocument();
  });

  it('switches the whole routine to Low energy in one tap and writes one mode record', async () => {
    const user = userEvent.setup();
    const store = createMemoryStore([settings(), ritual]);
    at('/routeen/');
    render(<Root store={store} />);
    await user.click(await screen.findByRole('button', { name: new RegExp(copy.modes.normal) }));
    await user.click(await screen.findByRole('radio', { name: copy.modes.low }));
    const day = routineDay(new Date(), 3);
    await waitFor(() => {
      const modes = store.dump().filter((r) => r.key.startsWith('refrain/mode/') && !r.deleted);
      expect(modes).toHaveLength(1);
      expect(modes[0]!.value).toMatchObject({ id: day, from: day, mode: 'low' });
    });
  });

  it('opens an old /routeen/cloth link on the sky', async () => {
    at('/routeen/cloth');
    render(<Root store={createMemoryStore([settings(), ritual])} />);
    expect(await screen.findByRole('heading', { level: 1, name: copy.sky.title })).toBeInTheDocument();
  });

  it('sets one past day to Day off without changing the running mode', async () => {
    const user = userEvent.setup();
    const store = createMemoryStore([settings(), ritual]);
    const yesterday = addDays(routineDay(new Date(), 3), -1);
    at(`/routeen/day/${yesterday}`);
    render(<Root store={store} />);
    const thatDay = await screen.findByRole('group', { name: copy.day.thatDay });
    await user.click(within(thatDay).getByRole('radio', { name: copy.modes.off }));
    const key = `refrain/day-mode/${yesterday}`;
    await waitFor(() => expect(store.dump().find((r) => r.key === key && !r.deleted)?.value).toMatchObject({ id: yesterday, date: yesterday, mode: 'off' }));
    expect(store.dump().filter((r) => r.key.startsWith('refrain/mode/'))).toHaveLength(0);
    await user.click(within(screen.getByRole('group', { name: copy.day.thatDay })).getByRole('radio', { name: copy.modes.normal }));
    await waitFor(() => expect(store.dump().find((r) => r.key === key && !r.deleted)).toBeUndefined());
    expect(store.dump().filter((r) => r.key.startsWith('refrain/mode/'))).toHaveLength(0);
  });

  it('shows the year as 52 weeks and counts lit days', async () => {
    const day = routineDay(new Date(), 3);
    const read = rec('refrain/ritual/read', { id: 'read', name: 'Read', why: '', cadence: { kind: 'daily' }, startedOn: addDays(today, -30), pausedOn: null });
    const marks = [rec(`refrain/mark/${markId('run', day)}`, { id: markId('run', day), ritualId: 'run', date: day, tier: 'target' }), rec(`refrain/mark/${markId('read', day)}`, { id: markId('read', day), ritualId: 'read', date: day, tier: 'more' })];
    at('/routeen/sky');
    render(<Root store={createMemoryStore([settings(), ritual, read, ...marks])} />);
    expect(await screen.findByRole('heading', { level: 1, name: copy.sky.title })).toBeInTheDocument();
    expect(screen.getByText(copy.sky.caption(1))).toBeInTheDocument();
    const year = screen.getByRole('table', { name: copy.aria.skyGrid });
    expect(within(year).getAllByRole('row')).toHaveLength(52);
    // The brightest tier of the day, said in words: "Tuesday 24 November: lit, more".
    expect(within(year).getAllByRole('img', { name: /: lit, more$/ })).toHaveLength(1);
  });

  it('opens a day from a This week tile', async () => {
    const user = userEvent.setup();
    const day = routineDay(new Date(), 3);
    at('/routeen/sky');
    render(<Root store={createMemoryStore([settings(), ritual])} />);
    const week = await screen.findByRole('list', { name: copy.sky.thisWeek });
    const tiles = within(week).getAllByRole('link');
    await user.click(tiles[tiles.length - 1]!);
    await waitFor(() => expect(window.location.pathname).toBe(`/routeen/day/${day}`));
    expect(await screen.findByRole('group', { name: copy.day.thatDay })).toBeInTheDocument();
  });

  it('goes back a week in the sky and lights a day of that week', async () => {
    const user = userEvent.setup();
    const store = createMemoryStore([settings(), ritual]);
    const day = routineDay(new Date(), 3);
    const monday = addDays(day, -(((new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7)));
    const earlier = addDays(monday, -7);
    at('/routeen/sky');
    render(<Root store={store} />);
    await screen.findByRole('heading', { level: 2, name: copy.sky.thisWeek });
    expect(screen.queryByRole('button', { name: copy.sky.later })).toBeNull();
    await user.click(screen.getByRole('button', { name: copy.sky.earlier }));
    const week = screen.getByRole('list', { name: /^Week of / });
    expect(screen.getByRole('button', { name: copy.sky.backToThisWeek })).toBeInTheDocument();
    const tiles = within(week).getAllByRole('link');
    expect(tiles).toHaveLength(7);
    await user.click(tiles[0]!);
    await waitFor(() => expect(window.location.pathname).toBe(`/routeen/day/${earlier}`));
    await user.click(await screen.findByRole('button', { name: /^Morning run/, pressed: false }));
    await waitFor(() => expect(store.dump().find((r) => r.key === `refrain/mark/${markId('run', earlier)}` && !r.deleted)?.value).toMatchObject({ date: earlier, tier: 'target' }));
  });

  it('keeps focus on the week’s heading when Later or Back to this week leaves', async () => {
    const user = userEvent.setup();
    at('/routeen/sky');
    render(<Root store={createMemoryStore([settings(), ritual])} />);
    await screen.findByRole('heading', { level: 2, name: copy.sky.thisWeek });
    await user.click(screen.getByRole('button', { name: copy.sky.earlier }));
    await user.click(screen.getByRole('button', { name: copy.sky.later }));
    expect(screen.queryByRole('button', { name: copy.sky.later })).toBeNull();
    expect(screen.getByRole('heading', { level: 2, name: copy.sky.thisWeek })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: copy.sky.earlier }));
    await user.click(screen.getByRole('button', { name: copy.sky.earlier }));
    await user.click(screen.getByRole('button', { name: copy.sky.backToThisWeek }));
    expect(screen.queryByRole('button', { name: copy.sky.backToThisWeek })).toBeNull();
    expect(screen.getByRole('heading', { level: 2, name: copy.sky.thisWeek })).toHaveFocus();
  });

  it('counts only the lit days of practices that still exist', async () => {
    const day = routineDay(new Date(), 3);
    const gone = rec(`refrain/mark/${markId('gone', addDays(day, -1))}`, { id: markId('gone', addDays(day, -1)), ritualId: 'gone', date: addDays(day, -1), tier: 'target' });
    const kept = rec(`refrain/mark/${markId('run', day)}`, { id: markId('run', day), ritualId: 'run', date: day, tier: 'target' });
    at('/routeen/sky');
    render(<Root store={createMemoryStore([settings(), ritual, gone, kept])} />);
    expect(await screen.findByText(copy.sky.caption(1))).toBeInTheDocument();
  });

  it('says how each practice stood on a past day, in words', async () => {
    const yesterday = addDays(routineDay(new Date(), 3), -1);
    const read = rec('refrain/ritual/read', { id: 'read', name: 'Read', why: '', cadence: { kind: 'daily' }, startedOn: addDays(today, -30), pausedOn: null });
    const lit = rec(`refrain/mark/${markId('read', yesterday)}`, { id: markId('read', yesterday), ritualId: 'read', date: yesterday, tier: 'minimum' });
    at(`/routeen/day/${yesterday}`);
    render(<Root store={createMemoryStore([settings(), ritual, read, lit])} />);
    expect(await screen.findByRole('button', { name: /^Morning run/ })).toHaveAccessibleDescription(copy.dayState.unlit);
    expect(screen.getByRole('button', { name: /^Read/ })).toHaveAccessibleDescription(copy.dayState['lit-minimum']);
    expect(screen.getByText(copy.dayState.unlit)).toBeVisible();
  });

  it('creates a practice from its name alone', async () => {
    const user = userEvent.setup();
    const store = createMemoryStore([settings()]);
    at('/routeen/');
    render(<Root store={store} />);
    const field = await screen.findByRole('textbox', { name: copy.nameLabel });
    await user.type(field, 'Minum air');
    await user.click(within(field.closest('form')!).getByRole('button', { name: copy.newPractice }));
    await waitFor(() => {
      const made = store.dump().filter((r) => r.key.startsWith('refrain/ritual/') && !r.deleted);
      expect(made).toHaveLength(1);
      const value = made[0]!.value as Record<string, unknown>;
      expect(value).toMatchObject({ name: 'Minum air', why: '', cadence: { kind: 'daily' }, startedOn: routineDay(new Date(), 3), pausedOn: null });
      expect(value).not.toHaveProperty('timeOfDay');
      expect(value).not.toHaveProperty('measure');
    });
    expect(await screen.findByRole('button', { name: /^Minum air/, pressed: false })).toBeInTheDocument();
  });

  it('saves when my day ends', async () => {
    const user = userEvent.setup();
    const store = createMemoryStore([settings(), ritual]);
    at('/routeen/sky');
    render(<Root store={store} />);
    const ends = await screen.findByRole('group', { name: copy.dayEndsAt });
    await user.click(within(ends).getByRole('radio', { name: copy.hour(2) }));
    await waitFor(() => expect(store.dump().find((r) => r.key === 'refrain/settings/settings')?.value).toMatchObject({ dayEndsAt: 2 }));
  });

  it('says so when every practice is resting, instead of a blank page', async () => {
    const paused = rec('refrain/ritual/run', { id: 'run', name: 'Morning run', why: '', cadence: { kind: 'daily' }, startedOn: addDays(today, -30), pausedOn: addDays(today, -2) });
    at('/routeen/');
    render(<Root store={createMemoryStore([settings(), paused])} />);
    expect(await screen.findByText(copy.resting)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Morning run/ })).not.toBeInTheDocument();
  });

  it('answers an unknown practice or day with a way back to Today', async () => {
    const user = userEvent.setup();
    at('/routeen/practice/nobody');
    const { unmount } = render(<Root store={createMemoryStore([settings(), ritual])} />);
    expect(await screen.findByText(copy.notFound.practice)).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: copy.notFound.back }));
    await waitFor(() => expect(window.location.pathname).toBe('/routeen/'));
    unmount();
    at('/routeen/day/2026-02-31');
    render(<Root store={createMemoryStore([settings(), ritual])} />);
    expect(await screen.findByText(copy.notFound.day)).toBeInTheDocument();
  });

  it('sends a future day back to Today', async () => {
    at(`/routeen/day/${addDays(routineDay(new Date(), 3), 3)}`);
    render(<Root store={createMemoryStore([settings(), ritual])} />);
    await waitFor(() => expect(window.location.pathname).toBe('/routeen/'));
    expect(await screen.findByRole('button', { name: /^Morning run/ })).toBeInTheDocument();
  });

  it('lights a past day from its page, in the old place in the vault', async () => {
    const user = userEvent.setup();
    const store = createMemoryStore([settings(), ritual]);
    const yesterday = addDays(routineDay(new Date(), 3), -1);
    at(`/routeen/day/${yesterday}`);
    render(<Root store={store} />);
    await user.click(await screen.findByRole('button', { name: /^Morning run/, pressed: false }));
    await waitFor(() => expect(store.dump().find((r) => r.key === `refrain/mark/${markId('run', yesterday)}` && !r.deleted)?.value).toMatchObject({ date: yesterday, tier: 'target' }));
  });

  it('pauses a practice from its page and shows its year as weeks', async () => {
    const user = userEvent.setup();
    const store = createMemoryStore([settings(), ritual]);
    at('/routeen/practice/run');
    render(<Root store={store} />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Morning run' })).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: copy.practice.history })).getAllByRole('listitem')).toHaveLength(52);
    await user.click(screen.getByRole('button', { name: copy.dialog.pause }));
    await waitFor(() => expect(store.dump().find((r) => r.key === 'refrain/ritual/run')?.value).toMatchObject({ pausedOn: routineDay(new Date(), 3) }));
  });
});

describe('AMAZEEN · People (once KINDRED, ADR 0014)', () => {
  it('pins the people from the old card file on the wall, and notes that you saw someone today', async () => {
    const user = userEvent.setup();
    const store = createMemoryStore([settings(), dad, magazine]);
    at('/amazeen/people/dad');
    render(<Root store={store} />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Dad' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'I saw them today' }));
    await waitFor(() => expect(store.dump().some((r) => r.key === `kindred/seen/dad_${today}`)).toBe(true));
  });

  it('lists the pieces someone appears in', async () => {
    const piece = rec('amazeen/entry/e1', { id: 'e1', kind: 'note', body: 'Lunch with Dad by the river.', section: 'people', mood: 4, starred: false, createdAt: stamp, updatedAt: stamp });
    at('/amazeen/people/dad');
    render(<Root store={createMemoryStore([settings(), dad, magazine, piece])} />);
    expect(await screen.findByRole('heading', { name: 'Appears in 1 piece' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lunch with Dad by the river/ })).toBeInTheDocument();
  });

  it('hangs a strip of the wall above the Shelf', async () => {
    at('/amazeen/shelf');
    render(<Root store={createMemoryStore([settings(), dad, magazine])} />);
    expect(await screen.findByRole('heading', { name: 'On the wall' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Dad/ })).toBeInTheDocument();
  });

  it('lets letters mention people from the wall', async () => {
    at('/amazeen/letters/write');
    render(<Root store={createMemoryStore([settings(), dad])} />);
    expect(await screen.findByLabelText('Mention someone from your People')).toBeInTheDocument();
  });
});

describe('AMAZEEN @ mentions', () => {
  it('offers people from the wall after "@" and writes the name as plain text', async () => {
    const user = userEvent.setup();
    at('/amazeen/write/note');
    render(<Root store={createMemoryStore([settings(), dad, magazine])} />);
    const note = await screen.findByLabelText('Note');
    await user.type(note, 'Lunch with @Da');
    const option = await screen.findByRole('option', { name: /Dad/ });
    expect(option).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Enter}');
    expect(note).toHaveValue('Lunch with Dad ');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('treats "@" as a character when nobody is on the wall', async () => {
    const user = userEvent.setup();
    at('/amazeen/write/note');
    render(<Root store={createMemoryStore([settings(), magazine])} />);
    const note = await screen.findByLabelText('Note');
    await user.type(note, 'Lunch with @Da');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(note).toHaveValue('Lunch with @Da');
  });
});

describe('People reminders', () => {
  const bday = rec('kindred/person/dad', { id: 'dad', name: 'Dad', drawer: 'Family', closeness: 'inner', howWeMet: '', dates: [{ label: 'Birthday', date: `1958-${today.slice(5)}`, yearly: true }], createdAt: stamp });
  it('reminds once, on the day, only when opted in', async () => {
    const store = createMemoryStore([settings(), bday, magazine, rec('kindred/pref/pref', { id: 'pref', remind: 'day' })]);
    at('/amazeen/people');
    const { unmount } = render(<Root store={store} />);
    expect(await screen.findByText(/Dad’s birthday is today/)).toBeInTheDocument();
    await waitFor(() => expect(store.dump().find((r) => r.key === 'house/reminders/log')?.value).toMatchObject({ sent: [{ key: `kindred_dad_birthday_${today}_0` }] }));
    unmount();
    at('/amazeen/people');
    render(<Root store={store} />);
    expect(await screen.findByRole('heading', { name: /The\s*People/ })).toBeInTheDocument();
    expect(screen.queryByText(/Dad’s birthday is today/)).not.toBeInTheDocument();
  });

  it('stays quiet when reminders are off', async () => {
    at('/amazeen/people');
    render(<Root store={createMemoryStore([settings(), bday, magazine])} />);
    expect(await screen.findByRole('button', { name: /Reminders for dates · off/ })).toBeInTheDocument();
    expect(screen.queryByText(/Dad’s birthday is today/)).not.toBeInTheDocument();
  });
});

describe('MARGINALIA, retired (ADR 0014)', () => {
  it('turns its underlines into AMAZEEN quotes when the vault opens, keeping the originals', async () => {
    at('/');
    const store = createMemoryStore([settings(), work, line, magazine]);
    render(<Root store={store} />);
    await waitFor(() => expect(store.dump().find((r) => r.key === 'amazeen/entry/mg_u1')?.value).toMatchObject({ kind: 'quote', body: 'I have made up thousands of stories.', attribution: 'Virginia Woolf, The Waves, p. 112' }));
    expect(store.dump().find((r) => r.key === 'marginalia/underline/u1')?.deleted).toBe(false);
  });
});
