import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryStore, type VaultRecord } from '@eternall/vault';
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
