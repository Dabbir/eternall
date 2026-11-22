import { dayOf, authorHeading, authorKey, catalogue, currentlyReading, echoes, landingLabel, marginaliaStats, offeredQuotes, titleKey, underlinesOf, validateUnderline, validateWork, type Underline, type Work } from './works';

const today = '2026-11-23';
const w = (id: string, title: string, by: string, extra: Partial<Work> = {}): Work => ({ id, title, by, kind: 'book', started: null, finished: null, landing: null, createdAt: '', ...extra });
const waves = w('waves', 'The Waves', 'Virginia Woolf', { started: '2026-10-02', finished: '2026-11-10', landing: { stars: 4 } });
const beloved = w('beloved', 'Beloved', 'Toni Morrison', { finished: '2025-04-01' });
const cities = w('cities', 'Invisible Cities', 'Italo Calvino', { started: '2026-11-15' });
const film = w('stalker', 'Stalker', 'Andrei Tarkovsky', { kind: 'film', finished: '2026-02-01' });
const u = (id: string, workId: string, createdAt: string, offered = false): Underline => ({ id, workId, text: `line ${id}`, locator: '', note: '', offered, createdAt });

describe('marginalia', () => {
  it('sorts the way a library does', () => {
    expect(authorKey('Virginia Woolf')).toBe('woolf, virginia');
    expect(authorHeading('Ursula K. Le Guin')).toBe('Le Guin, U. K.');
    expect(authorKey('Vincent van Gogh')).toBe('van gogh, vincent');
    expect(authorHeading('Homer')).toBe('Homer');
    expect(titleKey('The Waves')).toBe('waves');
  });

  it('files works in drawers by author range, year or kind', () => {
    expect(catalogue([waves, beloved, cities], 'author').map((d) => [d.label, d.works.map((x) => x.id)])).toEqual([
      ['A–C', ['cities']],
      ['M–P', ['beloved']],
      ['T–Z', ['waves']],
    ]);
    expect(catalogue([waves, beloved, cities], 'title').map((d) => d.label)).toEqual(['A–C', 'H–L', 'T–Z']);
    expect(catalogue([waves, beloved, w('x', 'X', '')], 'year').map((d) => d.label)).toEqual(['2026', '2025', 'Undated']);
    expect(catalogue([film, waves], 'kind').map((d) => d.label)).toEqual(['Book', 'Film']);
  });

  it('knows what you are reading now', () => {
    expect(currentlyReading([waves, cities, beloved]).map((x) => x.id)).toEqual(['cities']);
  });

  it('validates a work and its landing', () => {
    expect(validateWork({ title: 'The Waves', by: 'Virginia Woolf', kind: 'book', started: '2026-10-02', finished: '2026-11-10', landing: { word: 'tidal' } }, today).ok).toBe(true);
    const bad = validateWork({ title: '', by: '', kind: 'scroll', started: '2026-11-10', finished: '2026-10-01', landing: { word: 'two words' } }, today);
    expect(bad.ok ? null : bad.errors).toEqual({ title: 'A work needs a title.', kind: 'Choose a kind.', finished: 'It ends after it starts.', landing: 'One word, please.' });
    expect(landingLabel({ stars: 4 })).toBe('★★★★☆');
  });

  it('keeps passages, never whole texts', () => {
    expect(validateUnderline({ text: 'I have made up thousands of stories', locator: 'p. 112', note: '', offered: false }).ok).toBe(true);
    const long = validateUnderline({ text: 'x'.repeat(2001), locator: '', note: '', offered: false });
    expect(long.ok ? null : long.errors.text).toMatch(/passage, not a whole text/);
  });

  it('finds the most underlined work and echoes from other years', () => {
    const lines = [u('1', 'waves', '2026-11-01T10:00:00Z'), u('2', 'waves', '2026-11-02T10:00:00Z'), u('3', 'beloved', '2025-11-21T10:00:00Z')];
    const st = marginaliaStats([waves, beloved, film], lines, today);
    expect(st.finishedThisYear).toBe(2);
    expect(st.mostUnderlined).toMatchObject({ count: 2, work: { id: 'waves' } });
    expect(echoes(lines, today).map((x) => x.id)).toEqual(['3']);
    expect(underlinesOf(lines, 'waves').map((x) => x.id)).toEqual(['1', '2']);
  });

  it('dates an underline by the local day it was made', () => {
    const at = new Date(2026, 10, 23, 0, 30);
    expect(dayOf(at.toISOString())).toBe('2026-11-23');
  });

  it('offers only opted-in underlines to Overheard', () => {
    expect(offeredQuotes([waves], [u('1', 'waves', '', true), u('2', 'waves', ''), u('3', 'gone', '', true)])).toEqual([{ id: '1', text: 'line 1', by: 'Virginia Woolf', workTitle: 'The Waves' }]);
  });
});
