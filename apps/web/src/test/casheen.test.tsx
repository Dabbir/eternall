import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { todayISO } from '@eternall/core';
import { createMemoryStore, type VaultRecord } from '@eternall/vault';
import { Root } from '../shell/Root';

/** CASHEEN's promise (docs/design/casheen.md): one line in, one entry out; amounts stay in CASHEEN. */
const today = todayISO();
const month = today.slice(0, 7);
const stamp = new Date().toISOString();
const rec = (key: string, value: unknown): VaultRecord => ({ key, updatedAt: stamp, deleted: false, value });
const quiet = rec('house/settings/prefs', { id: 'prefs', theme: 'system', lens: 'moments', flatPages: false, dismissed: ['intro:casheen', 'intro:amazeen'], hidden: [], autoLockMinutes: 15 });
const profile = rec('house/profile/me', { id: 'me', name: 'Ada', birthDate: '1992-03-04', horizonYears: 90, hemisphere: 'north', createdAt: stamp });
const entries = (store: ReturnType<typeof createMemoryStore>) => store.dump().filter((r) => r.key.startsWith('ledger/entry/') && !r.deleted).map((r) => r.value as { amount: number; kind: string; categoryId: string; note: string; date: string });

function at(path: string) {
  window.history.replaceState(null, '', path);
}
beforeEach(() => {
  window.matchMedia = ((q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
});

describe('CASHEEN', () => {
  it('writes an entry from one line and Enter', async () => {
    const user = userEvent.setup();
    const store = createMemoryStore([quiet]);
    at('/casheen/');
    render(<Root store={store} />);
    const line = await screen.findByLabelText('Write one line');
    await user.type(line, 'kopi 25rb');
    expect(screen.getByText('Rp 25.000')).toBeInTheDocument();
    expect((screen.getByLabelText('Category') as HTMLSelectElement).value).toBe('food');
    await user.keyboard('{Enter}');
    await waitFor(() => expect(entries(store)).toEqual([expect.objectContaining({ amount: 25000, kind: 'out', categoryId: 'food', note: 'kopi', date: today })]));
    expect(line).toHaveValue('');
    expect(await screen.findByRole('button', { name: /kopi/ })).toBeInTheDocument();
  });

  it('learns a correction for next time', async () => {
    const user = userEvent.setup();
    const store = createMemoryStore([quiet]);
    at('/casheen/');
    render(<Root store={store} />);
    const line = await screen.findByLabelText('Write one line');
    await user.type(line, 'netflix 186rb');
    await user.selectOptions(screen.getByLabelText('Category'), 'fun');
    await user.keyboard('{Enter}');
    await waitFor(() => expect(entries(store)[0]).toMatchObject({ categoryId: 'fun' }));
    await user.type(line, 'netflix 186rb');
    expect((screen.getByLabelText('Category') as HTMLSelectElement).value).toBe('fun');
    expect(screen.getByText('learned')).toBeInTheDocument();
  });

  it('writes several pasted lines at once, leaving out ones without an amount', async () => {
    const user = userEvent.setup();
    const store = createMemoryStore([quiet]);
    at('/casheen/');
    render(<Root store={store} />);
    const line = await screen.findByLabelText('Write one line');
    await user.click(line);
    await user.paste('kopi 25rb\ngaji 8jt\nlupa');
    expect(screen.getByText(/2 of 3 lines ready/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Write 2' }));
    await waitFor(() => expect(entries(store)).toHaveLength(2));
    expect(entries(store).find((e) => e.kind === 'in')).toMatchObject({ amount: 8000000, categoryId: 'salary' });
  });

  it('says plainly when a budget is over, in its own month', async () => {
    const store = createMemoryStore([
      quiet,
      rec(`ledger/entry/a`, { id: 'a', kind: 'out', amount: 25000, categoryId: 'food', date: today, note: 'kopi', createdAt: stamp }),
      rec(`ledger/budget/${month}`, { id: month, limits: { food: 20000 } }),
    ]);
    at(`/casheen/budget/${month}`);
    render(<Root store={store} />);
    const row = (await screen.findByRole('rowheader', { name: 'Food' })).closest('tr')!;
    expect(within(row).getByText('over by 5.000')).toBeInTheDocument();
  });

  it('the thumb index opens every month of the year, and The month leads back from Budget', async () => {
    const user = userEvent.setup();
    const store = createMemoryStore([quiet]);
    at(`/casheen/budget/${month}`);
    render(<Root store={store} />);
    const index = await screen.findByRole('list', { name: `Months of ${month.slice(0, 4)}` });
    // all twelve notches are links, months still to come included
    expect(within(index).getAllByRole('link')).toHaveLength(12);
    await user.click(screen.getByRole('link', { name: 'The month' }));
    expect(await screen.findByLabelText('Write one line')).toBeInTheDocument();
    expect(window.location.pathname).toBe(`/casheen/${month}`);
    const december = `${month.slice(0, 4)}-12`;
    await user.click(within(index).getAllByRole('link')[11]!);
    expect(window.location.pathname).toBe(`/casheen/${december}`);
    if (december > month) expect(screen.getByText(/hasn’t begun/)).toBeInTheDocument();
  });

  it('sets a limit by typing it the short way', async () => {
    const user = userEvent.setup();
    const store = createMemoryStore([quiet]);
    at(`/casheen/budget/${month}`);
    render(<Root store={store} />);
    const input = await screen.findByLabelText('Limit for Food');
    await user.type(input, '60rb{Enter}');
    await waitFor(() => expect(store.dump().find((r) => r.key === `ledger/budget/${month}`)?.value).toEqual({ id: month, limits: { food: 60000 } }));
    expect(await screen.findByDisplayValue('60.000')).toBeInTheDocument();
  });

  it('learns your own shorthand on Your words, then reads it in the quick line', async () => {
    const user = userEvent.setup();
    const store = createMemoryStore([quiet]);
    at('/casheen/words');
    const { unmount } = render(<Root store={store} />);
    const amount = (await screen.findByRole('heading', { name: 'Amount words' })).closest('section')!;
    await user.type(within(amount).getByLabelText('Word'), 'goceng');
    await user.type(within(amount).getByLabelText('Amount'), '5rb');
    await user.click(within(amount).getByRole('button', { name: 'Add' }));
    const days = screen.getByRole('heading', { name: 'Day words' }).closest('section')!;
    await user.type(within(days).getByLabelText('Word'), 'kemarin');
    await user.click(within(days).getByRole('button', { name: 'Add' }));
    expect(within(days).getByText('“kemarin” is already understood.')).toBeInTheDocument();
    await user.clear(within(days).getByLabelText('Word'));
    await user.type(within(days).getByLabelText('Word'), 'semalem');
    await user.click(within(days).getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(store.dump().find((r) => r.key === 'ledger/terms/terms')?.value).toMatchObject({ fixed: [{ word: 'goceng', amount: 5000 }], days: [{ word: 'semalem', daysAgo: 1 }] }));
    unmount();

    at('/casheen/');
    render(<Root store={store} />);
    const line = await screen.findByLabelText('Write one line');
    await user.type(line, 'parkir goceng semalem');
    expect(screen.getByText(/your words: goceng → Rp 5\.000 · semalem → yesterday/)).toBeInTheDocument();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(entries(store)[0]).toMatchObject({ amount: 5000, categoryId: 'transport', note: 'parkir' }));
  });

  it('keeps money inside CASHEEN: the house shows nothing of it (ADR 0013)', async () => {
    at('/almanac');
    render(<Root store={createMemoryStore([quiet, profile, rec('ledger/entry/a', { id: 'a', kind: 'out', amount: 777777, categoryId: 'food', date: today, note: 'warung', createdAt: stamp })])} />);
    await screen.findByRole('heading', { level: 1 });
    expect(document.body.textContent).not.toMatch(/777[.,]?777|CASHEEN|warung|Entries written/);
    // and it offers the house nothing but its own opt-in reminder
    const { casheen } = await import('@eternall/casheen');
    const offered = (['lifeline', 'weekLines', 'memories', 'almanacFacts', 'redLetterDays', 'badge', 'provides'] as const).filter((k) => k in casheen);
    expect(offered).toEqual([]);
  });

  it('is its own site', async () => {
    at('/casheen/');
    render(<Root store={createMemoryStore([quiet])} />);
    await screen.findByLabelText('Write one line');
    expect(document.querySelector('.spine')).toBeNull();
    expect(document.body.dataset.imprint).toBe('casheen');
    expect(screen.getByRole('button', { name: /Close the book/ })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/ETERNALL/);
  });
});
