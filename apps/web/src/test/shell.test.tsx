import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { addDays, addYears, todayISO } from '@eternall/core';
import { createMemoryStore, type VaultRecord } from '@eternall/vault';
import { fingerprintOf } from '@eternall/envoi/letters';
import { Root } from '../shell/Root';

const today = todayISO();
const stamp = new Date().toISOString();
const rec = (key: string, value: unknown): VaultRecord => ({ key, updatedAt: stamp, deleted: false, value });
const profile = rec('house/profile/me', { id: 'me', name: 'Ada', birthDate: addYears(today, -30), horizonYears: 90, hemisphere: 'north', createdAt: stamp });
const quiet = rec('house/settings/prefs', { id: 'prefs', theme: 'system', lens: 'moments', flatPages: false, dismissed: ['intro:envoi', 'intro:folio', 'intro:almanack'], hidden: [], autoLockMinutes: 15 });

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
    expect(within(doors).getByText('ENVOI')).toBeInTheDocument();
    expect(within(doors).getByText('Chapters of your life')).toBeInTheDocument();
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

describe('ENVOI on its own', () => {
  it('works standalone in focus mode, without a profile', async () => {
    at('/envoi/');
    render(<Root store={createMemoryStore([quiet])} />);
    expect(await screen.findByRole('heading', { name: /Write to the person/ })).toBeInTheDocument();
    expect(document.querySelector('.shell')).toHaveClass('is-focus');
  });

  it('seals a letter and never shows its contents before the day', async () => {
    const user = userEvent.setup();
    const store = createMemoryStore([quiet]);
    at('/envoi/write');
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
    at('/envoi/letter/l1');
    render(<Root store={createMemoryStore([quiet, letter])} />);
    await user.click((await screen.findAllByRole('button', { name: 'Break the seal' })).at(-1)!);
    expect(await screen.findByText('You made it.')).toBeInTheDocument();
    expect(screen.getByText(/Seal intact/)).toBeInTheDocument();
  });
});

describe('FOLIO and the lifeline', () => {
  it('names a chapter and offers it to the house as a band', async () => {
    const user = userEvent.setup();
    const store = createMemoryStore([profile, quiet]);
    at('/folio/?new=1');
    render(<Root store={store} />);
    const dialog = await screen.findByRole('dialog', { name: 'New chapter' });
    await user.type(within(dialog).getByLabelText('Title'), 'Berlin');
    const began = within(dialog).getByLabelText('Began');
    await user.clear(began);
    await user.type(began, addYears(today, -5));
    await user.click(within(dialog).getByRole('button', { name: 'Add to the shelf' }));
    expect(await screen.findByRole('button', { name: /Berlin/ })).toBeInTheDocument();
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
    expect(await screen.findByRole('option', { name: /ENVOI · Letters to your future/ })).toBeInTheDocument();
  });
});
