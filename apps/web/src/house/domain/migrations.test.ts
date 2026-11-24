import { createMemoryStore, Vault } from '@eternall/vault';
import { INSCRIPTION_PATH, type Inscription } from './house';
import { AMAZEEN_ENTRY_PATH, MIGRATIONS_PATH, attributionFor, finishedNote, inscriptionIdFor, migrateMarginalia, migratePrologue, seasonInscription, seasonsToMigrate, underlineQuote, type JournalEntry, type RetiredHope, type RetiredSeason, type RetiredUnderline, type RetiredWork } from './migrations';

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

describe('MARGINALIA → journal quotes', () => {
  const waves: RetiredWork = { id: 'w1', title: 'The Waves', by: 'Virginia Woolf', finished: '2026-10-02', landing: { word: 'tidal' }, createdAt: '2026-09-01T09:00:00.000Z' };
  const beloved: RetiredWork = { id: 'w2', title: 'Beloved', by: 'Toni Morrison', finished: '2026-11-01', landing: { stars: 4 }, createdAt: '2026-10-01T09:00:00.000Z' };
  const reading: RetiredWork = { id: 'w3', title: 'Middlemarch', by: '', finished: null, landing: null, createdAt: '2026-11-10T09:00:00.000Z' };
  const line: RetiredUnderline = { id: 'u1', workId: 'w1', text: '  I am made and remade continually.  ', locator: 'p. 91', note: 'Yes — this year.', createdAt: '2026-09-20T08:30:00.000Z' };

  it('says who said it and where, in at most 80 characters', () => {
    expect(attributionFor(waves, 'p. 91')).toBe('Virginia Woolf, The Waves, p. 91');
    expect(attributionFor({ title: 'Untitled zine', by: '' }, '')).toBe('Untitled zine');
    expect(attributionFor(undefined, '')).toBe('Unknown');
    expect(attributionFor({ title: 'x'.repeat(120), by: 'A' }, '').length).toBe(80);
  });

  it('keeps the passage, then the margin note as a second paragraph', () => {
    expect(underlineQuote(line, waves)).toEqual({
      id: 'mg_u1', kind: 'quote', body: 'I am made and remade continually.\n\nYes — this year.', attribution: 'Virginia Woolf, The Waves, p. 91',
      section: 'culture', mood: 3, starred: false, createdAt: line.createdAt, updatedAt: line.createdAt,
    });
  });

  it('notes a finished work, with its landing', () => {
    expect(finishedNote(beloved).body).toBe('Finished “Beloved” by Toni Morrison. ★★★★☆');
    expect(finishedNote(waves).body).toBe('Finished “The Waves” by Virginia Woolf. In a word: tidal.');
    expect(finishedNote(beloved).createdAt).toBe('2026-11-01T12:00:00.000Z');
  });

  it('runs once, keeps the originals, and picks up what arrives later', async () => {
    const vault = await Vault.open(createMemoryStore([]));
    for (const w of [waves, beloved, reading]) vault.collection<RetiredWork>('marginalia/work').put(w);
    vault.collection<RetiredUnderline>('marginalia/underline').put(line);
    // one quote for the underline; one note for Beloved (finished, no underlines); none for Middlemarch
    expect(migrateMarginalia(vault)).toBe(2);
    const entries = vault.collection<JournalEntry>(AMAZEEN_ENTRY_PATH);
    expect(entries.get('mg_u1')?.kind).toBe('quote');
    expect(entries.get('mg_w2')?.kind).toBe('note');
    expect(entries.get('mg_w1')).toBeUndefined();
    expect(vault.collection('marginalia/underline').get('u1')).toBeTruthy();
    expect(migrateMarginalia(vault)).toBe(0);
    entries.remove('mg_u1');
    expect(migrateMarginalia(vault)).toBe(0);
    vault.collection<RetiredUnderline>('marginalia/underline').put({ ...line, id: 'u2', text: 'Another' });
    expect(migrateMarginalia(vault)).toBe(1);
    expect(vault.collection(MIGRATIONS_PATH).get('marginalia')).toEqual({ id: 'marginalia', underlines: ['u1', 'u2'], works: ['w2'] });
  });
});
