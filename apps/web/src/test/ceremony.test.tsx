import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { todayISO } from '@eternall/core';
import { createMemoryStore, type VaultRecord } from '@eternall/vault';
import { Root } from '../shell/Root';

/** Ceremonies (docs/DESIGN.md §5): the data is written first, the moment is decorative and optional. */
const today = todayISO();
const stamp = new Date().toISOString();
const rec = (key: string, value: unknown): VaultRecord => ({ key, updatedAt: stamp, deleted: false, value });
const quiet = rec('house/settings/prefs', { id: 'prefs', theme: 'system', lens: 'moments', flatPages: false, dismissed: ['intro:kindred', 'intro:ledger'], hidden: [], autoLockMinutes: 15 });
const profile = rec('house/profile/me', { id: 'me', name: 'Ada', birthDate: '1992-03-04', horizonYears: 90, hemisphere: 'north', createdAt: stamp });
const dad = rec('kindred/person/dad', { id: 'dad', name: 'Dad', drawer: 'Family', closeness: 'inner', howWeMet: '', dates: [], createdAt: stamp });

const motion = (reduce: boolean) => {
  window.matchMedia = ((q: string) => ({ matches: reduce && q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
};
function at(path: string) {
  window.history.replaceState(null, '', path);
}

describe('ceremonies', () => {
  it('play after the save, hidden from assistive tech, and step aside on their own', async () => {
    motion(false);
    const user = userEvent.setup();
    const store = createMemoryStore([quiet, dad]);
    at('/kindred/person/dad');
    render(<Root store={store} />);
    await user.click(await screen.findByRole('button', { name: 'I saw them today' }));
    const layer = document.querySelector('.ceremony');
    expect(layer).not.toBeNull();
    expect(layer).toHaveAttribute('aria-hidden', 'true');
    expect(layer!.textContent).toContain('Dad');
    await waitFor(() => expect(store.dump().some((r) => r.key === `kindred/seen/dad_${today}`)).toBe(true));
    await waitFor(() => expect(document.querySelector('.ceremony')).toBeNull(), { timeout: 2000 });
  });

  it('never play under reduced motion, and the save is the same', async () => {
    motion(true);
    const user = userEvent.setup();
    const store = createMemoryStore([quiet]);
    at('/ledger/');
    render(<Root store={store} />);
    await user.type(await screen.findByLabelText('Write one line'), 'kopi 25rb{Enter}');
    await waitFor(() => expect(store.dump().some((r) => r.key.startsWith('ledger/entry/'))).toBe(true));
    expect(document.querySelector('.ceremony')).toBeNull();
  });

  it('let the next line be typed while LEDGER’s moment plays', async () => {
    motion(false);
    const user = userEvent.setup();
    const store = createMemoryStore([quiet]);
    at('/ledger/');
    render(<Root store={store} />);
    const line = await screen.findByLabelText('Write one line');
    await user.type(line, 'kopi 25rb{Enter}');
    expect(document.querySelector('.ceremony')?.textContent).toContain('Rp 25.000');
    expect(line).toHaveFocus();
    await user.type(line, 'krl 5rb{Enter}');
    await waitFor(() => expect(store.dump().filter((r) => r.key.startsWith('ledger/entry/'))).toHaveLength(2));
  });

  it('carve a new inscription and shelve a new chapter in the house', async () => {
    motion(false);
    const user = userEvent.setup();
    const store = createMemoryStore([quiet, profile]);
    at(`/inscriptions?new=1&date=${today}`);
    const { unmount } = render(<Root store={store} />);
    const dialog = await screen.findByRole('dialog', { name: 'Inscribe a memory' });
    await user.type(within(dialog).getByLabelText('Title'), 'First frost');
    await user.click(within(dialog).getByLabelText('Joy'));
    await user.click(within(dialog).getByRole('button', { name: 'Inscribe' }));
    expect(document.querySelector('.ceremony .hr-carved')?.textContent).toContain('First frost');
    unmount();

    at('/chapters?new=1');
    render(<Root store={createMemoryStore([quiet, profile])} />);
    const ch = await screen.findByRole('dialog', { name: 'New chapter' });
    await user.type(within(ch).getByLabelText('Title'), 'Berlin');
    const began = within(ch).getByLabelText('Began');
    await user.clear(began);
    await user.type(began, '2015-01-01');
    await user.click(within(ch).getByRole('button', { name: 'Add to the shelf' }));
    expect(document.querySelector('.ceremony .hr-shelved')?.textContent).toContain('Berlin');
  });
});
