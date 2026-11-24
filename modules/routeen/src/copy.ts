import { plural } from '@eternall/core';

/**
 * Every UI string of ROUTEEN lives here (English now, a catalogue for the bilingual project).
 * Plain data and small pure functions; no React. Plural helpers tolerate any numbers.
 * Voice: never "missed", never a streak or a percentage.
 */
export const copy = {
  fn: 'A routine that bends with your day',
  intro: 'Each day is a sky. Mark a practice and it lights up; a hard day can be lit a little, and a day off is a quiet night.',
  lock: 'The sky is drawn.',
  leave: 'Leave',
  forNow: 'For now',
  notYet: 'Not yet today',
  recap: "Today's recap",
  alsoToday: 'Also today',
  ifYouLike: 'If you feel like it',
  tiers: { minimum: 'a little', target: 'as planned', more: 'more' },
  allAsPlanned: 'All as planned',
  allALittle: 'All, a little',
  modes: { normal: 'Normal', low: 'Low energy', off: 'Day off' },
  modeLabel: 'Mode',
  backToNormal: 'Back to Normal?',
  backToNormalYes: 'Back to Normal',
  backToNormalLater: 'Not yet',
  yesterday: (n: number) => `Yesterday: ${n} not marked`,
  dayEndsAt: 'My day ends at…',
  dayEndsAtHint: 'Hours after midnight still count as the day before.',
  hour: (h: number) => `${String(h).padStart(2, '0')}:00`,
  places: { today: 'Today', sky: 'Sky' },
  newPractice: 'New practice',
  empty: 'Add something you want to return to.',
  greeting: { morning: 'Good morning', midday: 'Good day', evening: 'Good evening' },
  markToday: 'Mark today',
  home: {
    status: (marked: number, due: number) => `${marked} of ${due} marked today`,
    dayOff: 'Day off · a quiet night',
    nothingDue: 'Nothing due today',
    badge: (n: number) => `${n} to mark today`,
  },
  weekLine: (kept: number, active: number) => `ROUTEEN · ${kept} of ${plural(active, 'practice')} kept`,
  almanac: {
    daysLit: 'Days lit',
    daysLitNote: (year: number) => `in ${year}`,
    steadiest: 'The steadiest',
    steadiestNote: (weeks: number) => `lit in ${plural(weeks, 'week')} this year`,
  },
  sky: {
    title: 'The sky',
    caption: (n: number) => `${plural(n, 'day')} lit this year`,
    dome: 'View the sky as a dome',
    flat: 'View the sky flat',
  },
  day: {
    thatDay: 'That day',
    lit: 'Lit',
    unlit: 'Unlit',
    rest: 'A quiet night',
  },
  toast: {
    marked: (name: string) => `${name} lit`,
    unmarked: (name: string) => `${name} unmarked`,
    allMarked: (n: number) => `${plural(n, 'practice')} lit`,
    modeSet: (mode: string) => `${mode} for today`,
    undo: 'Undo',
  },
  dialog: {
    cancel: 'Cancel',
    confirm: 'Confirm',
    delete: 'Delete practice',
    deleteBody: 'The practice and its marks are removed from this device and your synced devices.',
    pause: 'Pause',
    resume: 'Resume',
  },
  aria: {
    tierChoice: 'How much did you do?',
    markedTier: (tier: string) => `Marked: ${tier}`,
    modePicker: 'Mode for today',
    skyGrid: 'The sky: one row for each week, one cell for each day',
  },
} as const;

export type Copy = typeof copy;
