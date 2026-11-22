import type { AppData, Capsule, Chapter, Inscription, Profile, Settings } from '../domain/types';
import { EMPTY_DATA } from '../domain/types';

export type Action =
  | { type: 'profile/set'; profile: Profile }
  | { type: 'settings/update'; patch: Partial<Settings> }
  | { type: 'inscription/upsert'; inscription: Inscription }
  | { type: 'inscription/remove'; id: string }
  | { type: 'capsule/add'; capsule: Capsule }
  | { type: 'capsule/open'; id: string; at: string }
  | { type: 'capsule/remove'; id: string }
  | { type: 'chapter/upsert'; chapter: Chapter }
  | { type: 'chapter/remove'; id: string }
  | { type: 'archive/replace'; data: AppData }
  | { type: 'archive/erase' };

function upsert<T extends { id: string }>(list: readonly T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [...list, item];
  const next = [...list];
  next[i] = item;
  return next;
}

const without = <T extends { id: string }>(list: readonly T[], id: string): T[] => list.filter((x) => x.id !== id);

export function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'profile/set':
      return { ...state, profile: action.profile };
    case 'settings/update':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'inscription/upsert':
      return { ...state, inscriptions: upsert(state.inscriptions, action.inscription) };
    case 'inscription/remove':
      return { ...state, inscriptions: without(state.inscriptions, action.id) };
    case 'capsule/add':
      // Sealed capsules are immutable: adding an existing id is ignored rather than overwriting.
      if (state.capsules.some((c) => c.id === action.capsule.id)) return state;
      return { ...state, capsules: [...state.capsules, action.capsule] };
    case 'capsule/open':
      return {
        ...state,
        capsules: state.capsules.map((c) => (c.id === action.id && !c.openedAt ? { ...c, openedAt: action.at } : c)),
      };
    case 'capsule/remove':
      return { ...state, capsules: without(state.capsules, action.id) };
    case 'chapter/upsert':
      return { ...state, chapters: upsert(state.chapters, action.chapter) };
    case 'chapter/remove':
      return { ...state, chapters: without(state.chapters, action.id) };
    case 'archive/replace':
      return action.data;
    case 'archive/erase':
      return { ...EMPTY_DATA, settings: state.settings };
  }
}
