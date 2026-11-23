import { createMemoryStore, Vault } from '@eternall/vault';
import { INSCRIPTION_PATH, type Inscription } from './house';
import { MIGRATIONS_PATH, inscriptionIdFor, migratePrologue, seasonInscription, seasonsToMigrate, type RetiredHope, type RetiredSeason } from './migrations';

const winter: RetiredSeason = { id: 's1', name: 'Winter 2026', theme: 'staying close', start: '2026-12-01', end: '2027-02-28', closedAt: null, epilogue: 'It was quieter than I hoped.' };
const hopes: RetiredHope[] = [
  { id: 'h2', seasonId: 's1', title: 'Learn the cello', state: 'letGo', reflection: '', act: 2 },
  { id: 'h1', seasonId: 's1', title: 'Visit Dad every other Sunday', state: 'bow', reflection: 'Most Sundays.', act: 1 },
  { id: 'hx', seasonId: 'other', title: 'Elsewhere', state: 'stage', reflection: '', act: 1 },
];

describe('PROLOGUE → inscriptions', () => {
  it('writes a season, its acts in order and its epilogue as one inscription', () => {
    const ins = seasonInscription(winter, hopes, '2026-11-23', '2026-11-23T10:00:00.000Z');
    expect(ins.id).toBe('prologue_s1');
    expect(ins.title).toBe('Winter 2026: the season of staying close');
    expect(ins.date).toBe('2026-11-23'); // a season that hasn't begun is dated today, never in the future
    expect(ins.body).toBe(
      'Hopes for Winter 2026, 2026-12-01 to 2027-02-28.\n\nAct I. Visit Dad every other Sunday (took a bow)\nMost Sundays.\n\nAct II. Learn the cello (let go)\n\nEpilogue\nIt was quieter than I hoped.',
    );
    expect(seasonInscription({ ...winter, start: '2026-03-01', theme: '' }, [], '2026-11-23', '').title).toBe('Winter 2026');
    expect(seasonInscription({ ...winter, start: '2026-03-01' }, [], '2026-11-23', '').date).toBe('2026-03-01');
  });

  it('knows which seasons are still owed', () => {
    expect(seasonsToMigrate([winter], undefined)).toEqual([winter]);
    expect(seasonsToMigrate([winter], { id: 'prologue', seasons: ['s1'] })).toEqual([]);
  });

  it('runs once per season, keeps the originals, and never re-creates a deleted inscription', async () => {
    const vault = await Vault.open(createMemoryStore([]));
    vault.collection<RetiredSeason>('prologue/season').put(winter);
    for (const h of hopes) vault.collection<RetiredHope>('prologue/hope').put(h);
    expect(migratePrologue(vault, '2026-11-23')).toBe(1);
    expect(vault.collection<Inscription>(INSCRIPTION_PATH).get(inscriptionIdFor('s1'))?.title).toContain('Winter 2026');
    expect(vault.collection('prologue/season').get('s1')).toBeTruthy();
    expect(migratePrologue(vault, '2026-11-23')).toBe(0);
    vault.collection(INSCRIPTION_PATH).remove(inscriptionIdFor('s1'));
    expect(migratePrologue(vault, '2026-11-23')).toBe(0);
    expect(vault.collection(INSCRIPTION_PATH).get(inscriptionIdFor('s1'))).toBeUndefined();
    expect(vault.collection(MIGRATIONS_PATH).get('prologue')).toEqual({ id: 'prologue', seasons: ['s1'] });
  });
});
