import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryStore, type VaultRecord } from '@eternall/vault';
import { copy as routeenCopy } from '@eternall/routeen/copy';
import { Root } from '../shell/Root';

/** AMAZEEN personal looks (docs/design/amazeen.md §13, ADR 0013): in the vault, applied at once, never in localStorage. */
const stamp = new Date().toISOString();
const rec = (key: string, value: unknown): VaultRecord => ({ key, updatedAt: stamp, deleted: false, value });
const quiet = rec('house/settings/prefs', { id: 'prefs', theme: 'light', lens: 'moments', flatPages: false, dismissed: ['intro:amazeen'], hidden: [], autoLockMinutes: 15 });
const magazine = rec('amazeen/meta/main', { id: 'main', magazine: { title: 'The Weekly Me', editor: 'Ada', createdAt: stamp }, overrides: {} });

beforeEach(() => {
  window.matchMedia = ((q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
  window.localStorage.clear();
  document.documentElement.setAttribute('data-host-theme', '');
});

describe('your edition’s look', () => {
  it('applies a ready-made look at once and keeps it in the vault, never in localStorage', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/amazeen/settings');
    const store = createMemoryStore([quiet, magazine]);
    render(<Root store={store} />);
    const riso = await screen.findByRole('radio', { name: /^Riso Pink stock/ }, { timeout: 4000 });
    await user.click(riso);
    await waitFor(() => expect(store.dump().find((r) => r.key === 'amazeen/prefs/look')?.value).toMatchObject({ id: 'look', preset: 'riso' }));
    expect(document.body.dataset.look).toBe('');
    expect(document.head.querySelector('style[data-amazeen-look]')?.textContent).toContain('--paper: #f6eef0');
    await user.click(screen.getByRole('radio', { name: 'Extra large' }));
    await waitFor(() => expect(store.dump().find((r) => r.key === 'amazeen/prefs/look')?.value).toMatchObject({ size: 'xl' }));
    expect(Object.keys(window.localStorage)).toEqual([]);
  });

  it('leaves the house theme alone: no theme switch and no "t" inside ETERNALL', async () => {
    window.history.replaceState(null, '', '/amazeen/settings');
    render(<Root store={createMemoryStore([quiet, magazine])} />);
    await screen.findByRole('heading', { name: 'Your edition’s look' }, { timeout: 4000 });
    const before = document.documentElement.dataset.theme;
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 't' }));
    });
    expect(document.documentElement.dataset.theme).toBe(before);
    expect(window.localStorage.getItem('amazeen:theme')).toBeNull();
  });
});

describe('every app has its own looks (ADR 0014)', () => {
  const quietAll = rec('house/settings/prefs', { id: 'prefs', theme: 'light', lens: 'moments', flatPages: false, dismissed: ['intro:amazeen', 'intro:casheen', 'intro:routeen'], hidden: [], autoLockMinutes: 15 });

  it('CASHEEN: a book is chosen, worn at once and kept in the vault', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/casheen/look');
    const store = createMemoryStore([quietAll]);
    render(<Root store={store} />);
    await user.click(await screen.findByRole('radio', { name: /^Blue ruling/ }, { timeout: 4000 }));
    await waitFor(() => expect(store.dump().find((r) => r.key === 'ledger/look/look')?.value).toMatchObject({ preset: 'blue' }));
    expect(document.head.querySelector("style[data-look='casheen']")?.textContent).toContain('--paper: #edf1f5');
    await user.click(screen.getByRole('radio', { name: 'Clerk' }));
    await waitFor(() => expect(store.dump().find((r) => r.key === 'ledger/look/look')?.value).toMatchObject({ type: 'clerk' }));
    expect(Object.keys(window.localStorage)).toEqual([]);
  });

  it('ROUTEEN: a sky is chosen under the sky’s look, and Reset offers Undo', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/routeen/sky');
    const store = createMemoryStore([quietAll]);
    render(<Root store={store} />);
    expect(await screen.findByRole('heading', { name: routeenCopy.sky.look }, { timeout: 4000 })).toBeInTheDocument();
    await user.click(await screen.findByRole('radio', { name: /^Senja/ }));
    await waitFor(() => expect(store.dump().find((r) => r.key === 'refrain/look/look')?.value).toMatchObject({ preset: 'senja' }));
    expect(document.body.dataset.look).toBe('');
    await user.click(screen.getByRole('button', { name: 'Reset to Fajar' }));
    await waitFor(() => expect(store.dump().find((r) => r.key === 'refrain/look/look')?.value).toMatchObject({ preset: 'fajar' }));
    expect(await screen.findByRole('button', { name: 'Undo' })).toBeInTheDocument();
  });
});
