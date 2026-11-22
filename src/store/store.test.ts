import { reducer } from './reducer';
import { loadArchive, parseImport, saveArchive, STORAGE_KEY } from './persistence';
import { EMPTY_DATA, type Capsule } from '../domain/types';

const capsule: Capsule = {
  id: 'c1', title: 'Hi', body: 'x', sealedOn: '2026-01-01', opensOn: '2027-01-01', fingerprint: 'a'.repeat(64), openedAt: null,
};

describe('reducer', () => {
  it('never overwrites a sealed capsule', () => {
    const s1 = reducer(EMPTY_DATA, { type: 'capsule/add', capsule });
    const s2 = reducer(s1, { type: 'capsule/add', capsule: { ...capsule, body: 'tampered' } });
    expect(s2.capsules[0]!.body).toBe('x');
  });

  it('opens a capsule only once', () => {
    let s = reducer(EMPTY_DATA, { type: 'capsule/add', capsule });
    s = reducer(s, { type: 'capsule/open', id: 'c1', at: 'first' });
    s = reducer(s, { type: 'capsule/open', id: 'c1', at: 'second' });
    expect(s.capsules[0]!.openedAt).toBe('first');
  });

  it('erases the archive but keeps display settings', () => {
    const s = reducer({ ...EMPTY_DATA, settings: { theme: 'dark', lens: 'plain' }, capsules: [capsule] }, { type: 'archive/erase' });
    expect(s.capsules).toEqual([]);
    expect(s.settings.theme).toBe('dark');
  });
});

describe('persistence', () => {
  it('round-trips through storage', () => {
    const data = { ...EMPTY_DATA, capsules: [capsule] };
    expect(saveArchive(data)).toEqual({ ok: true });
    expect(loadArchive()).toEqual({ status: 'ok', data });
  });

  it('reports corrupt storage instead of crashing', () => {
    window.localStorage.setItem(STORAGE_KEY, '{nope');
    expect(loadArchive().status).toBe('corrupt');
  });

  it('gives readable import errors', () => {
    expect(() => parseImport('hello')).toThrow(/valid JSON/);
    expect(() => parseImport('{"version":1,"profile":{"name":""}}')).toThrow(/damaged/);
  });
});
