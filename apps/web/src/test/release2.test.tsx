import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { addDays, todayISO } from '@eternall/core';
import { createMemoryStore, type VaultRecord } from '@eternall/vault';
import { barStart, markId } from '@eternall/refrain/rituals';
import { meteorologicalSeason } from '@eternall/prologue/seasons';
import { Root } from '../shell/Root';

/**
 * Release 2 imprints, each on its own, and the capability matrix (docs/ROADMAP.md Phase 5):
 * every consumer works with its provider and degrades cleanly without it.
 */
const today = todayISO();
const stamp = new Date().toISOString();
const rec = (key: string, value: unknown): VaultRecord => ({ key, updatedAt: stamp, deleted: false, value });
const INTROS = ['envoi', 'folio', 'almanack', 'refrain', 'prologue', 'kindred', 'marginalia', 'amazeen'].map((i) => `intro:${i}`);
const settings = (hidden: string[] = []) => rec('house/settings/prefs', { id: 'prefs', theme: 'system', lens: 'moments', flatPages: false, dismissed: INTROS, hidden, autoLockMinutes: 15 });

const ritual = rec('refrain/ritual/run', { id: 'run', name: 'Morning run', why: '', cadence: { kind: 'daily' }, instrument: 'piano', pitch: 0, startedOn: addDays(today, -30), pausedOn: null });
const season = meteorologicalSeason(today, 'north');
const seasonRec = rec('prologue/season/s1', { id: 's1', name: season.name, theme: 'staying close', start: season.start, end: season.end, closedAt: null, epilogue: '' });
const hope = rec('prologue/hope/h1', { id: 'h1', seasonId: 's1', title: 'Visit Dad every other Sunday', state: 'stage', reflection: '', ritualRef: 'run', peopleRefs: ['dad'], act: 1 });
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

describe('PROLOGUE and its optional links', () => {
  it('shows the linked ritual and the cast when REFRAIN and KINDRED are on', async () => {
    at('/prologue/');
    render(<Root store={createMemoryStore([settings(), ritual, seasonRec, hope, dad])} />);
    expect(await screen.findByText('Visit Dad every other Sunday')).toBeInTheDocument();
    expect(screen.getByText(/REFRAIN: Morning run/)).toBeInTheDocument();
    expect(within(screen.getByRole('complementary', { name: 'Cast' })).getByRole('link', { name: 'Dad' })).toBeInTheDocument();
  });

  it('still works, with plain fallbacks, when both are disabled', async () => {
    const user = userEvent.setup();
    at('/prologue/');
    render(<Root store={createMemoryStore([settings(['refrain', 'kindred']), ritual, seasonRec, hope, dad])} />);
    expect(await screen.findByText('Visit Dad every other Sunday')).toBeInTheDocument();
    expect(screen.queryByText(/REFRAIN:/)).not.toBeInTheDocument();
    expect(screen.getByText(/With KINDRED, the people in your hopes appear here/)).toBeInTheDocument();
    await user.click(screen.getByText('Visit Dad every other Sunday'));
    const dialog = await screen.findByRole('dialog', { name: 'Edit this hope' });
    expect(within(dialog).queryByText(/Linked REFRAIN ritual/)).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText(/Who’s in it/)).not.toBeInTheDocument();
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

  it('lets ENVOI mention people only while KINDRED is on', async () => {
    at('/envoi/write');
    const { unmount } = render(<Root store={createMemoryStore([settings(), dad])} />);
    expect(await screen.findByLabelText('Mention someone from KINDRED')).toBeInTheDocument();
    unmount();
    at('/envoi/write');
    render(<Root store={createMemoryStore([settings(['kindred']), dad])} />);
    expect(await screen.findByLabelText('Your letter')).toBeInTheDocument();
    expect(screen.queryByLabelText('Mention someone from KINDRED')).not.toBeInTheDocument();
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
