import { act, render, screen } from '@testing-library/react';
import { createMemoryStore, Vault } from '@eternall/vault';
import { createVaultAdapter, ENTRY_PATH, readFromVault } from './vaultAdapter';
import { MoveIn } from './MoveIn';
import { amazeen, MOOD_TONE } from '../index';
import type { AppData, Entry } from '../domain/types';

const entry = (id: string, createdAt: string, mood: 1 | 2 | 3 | 4 | 5 = 5): Entry => ({
  id, kind: 'story', title: `Story ${id}`, body: 'Words words words.', createdAt, updatedAt: createdAt, section: 'life', mood, starred: false,
});
const data = (entries: Entry[]): AppData => ({ version: 2, magazine: { title: 'The Weekly Me', editor: '', createdAt: '2026-01-01T00:00:00.000Z' }, entries, tombstones: {}, overrides: {} });

describe('vault adapter', () => {
  it('stores each entry as its own record and turns deletions into tombstones', async () => {
    const vault = await Vault.open(createMemoryStore());
    const adapter = createVaultAdapter(vault);
    await adapter.save(data([entry('a', '2026-11-16T10:00:00.000Z'), entry('b', '2026-11-17T10:00:00.000Z')]));
    expect(vault.collection(ENTRY_PATH).all()).toHaveLength(2);
    await adapter.save(data([entry('a', '2026-11-16T10:00:00.000Z')]));
    expect(vault.collection(ENTRY_PATH).all()).toHaveLength(1);
    expect(vault.snapshot().some((r) => r.key === `${ENTRY_PATH}/b` && r.deleted)).toBe(true);
    const loaded = await adapter.load();
    expect(loaded.status).toBe('ok');
    expect(loaded.data.magazine?.title).toBe('The Weekly Me');
  });

  it('only writes what changed', async () => {
    const vault = await Vault.open(createMemoryStore());
    const adapter = createVaultAdapter(vault);
    await adapter.save(data([entry('a', '2026-11-16T10:00:00.000Z')]));
    const before = vault.getVersion();
    await adapter.save(data([entry('a', '2026-11-16T10:00:00.000Z')]));
    expect(vault.getVersion()).toBe(before);
  });
});

describe('the imprint definition', () => {
  it('paints the issue tone and offers memories', async () => {
    const vault = await Vault.open(createMemoryStore());
    await createVaultAdapter(vault).save(data([entry('a', '2026-11-16T10:00:00.000Z', 1), entry('b', '2026-11-17T10:00:00.000Z', 1)]));
    const profile = { id: 'me' as const, name: 'Ada', birthDate: '1990-06-15', horizonYears: 90, hemisphere: 'north' as const, createdAt: '' };
    const ctx = { data: vault, today: '2026-11-20', profile, weekIndexOf: () => 42 };
    expect(amazeen.lifeline!(ctx).tones?.get(42)).toBe(MOOD_TONE[1]);
    expect(amazeen.memories!(ctx).map((m) => m.title)).toEqual(['Story a', 'Story b']);
    expect(amazeen.hasData(ctx)).toBe(true);
  });
});

describe('moving in from AMAZEEN (F15)', () => {
  it('accepts an archive only from an allowed origin with the right nonce', async () => {
    const vault = await Vault.open(createMemoryStore());
    const sent: { msg: { type: string; nonce?: string }; origin: string }[] = [];
    const opener = { postMessage: (msg: { type: string; nonce?: string }, origin: string) => sent.push({ msg, origin }) };
    Object.defineProperty(window, 'opener', { value: opener, configurable: true });
    render(<MoveIn vault={vault} onOpenDesk={() => {}} />);
    const ready = sent.find((s) => s.msg.type === 'eternall:ready')!;
    expect(ready.origin).toBe('https://amazeen.app');

    const archive = JSON.stringify(data([entry('x', '2026-10-01T10:00:00.000Z')]));
    await act(async () => {
      window.dispatchEvent(new MessageEvent('message', { origin: 'https://evil.example', data: { type: 'amazeen:archive', nonce: ready.msg.nonce, archive } }));
      window.dispatchEvent(new MessageEvent('message', { origin: 'https://amazeen.app', data: { type: 'amazeen:archive', nonce: 'wrong', archive } }));
    });
    expect(readFromVault(vault).entries).toHaveLength(0);

    await act(async () => {
      window.dispatchEvent(new MessageEvent('message', { origin: 'https://amazeen.app', data: { type: 'amazeen:archive', nonce: ready.msg.nonce, archive } }));
    });
    expect(await screen.findByText('Your journal has moved in.')).toBeInTheDocument();
    expect(readFromVault(vault).entries.map((e) => e.id)).toEqual(['x']);
    expect(sent.some((s) => s.msg.type === 'eternall:done')).toBe(true);
    Object.defineProperty(window, 'opener', { value: null, configurable: true });
  });
});
