import type { EntryKind, Ink, Mood, Section } from './types';

/** Editorial metadata for each magazine department. */
export const SECTION_INFO: Record<Section, { label: string; department: string }> = {
  life: { label: 'Life', department: 'Dispatches' },
  work: { label: 'Work', department: 'The Desk' },
  ideas: { label: 'Ideas', department: 'Notebook' },
  culture: { label: 'Culture', department: 'Reviews & Obsessions' },
  body: { label: 'Body & Mind', department: 'Wellbeing' },
  people: { label: 'People', department: 'Company' },
  elsewhere: { label: 'Elsewhere', department: 'Travel' },
};

export const KIND_INFO: Record<EntryKind, { label: string; verb: string; hint: string }> = {
  story: { label: 'Story', verb: 'Write a story', hint: 'A feature. Something that happened, at length.' },
  note: { label: 'Note', verb: 'Jot a note', hint: 'A dispatch. A line or two from today.' },
  quote: { label: 'Quote', verb: 'Log a quote', hint: 'Overheard. Something someone said.' },
  list: { label: 'List', verb: 'Make a list', hint: 'A ranking, a haul, a set of small things.' },
};

export const MOOD_INFO: Record<Mood, { label: string; forecast: string }> = {
  1: { label: 'Storm', forecast: 'Heavy weather. Batten down.' },
  2: { label: 'Rain', forecast: 'Grey skies, steady drizzle.' },
  3: { label: 'Overcast', forecast: 'Mild, unremarkable, fine.' },
  4: { label: 'Fair', forecast: 'Bright spells throughout.' },
  5: { label: 'Sunny', forecast: 'Clear skies, high spirits.' },
};

/** Ink to print with, per prevailing weather. Two options per mood so consecutive issues vary. */
export const MOOD_INKS: Record<Mood, readonly [Ink, Ink]> = {
  1: ['blue', 'violet'],
  2: ['teal', 'blue'],
  3: ['violet', 'green'],
  4: ['orange', 'green'],
  5: ['yellow', 'pink'],
};

export const INK_INFO: Record<Ink, { label: string }> = {
  blue: { label: 'Riso Blue' },
  teal: { label: 'Teal' },
  violet: { label: 'Violet' },
  orange: { label: 'Orange' },
  yellow: { label: 'Yellow' },
  pink: { label: 'Fluorescent Pink' },
  green: { label: 'Green' },
};
