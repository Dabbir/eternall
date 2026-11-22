import { createMemoryStore, Vault } from '@eternall/vault';
import { buildLifeline, contributionContext } from './lifeline';
import { INSCRIPTION_PATH } from './house';

const profile = { id: 'me' as const, name: 'Ada', birthDate: '1990-06-15', horizonYears: 90, hemisphere: 'north' as const, createdAt: '' };
const ins = (id: string, date: string, tone: 'joy' | 'grief') => ({ id, date, title: id, body: '', tone, createdAt: date, updatedAt: date });

describe('buildLifeline', () => {
  it('merges house tones with imprint layers, house first', async () => {
    const vault = await Vault.open(createMemoryStore());
    const col = vault.collection(INSCRIPTION_PATH);
    col.put(ins('a', '2026-11-16', 'joy'));
    col.put(ins('b', '2026-11-17', 'joy'));
    col.put(ins('c', '2026-11-18', 'grief'));
    const ctx = contributionContext({ data: vault, today: '2026-11-20', profile });
    const now = ctx.weekIndexOf('2026-11-20')!;
    const model = buildLifeline(ctx, [
      { tones: new Map([[now, 'calm' as const], [now - 1, 'calm' as const]]), markers: new Map([[now + 10, 'letter-sealed' as const]]) },
      { markers: new Map([[now + 10, 'letter-ready' as const]]) },
    ])!;
    expect(model.now).toBe(now);
    expect(model.tones.get(now)).toBe('joy');
    expect(model.tones.get(now - 1)).toBe('calm');
    expect(model.markers.get(now + 10)).toBe('letter-ready');
    expect(model.total).toBe(4680);
  });

  it('is null without a profile', async () => {
    const vault = await Vault.open(createMemoryStore());
    expect(buildLifeline(contributionContext({ data: vault, today: '2026-11-20', profile: null }), [])).toBeNull();
  });
});
