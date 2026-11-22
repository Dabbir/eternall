import { StrictMode } from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from './App';
import { createEntry } from './domain/entries';
import { sampleEntries } from './domain/sample';
import { createMemoryAdapter, DRAFT_KEY, STORAGE_KEY } from './domain/storage';
import type { AppData } from './domain/types';
import { matchRoute } from './router/router';
import { NowProvider } from './state/now';
import { reducer } from './state/reducer';
import { StoreProvider, useStore } from './state/store';

function seed(data: Partial<AppData> = {}): void {
  const full: AppData = {
    version: 2,
    tombstones: {},
    magazine: { title: 'Test Weekly', editor: 'Ada Lovelace', createdAt: new Date().toISOString() },
    entries: [],
    overrides: {},
    ...data,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
}

function renderAt(path: string) {
  window.history.replaceState(null, '', path);
  return render(<App />);
}

function stored(): AppData {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as AppData;
}

describe('router', () => {
  it('maps URLs to typed routes and rejects junk', () => {
    expect(matchRoute('/')).toEqual({ name: 'desk' });
    expect(matchRoute('/write/quote')).toEqual({ name: 'write', kind: 'quote' });
    expect(matchRoute('/write/poem')).toEqual({ name: 'not-found' });
    expect(matchRoute('/issue/2026-W47', '?p=4')).toEqual({ name: 'issue', key: '2026-W47', page: 4 });
    expect(matchRoute('/issue/2026-W47', '?p=-3')).toEqual({ name: 'issue', key: '2026-W47', page: 1 });
    expect(matchRoute('/issue/not-a-week')).toEqual({ name: 'not-found' });
    expect(matchRoute('/shelf', '?q=bread%20loaf')).toEqual({ name: 'shelf', query: 'bread loaf' });
    expect(matchRoute('/settings/extra')).toEqual({ name: 'not-found' });
  });
});

describe('reducer', () => {
  const base: AppData = { version: 2, magazine: null, entries: [], tombstones: {}, overrides: {} };
  const entry = createEntry({ kind: 'note', body: 'hello' }, { section: 'life', mood: 3, starred: false });

  it('adds idempotently, toggles stars and removes entries', () => {
    let s = reducer(base, { type: 'entry/add', entry });
    s = reducer(s, { type: 'entry/add', entry });
    expect(s.entries).toHaveLength(1);
    s = reducer(s, { type: 'entry/toggleStar', id: entry.id, now: '2030-01-01T00:00:00.000Z' });
    expect(s.entries[0]).toMatchObject({ starred: true, updatedAt: '2030-01-01T00:00:00.000Z' });
    s = reducer(s, { type: 'entry/delete', id: entry.id, at: '2030-01-02T00:00:00.000Z' });
    expect(s.entries).toHaveLength(0);
  });

  it('sets and clears cover overrides', () => {
    let s = reducer(base, { type: 'override/set', key: '2026-W47', override: { ink: 'pink' }, at: '2030-01-01T00:00:00.000Z' });
    expect(s.overrides).toEqual({ '2026-W47': { ink: 'pink' } });
    s = reducer(s, { type: 'override/set', key: '2026-W47', override: null, at: '2030-01-01T00:00:00.000Z' });
    expect(s.overrides).toEqual({});
  });
});

describe('app flows', () => {
  it('onboards: validates the name, then creates the magazine', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.click(await screen.findByRole('button', { name: 'Start with blank pages' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Give your magazine a name');

    await user.type(screen.getByLabelText('Name your magazine'), 'Field Notes');
    await user.click(screen.getByRole('button', { name: 'Start with blank pages' }));

    expect(await screen.findByRole('heading', { name: /Issue No\.\s1 is blank pages/i })).toBeInTheDocument();
    expect(stored().magazine?.title).toBe('Field Notes');
  });

  it('files a note from the composer and shows it on the desk', async () => {
    const user = userEvent.setup();
    seed();
    renderAt('/write/note');

    const field = await screen.findByLabelText('Note');
    await user.click(screen.getByRole('button', { name: /File to No\. 1/ }));
    expect(screen.getByText('Write a line or two before filing.')).toBeInTheDocument();
    expect(field).toHaveFocus();

    await user.type(field, 'Saw a heron on the canal.');
    await user.click(screen.getByRole('radio', { name: 'Work' }));
    await user.click(screen.getByRole('button', { name: /File to No\. 1/ }));

    expect(await screen.findByText('Filed to No. 1.', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete “Saw a heron on the canal\.”/ })).toBeInTheDocument();
    expect(stored().entries).toMatchObject([{ kind: 'note', body: 'Saw a heron on the canal.', section: 'work' }]);
  });

  it('deletes with undo', async () => {
    const user = userEvent.setup();
    seed({ entries: [createEntry({ kind: 'note', body: 'Keep me around' }, { section: 'life', mood: 4, starred: false })] });
    renderAt('/');

    await user.click(await screen.findByRole('button', { name: /Delete “Keep me around”/ }));
    expect(screen.queryByRole('button', { name: /Delete “Keep me around”/ })).not.toBeInTheDocument();
    expect(screen.getByText('Nothing filed yet.')).toBeInTheDocument();
    expect(stored().entries).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByRole('button', { name: /Delete “Keep me around”/ })).toBeInTheDocument();
    expect(stored().entries).toHaveLength(1);
  });

  it('keeps an unsaved draft across visits and restores it', async () => {
    const user = userEvent.setup();
    seed();
    const { unmount } = renderAt('/write/story');
    await user.type(await screen.findByLabelText('Headline'), 'Half-finished thought');
    await act(() => new Promise((r) => setTimeout(r, 600))); // autosave debounce
    unmount();

    renderAt('/write/story');
    expect(await screen.findByLabelText('Headline')).toHaveValue('Half-finished thought');
    expect(screen.getByText('Picked up where you left off.')).toBeInTheDocument();
  });

  it('reads an issue page by page with the keyboard', async () => {
    const user = userEvent.setup();
    seed({ entries: sampleEntries() });
    renderAt('/shelf');

    const covers = await screen.findAllByRole('link', { name: /^No\. \d+/ });
    await user.click(covers[covers.length - 1] as HTMLElement); // oldest issue
    expect(await screen.findByText(/Page 1 of \d+: Cover/, {}, { timeout: 3000 })).toBeInTheDocument();

    await user.keyboard('{ArrowRight}');
    expect(await screen.findByRole('heading', { name: 'Contents' })).toBeInTheDocument();
    expect(window.location.search).toBe('?p=2');

    await user.keyboard('{End}');
    expect(await screen.findByRole('heading', { name: /Thanks for reading/ })).toBeInTheDocument();
  });

  it('searches across every issue with highlighted matches', async () => {
    const user = userEvent.setup();
    seed({ entries: sampleEntries() });
    renderAt('/shelf');

    await user.type(await screen.findByRole('searchbox'), 'bread');
    const results = await screen.findByRole('region', { name: 'Search results' });
    await waitFor(() => expect(within(results).getAllByRole('link').length).toBeGreaterThan(0));
    expect(within(results).getAllByText(/bread/i, { selector: 'mark' }).length).toBeGreaterThan(0);

    await user.clear(screen.getByRole('searchbox'));
    await user.type(screen.getByRole('searchbox'), 'zzzxq');
    expect(await screen.findByText('Nothing on file.')).toBeInTheDocument();
  });

  it('shows a friendly page for unknown routes and missing issues', async () => {
    seed();
    renderAt('/nope');
    expect(await screen.findByText('This page never went to print.')).toBeInTheDocument();
  });

  it('survives corrupt storage without crashing', async () => {
    localStorage.setItem(STORAGE_KEY, '{definitely not json');
    renderAt('/');
    expect(await screen.findByRole('button', { name: 'Start with blank pages' })).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{definitely not json'); // untouched until the user acts
  });
});

describe('audit regressions', () => {
  it('#1 never overwrites unreadable storage on boot, even under StrictMode', async () => {
    localStorage.setItem(STORAGE_KEY, '{definitely not json');
    window.history.replaceState(null, '', '/');
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    expect(await screen.findByRole('button', { name: 'Start with blank pages' })).toBeInTheDocument();
    await act(() => new Promise((r) => setTimeout(r, 50)));
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{definitely not json');
  });

  it('#2 erase removes the archive, legacy copy and unfinished drafts', async () => {
    const user = userEvent.setup();
    seed({ entries: sampleEntries() });
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ note: { draft: { kind: 'note', body: 'stale' }, meta: { section: 'life', mood: 3, starred: false }, savedAt: '' } }));
    renderAt('/settings');

    await user.click(await screen.findByRole('button', { name: /Erase everything/ }));
    const confirm = screen.getByRole('button', { name: 'Erase permanently' });
    expect(confirm).toBeDisabled();
    await user.type(screen.getByLabelText(/Type ERASE to confirm/), 'erase');
    await user.click(confirm);

    expect(await screen.findByRole('button', { name: 'Start with blank pages' })).toBeInTheDocument();
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('#3 flushes a pending draft when the tab is hidden inside the debounce window', async () => {
    const user = userEvent.setup();
    seed();
    renderAt('/write/note');
    await user.type(await screen.findByLabelText('Note'), 'Do not lose me');
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull(); // still inside the 450ms debounce

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });

    expect(localStorage.getItem(DRAFT_KEY)).toContain('Do not lose me');
  });

  it('#4 keeps two tabs in sync instead of letting one overwrite the other', async () => {
    const adapter = createMemoryAdapter({ version: 2, magazine: null, entries: [], tombstones: {}, overrides: {} });
    function Probe({ label }: { label: string }) {
      const store = useStore();
      return (
        <div>
          <span data-testid={`${label}-count`}>{store.data.entries.length}</span>
          <button type="button" onClick={() => store.addEntry(createEntry({ kind: 'note', body: `from ${label}` }, { section: 'life', mood: 3, starred: false }))}>
            add {label}
          </button>
        </div>
      );
    }
    const tab = (label: string) => (
      <NowProvider>
        <StoreProvider adapter={adapter}>
          <Probe label={label} />
        </StoreProvider>
      </NowProvider>
    );
    render(
      <>
        {tab('a')}
        {tab('b')}
      </>,
    );
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'add a' }));
    await waitFor(() => expect(screen.getByTestId('b-count')).toHaveTextContent('1'));
    await user.click(screen.getByRole('button', { name: 'add b' }));
    await waitFor(() => expect(screen.getByTestId('a-count')).toHaveTextContent('2'));
    expect((await adapter.load()).data.entries).toHaveLength(2);
  });

  it('#6 single-letter shortcuts work with Caps Lock on', async () => {
    const user = userEvent.setup();
    seed();
    renderAt('/');
    await screen.findByRole('heading', { name: /Issue No\.\s1/ });
    await user.keyboard('N');
    expect(await screen.findByLabelText('Note')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/write/note');
  });
});

describe('day / night edition', () => {
  it('switches with the toggle and the T shortcut, and the Office picker reflects it', async () => {
    const user = userEvent.setup();
    seed();
    renderAt('/');
    const toggles = await screen.findAllByRole('switch', { name: 'Night edition' });
    expect(toggles[0]).toHaveAttribute('aria-checked', 'false');

    await user.click(toggles[0] as HTMLElement);
    expect(document.documentElement.dataset.theme).toBe('dark');
    for (const t of screen.getAllByRole('switch', { name: 'Night edition' })) expect(t).toHaveAttribute('aria-checked', 'true');

    await user.keyboard('t');
    expect(document.documentElement.dataset.theme).toBe('light');

    await user.click(screen.getAllByRole('link', { name: 'Office' })[0] as HTMLElement);
    const system = await screen.findByRole('radio', { name: /System/ });
    expect(screen.getByRole('radio', { name: /Day/ })).toBeChecked();
    await user.click(system);
    expect(localStorage.getItem('amazeen:theme')).toBeNull();
  });
});
