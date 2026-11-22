import { legacyToRecords } from './legacy';

describe('legacyToRecords', () => {
  it('maps the v1 archive onto vault records, inks onto cloths', () => {
    const recs = legacyToRecords({
      version: 1,
      profile: { name: 'Ada', birthDate: '1990-06-15', horizonYears: 90, createdAt: '2026-01-01T00:00:00Z' },
      inscriptions: [{ id: 'i1', date: '2020-01-01', title: 'T', body: '', tone: 'joy', createdAt: 'x', updatedAt: 'y' }],
      capsules: [{ id: 'c1', title: 'L', body: 'B', sealedOn: '2026-01-01', opensOn: '2027-01-01', fingerprint: 'f', openedAt: null }],
      chapters: [{ id: 'h1', title: 'Berlin', start: '2015-01-01', end: null, ink: 'moss', note: '' }],
      settings: { theme: 'dark', lens: 'plain' },
    });
    const keys = recs.map((r) => r.key).sort();
    expect(keys).toEqual(['envoi/letter/c1', 'folio/chapter/h1', 'house/inscription/i1', 'house/profile/me', 'house/settings/prefs']);
    expect(recs.find((r) => r.key === 'folio/chapter/h1')!.value).toMatchObject({ cloth: 4 });
  });

  it('ignores anything that is not a v1 archive', () => {
    expect(legacyToRecords({ version: 2 })).toEqual([]);
    expect(legacyToRecords('nope')).toEqual([]);
  });
});
