import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { createMemoryStore, type VaultRecord } from '@eternall/vault';
import { MARK_PATH as CASHEEN_MARK } from '@eternall/casheen/mark';
import { MARK_PATH as ROUTEEN_MARK } from '@eternall/routeen/mark';
import { Root } from '../shell/Root';

/**
 * Every app carries a monogram in one family with AMAZEEN's A (docs/BRAND.md §5): the same mark in its
 * app bar, its icons and its logo files, drawn from one path.
 */
const stamp = new Date().toISOString();
const quiet: VaultRecord = { key: 'house/settings/prefs', updatedAt: stamp, deleted: false, value: { id: 'prefs', theme: 'system', lens: 'moments', flatPages: false, dismissed: ['intro:amazeen', 'intro:routeen', 'intro:casheen'], hidden: [], autoLockMinutes: 15, apps: ['amazeen', 'routeen', 'casheen'] } };
// Vitest runs from the repository root.
const publicFile = (p: string) => readFileSync(join(process.cwd(), 'apps/web/public', p), 'utf8');

beforeEach(() => {
  window.matchMedia = ((q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
});

describe.each([
  ['casheen', 'CASHEEN', CASHEEN_MARK],
  ['routeen', 'ROUTEEN', ROUTEEN_MARK],
])('%s', (id, name, mark) => {
  it('shows its monogram beside its name in the app bar, as decoration', async () => {
    window.history.replaceState(null, '', `/${id}/`);
    render(<Root store={createMemoryStore([quiet])} />);
    const title = await screen.findByRole('link', { name: new RegExp(`^${name}`) });
    const glyph = title.querySelector('.appbar__mark svg');
    expect(glyph).not.toBeNull();
    expect(glyph).toHaveAttribute('aria-hidden', 'true');
    expect(glyph!.querySelector('path')).toHaveAttribute('d', mark);
  });
  it('draws its app icon from the same monogram', () => {
    expect(publicFile(`icons/${id}.svg`)).toContain(mark);
  });
});
