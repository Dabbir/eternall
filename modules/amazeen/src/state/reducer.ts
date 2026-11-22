import { mergeData, metaStamp } from '../domain/backup';
import type { AppData, Entry, IssueOverride, Magazine } from '../domain/types';

export type Action =
  | { type: 'magazine/set'; magazine: Magazine; at: string }
  | { type: 'entry/add'; entry: Entry }
  | { type: 'entry/update'; entry: Entry }
  | { type: 'entry/delete'; id: string; at: string }
  | { type: 'entry/toggleStar'; id: string; now: string }
  | { type: 'override/set'; key: string; override: IssueOverride | null; at: string }
  | { type: 'data/replace'; data: AppData }
  /** The person replaced the whole archive (import, sample): whatever it drops is recorded as deleted. */
  | { type: 'data/replaceAll'; data: AppData; at: string }
  /** Records pulled from other devices. */
  | { type: 'data/mergeRemote'; incoming: AppData }
  | { type: 'backup/exported'; at: string }
  | { type: 'data/reset' };

export function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'magazine/set':
      return { ...state, magazine: action.magazine, metaUpdatedAt: action.at };
    case 'entry/add': {
      if (state.entries.some((e) => e.id === action.entry.id)) return state;
      // Re-adding a deleted entry (Undo) supersedes its tombstone, and must be strictly newer than
      // the deletion so that other devices accept the restore rather than the delete.
      const deletedAt = state.tombstones[action.entry.id];
      if (deletedAt === undefined) return { ...state, entries: [...state.entries, action.entry] };
      const { [action.entry.id]: _gone, ...tombstones } = state.tombstones;
      const floor = new Date(Date.parse(deletedAt) + 1).toISOString();
      const entry = action.entry.updatedAt > deletedAt ? action.entry : { ...action.entry, updatedAt: floor };
      return { ...state, entries: [...state.entries, entry], tombstones };
    }
    case 'entry/update':
      return { ...state, entries: state.entries.map((e) => (e.id === action.entry.id ? action.entry : e)) };
    case 'entry/delete': {
      if (!state.entries.some((e) => e.id === action.id)) return state;
      return {
        ...state,
        entries: state.entries.filter((e) => e.id !== action.id),
        tombstones: { ...state.tombstones, [action.id]: action.at },
      };
    }
    case 'entry/toggleStar':
      return {
        ...state,
        entries: state.entries.map((e) => (e.id === action.id ? { ...e, starred: !e.starred, updatedAt: action.now } : e)),
      };
    case 'override/set': {
      const { [action.key]: _previous, ...rest } = state.overrides;
      return { ...state, overrides: action.override ? { ...rest, [action.key]: action.override } : rest, metaUpdatedAt: action.at };
    }
    case 'data/replace':
      return action.data;
    case 'data/replaceAll': {
      const kept = new Set(action.data.entries.map((e) => e.id));
      const tombstones: Record<string, string> = { ...action.data.tombstones };
      for (const e of state.entries) if (!kept.has(e.id) && !(e.id in tombstones)) tombstones[e.id] = action.at;
      for (const [id, at] of Object.entries(state.tombstones)) if (!kept.has(id) && !(id in tombstones)) tombstones[id] = at;
      for (const id of kept) delete tombstones[id];
      return { ...action.data, tombstones };
    }
    case 'data/mergeRemote': {
      const merged = mergeData(state, action.incoming, { meta: 'newest' });
      const unchanged =
        merged.added + merged.updated + merged.removed === 0 &&
        metaStamp(merged.data) === metaStamp(state) &&
        Object.keys(merged.data.tombstones).length === Object.keys(state.tombstones).length;
      return unchanged ? state : merged.data;
    }
    case 'backup/exported':
      return { ...state, lastExportedAt: action.at };
    case 'data/reset':
      return { version: 2, magazine: null, entries: [], tombstones: {}, overrides: {} };
  }
}
