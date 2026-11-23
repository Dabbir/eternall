import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { addDays, todayISO } from '@eternall/core';
import { createMemoryStore, type VaultRecord } from '@eternall/vault';
import { barStart, markId } from '@eternall/refrain/rituals';
import { Root } from '../shell/Root';

/**
 * The four apps, each on its own, and the capability matrix (docs/adr/0011):
 * every consumer works with its provider and degrades cleanly without it.
 */
const today = todayISO();
const stamp = new Date().toISOString();
const rec = (key: string, value: unknown): VaultRecord => ({ key, updatedAt: stamp, deleted: false, value });
const INTROS = ['refrain', 'kindred', 'marginalia', 'amazeen'].map((i) => `intro:${i}`);
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

describe('REFRAIN on its own', () => {
  it('shows the score and keeps a beat as a note in the vault', async () => {
    const user = userEvent.setup();
    const store = createMemoryStore([settings(), ritual]);
    at('/refrain/');
    render(<Root store={store} />);
    expect(await screen.findByRole('heading', { name: /The lines you\s*come back to/ })).toBeInTheDocument();
    const monday = barStart(today);
    const beat = screen.getAllByRole('switch', { name: new RegExp(`^Morning run, Monday`) }).find((b) => !b.hasAttribute('disabled') && b.getAttribute('aria-label')!.includes(String(Number(monday.slice(8)))))!;
    await user.click(beat);
    await waitFor(() => expect(store.dump().some((r) => r.key === `refrain/mark/${markId('run', monday)}`)).toBe(true));
  });
});

describe('KINDRED on its own', () => {
  it('notes that you saw someone today', async () => {
    const user = userEvent.setup();
    const store = createMemoryStore([settings(), dad]);
    at('/kindred/person/dad');
    render(<Root store={store} />);
    await user.click(await screen.findByRole('button', { name: 'I saw them today' }));
    await waitFor(() => expect(store.dump().some((r) => r.key === `kindred/seen/dad_${today}`)).toBe(true));
  });

  it('lets AMAZEEN letters mention people only while KINDRED is on', async () => {
    at('/amazeen/letters/write');
    const { unmount } = render(<Root store={createMemoryStore([settings(), dad])} />);
    expect(await screen.findByLabelText('Mention someone from KINDRED')).toBeInTheDocument();
    unmount();
    at('/amazeen/letters/write');
    render(<Root store={createMemoryStore([settings(['kindred']), dad])} />);
    expect(await screen.findByLabelText('Your letter')).toBeInTheDocument();
    expect(screen.queryByLabelText('Mention someone from KINDRED')).not.toBeInTheDocument();
  });
});

describe('AMAZEEN @ mentions', () => {
  it('offers KINDRED people after "@" and writes the name as plain text', async () => {
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

  it('treats "@" as a character when KINDRED is off', async () => {
    const user = userEvent.setup();
    at('/amazeen/write/note');
    render(<Root store={createMemoryStore([settings(['kindred']), dad, magazine])} />);
    const note = await screen.findByLabelText('Note');
    await user.type(note, 'Lunch with @Da');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(note).toHaveValue('Lunch with @Da');
  });
});

describe('KINDRED reminders', () => {
  const bday = rec('kindred/person/dad', { id: 'dad', name: 'Dad', drawer: 'Family', closeness: 'inner', howWeMet: '', dates: [{ label: 'Birthday', date: `1958-${today.slice(5)}`, yearly: true }], createdAt: stamp });
  it('reminds once, on the day, only when opted in', async () => {
    const store = createMemoryStore([settings(), bday, rec('kindred/pref/pref', { id: 'pref', remind: 'day' })]);
    at('/kindred/');
    const { unmount } = render(<Root store={store} />);
    expect(await screen.findByText(/Dad’s birthday is today/)).toBeInTheDocument();
    await waitFor(() => expect(store.dump().find((r) => r.key === 'house/reminders/log')?.value).toMatchObject({ sent: [{ key: `kindred_dad_birthday_${today}_0` }] }));
    unmount();
    at('/kindred/');
    render(<Root store={store} />);
    expect(await screen.findByRole('heading', { name: 'Keep the people close.' })).toBeInTheDocument();
    expect(screen.queryByText(/Dad’s birthday is today/)).not.toBeInTheDocument();
  });

  it('stays quiet when reminders are off', async () => {
    at('/kindred/');
    render(<Root store={createMemoryStore([settings(), bday])} />);
    expect(await screen.findByRole('button', { name: /Reminders for dates · off/ })).toBeInTheDocument();
    expect(screen.queryByText(/Dad’s birthday is today/)).not.toBeInTheDocument();
  });
});

describe('MARGINALIA and the Overheard page', () => {
  it('keeps underlines with the margin, and offers opted-in ones to AMAZEEN', async () => {
    const user = userEvent.setup();
    at('/marginalia/work/waves');
    const { unmount } = render(<Root store={createMemoryStore([settings(), work, line])} />);
    expect(await screen.findByText(/I have made up thousands of stories/)).toBeInTheDocument();
    expect(screen.getByText('— p. 112')).toBeInTheDocument();
    unmount();

    const store = createMemoryStore([settings(), work, line, magazine]);
    at('/amazeen/');
    render(<Root store={store} />);
    await user.click(await screen.findByRole('button', { name: /1 underline offered from MARGINALIA/ }));
    await user.click(screen.getByRole('button', { name: 'Add to this issue' }));
    await waitFor(() => expect(store.dump().some((r) => r.key.startsWith('amazeen/entry/') && (r.value as { kind: string }).kind === 'quote')).toBe(true));
  });

  it('offers nothing to AMAZEEN when MARGINALIA is disabled', async () => {
    at('/amazeen/');
    render(<Root store={createMemoryStore([settings(['marginalia']), work, line, magazine])} />);
    expect((await screen.findAllByText(/to press/)).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /offered from MARGINALIA/ })).not.toBeInTheDocument();
  });
});
