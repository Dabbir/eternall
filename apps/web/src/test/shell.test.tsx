import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { addDays, addYears, todayISO } from '@eternall/core';
import { createMemoryStore, type VaultRecord } from '@eternall/vault';
import { fingerprintOf } from '@eternall/amazeen/imprint/letters/letters';
import { Root } from '../shell/Root';

const today = todayISO();
const stamp = new Date().toISOString();
const rec = (key: string, value: unknown): VaultRecord => ({ key, updatedAt: stamp, deleted: false, value });
const profile = rec('house/profile/me', { id: 'me', name: 'Ada', birthDate: addYears(today, -30), horizonYears: 90, hemisphere: 'north', createdAt: stamp });
const quiet = rec('house/settings/prefs', { id: 'prefs', theme: 'system', lens: 'moments', flatPages: false, dismissed: ['intro:amazeen', 'intro:refrain', 'intro:kindred', 'intro:marginalia'], hidden: [], autoLockMinutes: 15 });

function at(path: string) {
  window.history.replaceState(null, '', path);
}

beforeEach(() => {
  window.matchMedia = ((q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
});

describe('the house', () => {
  it('welcomes a new visitor with the doors to every imprint', async () => {
    at('/');
    render(<Root store={createMemoryStore()} />);
    expect(await screen.findByRole('heading', { name: /Your life,\s*in weeks/ })).toBeInTheDocument();
    const doors = screen.getByRole('navigation', { name: 'Or start with one imprint' });
    expect(within(doors).getByText('KINDRED')).toBeInTheDocument();
    expect(within(doors).getByText('The people who matter')).toBeInTheDocument();
    expect(within(doors).queryByText('ENVOI')).not.toBeInTheDocument();
  });

  it('shows the lifeline and spine action once a profile exists', async () => {
    at('/');
    render(<Root store={createMemoryStore([profile, quiet])} />);
    expect(await screen.findByRole('heading', { level: 1, name: /Ada, this is week/ })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Inscribe this week/ }).length).toBeGreaterThan(0);
  });

  it('inscribes a memory and lists it in the archive', async () => {
    const user = userEvent.setup();
    const store = createMemoryStore([profile, quiet]);
    at(`/inscriptions?new=1&date=${today}`);
    render(<Root store={store} />);
    const dialog = await screen.findByRole('dialog', { name: 'Inscribe a memory' });
    await user.type(within(dialog).getByLabelText('Title'), 'First swim');
    await user.click(within(dialog).getByLabelText('Joy'));
    await user.click(within(dialog).getByRole('button', { name: 'Inscribe' }));
    expect(await screen.findByText('First swim')).toBeInTheDocument();
    await waitFor(() => expect(store.dump().some((r) => r.key.startsWith('house/inscription/'))).toBe(true));
  });
});

describe('Letters, in AMAZEEN', () => {
  it('opens the post room without a profile or a magazine', async () => {
    at('/amazeen/letters');
    render(<Root store={createMemoryStore([quiet])} />);
    expect(await screen.findByRole('heading', { name: /Write to the person/ })).toBeInTheDocument();
  });

  it('seals a letter and never shows its contents before the day', async () => {
    const user = userEvent.setup();
    const store = createMemoryStore([quiet]);
    at('/amazeen/letters/write');
    render(<Root store={store} />);
    await user.type(await screen.findByLabelText('Title'), 'For later');
    await user.type(screen.getByLabelText('Your letter'), 'THE SECRET BODY');
    await user.click(screen.getByRole('button', { name: 'In one year' }));
    await user.click(screen.getAllByRole('button', { name: 'Seal letter' }).at(-1)!);
    expect(await screen.findByText('Sealed.')).toBeInTheDocument();
    await waitFor(() => expect(store.dump().some((r) => r.key.startsWith('envoi/letter/'))).toBe(true), { timeout: 3000 });
    await waitFor(() => expect(screen.getByText(/1 letter in the post/)).toBeInTheDocument());
    expect(document.body.textContent).not.toContain('THE SECRET BODY');
  });

  it('opens a ready letter and verifies its seal', async () => {
    const user = userEvent.setup();
    const l = { title: 'Hello again', body: 'You made it.', sealedOn: addDays(today, -400), opensOn: addDays(today, -1) };
    const letter = rec('envoi/letter/l1', { id: 'l1', ...l, fingerprint: await fingerprintOf(l), openedAt: null });
    at('/amazeen/letters/letter/l1');
    render(<Root store={createMemoryStore([quiet, letter])} />);
    await user.click((await screen.findAllByRole('button', { name: 'Break the seal' })).at(-1)!);
    expect(await screen.findByText('You made it.')).toBeInTheDocument();
    expect(screen.getByText(/Seal intact/)).toBeInTheDocument();
  });
});

describe('Chapters, in the house', () => {
  it('names a chapter and offers it to the lifeline as a band', async () => {
    const user = userEvent.setup();
    const store = createMemoryStore([profile, quiet]);
    at('/chapters?new=1');
    render(<Root store={store} />);
    const dialog = await screen.findByRole('dialog', { name: 'New chapter' });
    await user.type(within(dialog).getByLabelText('Title'), 'Berlin');
    const began = within(dialog).getByLabelText('Began');
    await user.clear(began);
    await user.type(began, addYears(today, -5));
    await user.click(within(dialog).getByRole('button', { name: 'Add to the shelf' }));
    expect(await screen.findByRole('button', { name: /Berlin/ })).toBeInTheDocument();
    await waitFor(() => expect(store.dump().some((r) => r.key.startsWith('folio/chapter/'))).toBe(true));
  });
});

describe('apps as their own sites', () => {
  it('shows an app without the house spine, doors or name, in its own identity', async () => {
    at('/kindred/');
    render(<Root store={createMemoryStore([profile, quiet])} />);
    await screen.findByRole('heading', { level: 1 });
    expect(document.querySelector('.spine')).toBeNull();
    expect(document.body.dataset.imprint).toBe('kindred');
    expect(document.body.textContent).not.toMatch(/ETERNALL/);
    expect(document.querySelector('link[rel="manifest"]')?.getAttribute('href') ?? '/manifests/kindred.webmanifest').toBe('/manifests/kindred.webmanifest');
  });

  it('gives the house back its spine and identity', async () => {
    at('/');
    render(<Root store={createMemoryStore([profile, quiet])} />);
    expect(await screen.findByRole('heading', { level: 1, name: /Ada, this is week/ })).toBeInTheDocument();
    expect(document.querySelector('.spine')).not.toBeNull();
    expect(document.body.dataset.imprint).toBeUndefined();
  });

  it('scopes search to the app, with one way back to the house', async () => {
    at('/kindred/');
    render(<Root store={createMemoryStore([profile, quiet])} />);
    await screen.findByRole('heading', { level: 1 });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    });
    expect(await screen.findByRole('option', { name: /Close the drawer/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Inscriptions/ })).not.toBeInTheDocument();
  });
});

describe('retired doors', () => {
  it('send old links to where their pages live now', async () => {
    const { retiredDoorRedirect } = await import('../shell/router');
    expect(retiredDoorRedirect('/envoi/', '')).toBe('/amazeen/letters');
    expect(retiredDoorRedirect('/envoi/letter/l1', '')).toBe('/amazeen/letters/letter/l1');
    expect(retiredDoorRedirect('/envoi/write', '?opensOn=2030-01-01')).toBe('/amazeen/letters/write?opensOn=2030-01-01');
    expect(retiredDoorRedirect('/folio/chapter/c1', '')).toBe('/chapters?open=c1');
    expect(retiredDoorRedirect('/folio/', '')).toBe('/chapters');
    expect(retiredDoorRedirect('/almanack/', '')).toBe('/almanac');
    expect(retiredDoorRedirect('/prologue/lobby', '')).toBe('/inscriptions');
    expect(retiredDoorRedirect('/kindred/', '')).toBeNull();
    expect(retiredDoorRedirect('/', '')).toBeNull();
  });

  it('keep a PROLOGUE season as an inscription', async () => {
    const store = createMemoryStore([profile, quiet, rec('prologue/season/s1', { id: 's1', name: 'Autumn 2026', theme: 'staying close', start: '2026-09-01', end: '2026-11-30', closedAt: null, epilogue: '' })]);
    at('/inscriptions');
    render(<Root store={store} />);
    expect(await screen.findByText('Autumn 2026: the season of staying close')).toBeInTheDocument();
    expect(store.dump().some((r) => r.key === 'prologue/season/s1')).toBe(true);
  });

  it('show the Almanac as a house page', async () => {
    at('/almanac');
    render(<Root store={createMemoryStore([profile, quiet])} />);
    expect(await screen.findByRole('heading', { name: 'The Almanac' })).toBeInTheDocument();
  });
});

describe('command palette', () => {
  it('opens with Ctrl+K and lists the doors', async () => {
    at('/');
    render(<Root store={createMemoryStore([profile, quiet])} />);
    await screen.findByRole('heading', { level: 1 });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    });
    expect(await screen.findByRole('option', { name: /KINDRED · The people who matter/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Chapters/ })).toBeInTheDocument();
  });
});
