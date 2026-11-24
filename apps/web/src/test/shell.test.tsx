import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { addDays, addYears, todayISO } from '@eternall/core';
import { createMemoryStore, type VaultRecord } from '@eternall/vault';
import { fingerprintOf } from '@eternall/amazeen/imprint/letters/letters';
import { copy as routeenCopy } from '@eternall/routeen/copy';
import { Root } from '../shell/Root';

const today = todayISO();
const stamp = new Date().toISOString();
const rec = (key: string, value: unknown): VaultRecord => ({ key, updatedAt: stamp, deleted: false, value });
const profile = rec('house/profile/me', { id: 'me', name: 'Ada', birthDate: addYears(today, -30), horizonYears: 90, hemisphere: 'north', createdAt: stamp });
const quiet = rec('house/settings/prefs', { id: 'prefs', theme: 'system', lens: 'moments', flatPages: false, dismissed: ['intro:amazeen', 'intro:routeen', 'intro:casheen'], hidden: [], autoLockMinutes: 15, apps: ['amazeen', 'routeen', 'casheen'] });

function at(path: string) {
  window.history.replaceState(null, '', path);
}

beforeEach(() => {
  window.matchMedia = ((q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
});

describe('the house', () => {
  it('welcomes a new visitor on Home: one card per app, never the lifeline (ADR 0014)', async () => {
    const user = userEvent.setup();
    at('/');
    render(<Root store={createMemoryStore()} />);
    expect(await screen.findByRole('heading', { name: /Write as usual\.\s*See your week again\./ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add an entry' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: routeenCopy.newPractice })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Draw your life in weeks/ })).toBeInTheDocument();
    expect(screen.queryByText('KINDRED')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Start writing' }));
    await waitFor(() => expect(window.location.pathname).toBe('/amazeen/'));
    // Nothing was written by opening it, so the vault does not ask for a lock yet.
    expect(screen.queryByRole('dialog', { name: /lock it to you/ })).not.toBeInTheDocument();
  });

  it('shows each app’s next step on Home, and Money never shows a figure', async () => {
    const entry = rec('amazeen/entry/e1', { id: 'e1', kind: 'note', body: 'x', section: 'life', mood: 4, starred: false, createdAt: stamp, updatedAt: stamp });
    const spent = rec('ledger/entry/a', { id: 'a', kind: 'out', amount: 777777, categoryId: 'food', date: today, note: 'warung', createdAt: stamp });
    at('/');
    render(<Root store={createMemoryStore([profile, quiet, entry, spent])} />);
    expect(await screen.findByRole('heading', { level: 1, name: /Ada\./ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Write today’s note' })).toBeInTheDocument();
    expect(screen.getByText(/This week's issue · 1 piece/)).toBeInTheDocument();
    const money = document.querySelector('.home-card--casheen')!;
    expect(money.textContent).not.toMatch(/\d/);
    expect(document.body.textContent).not.toMatch(/777|warung/);
  });

  it('offers the lifeline, without pushing it, on its own page', async () => {
    at('/life');
    render(<Root store={createMemoryStore([quiet])} />);
    expect(await screen.findByRole('heading', { name: /Your life,\s*in weeks/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Begin your lifeline/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to Home' })).toBeInTheDocument();
  });

  it('shows the lifeline and spine action once a profile exists', async () => {
    at('/life');
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
    at('/casheen/');
    render(<Root store={createMemoryStore([profile, quiet])} />);
    await screen.findByLabelText('Write one line');
    expect(document.querySelector('.spine')).toBeNull();
    expect(document.body.dataset.imprint).toBe('casheen');
    expect(document.body.textContent).not.toMatch(/ETERNALL/);
    expect(document.querySelector('link[rel="manifest"]')?.getAttribute('href') ?? '/manifests/casheen.webmanifest').toBe('/manifests/casheen.webmanifest');
  });

  it('gives the house back its spine and identity', async () => {
    at('/life');
    render(<Root store={createMemoryStore([profile, quiet])} />);
    expect(await screen.findByRole('heading', { level: 1, name: /Ada, this is week/ })).toBeInTheDocument();
    expect(document.querySelector('.spine')).not.toBeNull();
    expect(document.body.dataset.imprint).toBeUndefined();
  });

  it('scopes search to the app, with one way back to the house', async () => {
    at('/casheen/');
    render(<Root store={createMemoryStore([profile, quiet])} />);
    await screen.findByLabelText('Write one line');
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    });
    expect(await screen.findByRole('option', { name: /Close the book/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Inscriptions/ })).not.toBeInTheDocument();
  });
});

describe('retired doors', () => {
  it('send old links to where their pages live now', async () => {
    const { retiredDoorRedirect } = await import('../shell/router');
    expect(retiredDoorRedirect('/envoi/', '')).toBe('/amazeen/letters');
    expect(retiredDoorRedirect('/marginalia/work/waves', '')).toBe('/amazeen/shelf');
    expect(retiredDoorRedirect('/envoi/letter/l1', '')).toBe('/amazeen/letters/letter/l1');
    expect(retiredDoorRedirect('/envoi/write', '?opensOn=2030-01-01')).toBe('/amazeen/letters/write?opensOn=2030-01-01');
    expect(retiredDoorRedirect('/folio/chapter/c1', '')).toBe('/chapters?open=c1');
    expect(retiredDoorRedirect('/folio/', '')).toBe('/chapters');
    expect(retiredDoorRedirect('/almanack/', '')).toBe('/almanac');
    expect(retiredDoorRedirect('/prologue/lobby', '')).toBe('/inscriptions');
    expect(retiredDoorRedirect('/kindred/', '')).toBe('/amazeen/people');
    expect(retiredDoorRedirect('/refrain/ritual/run', '')).toBe('/routeen/practice/run');
    expect(retiredDoorRedirect('/refrain/', '')).toBe('/routeen/');
    expect(retiredDoorRedirect('/kindred/person/dad', '')).toBe('/amazeen/people/dad');
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
    expect(await screen.findByRole('option', { name: /Money · CASHEEN/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Chapters/ })).toBeInTheDocument();
  });
});

describe('apps on and off (ADR 0013)', () => {
  const fresh = rec('house/settings/prefs', { id: 'prefs', theme: 'system', lens: 'moments', flatPages: false, dismissed: ['intro:amazeen', 'intro:casheen', 'intro:kindred', 'intro:refrain'], hidden: [], autoLockMinutes: 15 });
  const open = async () => {
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    });
    return screen.findByRole('option', { name: /Journal · AMAZEEN/ });
  };

  it('starts with Journal, Money and Practices (ADR 0014)', async () => {
    at('/');
    render(<Root store={createMemoryStore([profile, fresh])} />);
    await screen.findByRole('heading', { level: 1 });
    await open();
    expect(screen.getByRole('option', { name: /Money · CASHEEN/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Practices · ROUTEEN/ })).toBeInTheDocument();
  });

  it('reads a choice saved under REFRAIN as ROUTEEN', async () => {
    at('/');
    render(<Root store={createMemoryStore([profile, rec('house/settings/prefs', { ...(fresh.value as object), apps: ['amazeen', 'refrain'] })])} />);
    await screen.findByRole('heading', { level: 1 });
    await open();
    expect(screen.getByRole('option', { name: /Practices · ROUTEEN/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Money · CASHEEN/ })).not.toBeInTheDocument();
  });

  it('never opens an app that is off from its address; it offers to turn it on', async () => {
    const user = userEvent.setup();
    at('/routeen/');
    const store = createMemoryStore([profile, rec('house/settings/prefs', { ...(fresh.value as object), apps: ['amazeen', 'casheen'] })]);
    render(<Root store={store} />);
    expect(await screen.findByRole('heading', { name: 'ROUTEEN is off.' })).toBeInTheDocument();
    expect(document.body.dataset.imprint).not.toBe('routeen');
    await user.click(screen.getByRole('button', { name: 'Turn on ROUTEEN' }));
    await waitFor(() => expect(document.body.dataset.imprint).toBe('routeen'));
    await waitFor(() => expect(store.dump().find((r) => r.key === 'house/settings/prefs')?.value).toMatchObject({ apps: ['amazeen', 'casheen', 'routeen'], hidden: [] }));
  });

  it('switches apps on and off in Settings, keeping Journal always on', async () => {
    const user = userEvent.setup();
    at('/settings');
    render(<Root store={createMemoryStore([profile, fresh])} />);
    const practices = await screen.findByRole('checkbox', { name: 'Practices' });
    expect(screen.getByRole('checkbox', { name: 'Journal' })).toBeDisabled();
    expect(practices).toBeChecked();
    await user.click(practices);
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Practices' })).not.toBeChecked());
    await user.click(screen.getByRole('checkbox', { name: 'Money' }));
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Money' })).not.toBeChecked());
  });
});

describe('one app bar (ADR 0013)', () => {
  const apps: [door: string, primary: RegExp][] = [
    ['/amazeen/', /^Write$/],
    ['/casheen/', /^Add an entry$/],
    ['/routeen/', /^(Mark today|New practice)$/],
  ];
  it.each(apps)('%s keeps back, search and its primary action in the same order', async (door, primary) => {
    at(door);
    const magazine = rec('amazeen/meta/main', { id: 'main', magazine: { title: 'The Weekly Me', editor: 'Ada', createdAt: stamp }, overrides: {} });
    render(<Root store={createMemoryStore([profile, quiet, magazine])} />);
    const back = (await screen.findAllByRole('button', { name: /back to ETERNALL/ }))[0]!;
    const bar = back.closest('header')!;
    const search = within(bar).getByRole('button', { name: 'Search' });
    const action = await within(bar).findByRole(door === '/amazeen/' ? 'link' : 'button', { name: primary });
    const before = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(before(back, search)).toBe(true);
    expect(before(search, action)).toBe(true);
  });
});
