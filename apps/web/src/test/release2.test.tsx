import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { addDays, todayISO } from '@eternall/core';
import { createMemoryStore, type VaultRecord } from '@eternall/vault';
import { barStart, markId } from '@eternall/routeen/practices';
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

describe('ROUTEEN, the loom (once REFRAIN, ADR 0014)', () => {
  it('weaves a REFRAIN ritual as a thread, and keeps a stitch in the old place in the vault', async () => {
    const user = userEvent.setup();
    const store = createMemoryStore([settings(), ritual]);
    at('/routeen/');
    render(<Root store={store} />);
    expect(await screen.findByRole('heading', { name: /The\s*loom/ })).toBeInTheDocument();
    const monday = barStart(today);
    const stitch = screen.getAllByRole('switch', { name: /^Morning run, Monday/ }).find((b) => !b.hasAttribute('disabled'))!;
    await user.click(stitch);
    await waitFor(() => expect(store.dump().some((r) => r.key === `refrain/mark/${markId('run', monday)}`)).toBe(true));
  });

  it('marks today from the sheet, and Weave writes only what changed', async () => {
    const user = userEvent.setup();
    const store = createMemoryStore([settings(), ritual]);
    at('/routeen/');
    render(<Root store={store} />);
    await screen.findByRole('heading', { name: /The\s*loom/ });
    await user.click((await screen.findAllByRole('button', { name: 'Mark today' }))[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Mark today' });
    await user.click(within(dialog).getByRole('checkbox', { name: /Morning run/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Weave' }));
    await waitFor(() => expect(store.dump().some((r) => r.key === `refrain/mark/${markId('run', today)}`)).toBe(true));
  });

  it('shows the year as cloth', async () => {
    at('/routeen/cloth');
    render(<Root store={createMemoryStore([settings(), ritual])} />);
    expect(await screen.findByRole('heading', { name: /The\s*cloth/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Morning run: woven 0 times in the last 52 weeks/ })).toBeInTheDocument();
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
