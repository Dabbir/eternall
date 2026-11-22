import { MOOD_INKS } from './catalog';
import { endOfWeek, startOfWeek, weekdayIndex, weekKey, weekKeyToDate, addDays } from './dates';
import { dek, entryWords, readingMinutes, titleCase, truncate } from './text';
import { INKS } from './types';
import type { AppData, Entry, Issue, IssueOverride, IssueStats, Mood, PressCheckItem, Section } from './types';

export const COVER_STORY_MIN_WORDS = 150;

/** Group entries by the ISO week they were filed in. */
export function groupByWeek(entries: readonly Entry[]): Map<string, Entry[]> {
  const groups = new Map<string, Entry[]>();
  for (const entry of entries) {
    const key = weekKey(new Date(entry.createdAt));
    const list = groups.get(key);
    if (list) list.push(entry);
    else groups.set(key, [entry]);
  }
  return groups;
}

function byCreatedAsc(a: Entry, b: Entry): number {
  return a.createdAt.localeCompare(b.createdAt);
}

export function computeStats(entries: readonly Entry[]): IssueStats {
  const words = entries.reduce((sum, e) => sum + entryWords(e), 0);
  const dayBuckets: number[][] = Array.from({ length: 7 }, () => []);
  const sectionCounts = new Map<Section, number>();
  for (const e of entries) {
    dayBuckets[weekdayIndex(new Date(e.createdAt))]?.push(e.mood);
    sectionCounts.set(e.section, (sectionCounts.get(e.section) ?? 0) + 1);
  }
  const avg = (xs: number[]): number | null => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const overall = avg(entries.map((e) => e.mood));
  return {
    entries: entries.length,
    words,
    readingMinutes: readingMinutes(words),
    mood: overall === null ? null : (Math.min(5, Math.max(1, Math.round(overall))) as Mood),
    moodByDay: dayBuckets.map(avg),
    daysWritten: dayBuckets.filter((b) => b.length > 0).length,
    sections: [...sectionCounts.entries()]
      .map(([section, count]) => ({ section, count }))
      .toSorted((a, b) => b.count - a.count || a.section.localeCompare(b.section)),
  };
}

/** Starred entry wins (most recently starred/edited); otherwise the longest story; otherwise the longest piece. */
export function pickCoverStory(entries: readonly Entry[]): Entry | null {
  if (entries.length === 0) return null;
  const starred = entries.filter((e) => e.starred).toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  if (starred[0]) return starred[0];
  const longest = (xs: readonly Entry[]): Entry | null =>
    xs.reduce<Entry | null>((best, e) => (best === null || entryWords(e) > entryWords(best) ? e : best), null);
  return longest(entries.filter((e) => e.kind === 'story')) ?? longest(entries);
}

export function headlineFor(entry: Entry | null): string {
  if (!entry) return 'Blank Pages';
  switch (entry.kind) {
    case 'story':
    case 'list':
      return entry.title;
    case 'note':
      return truncate(dek(entry.body, 80), 64);
    case 'quote':
      return `“${truncate(entry.body, 60)}”`;
  }
}

export function coverLineFor(entry: Entry): string {
  switch (entry.kind) {
    case 'story':
      return entry.title;
    case 'list':
      return `${titleCase(entry.title)}: ${entry.items.length} picks`;
    case 'quote':
      return `“${truncate(entry.body, 46)}”`;
    case 'note':
      return truncate(entry.body, 52);
  }
}

const COVER_LINE_PRIORITY: Record<Entry['kind'], number> = { story: 0, list: 1, quote: 2, note: 3 };

export function coverLines(entries: readonly Entry[], cover: Entry | null, max = 3): string[] {
  return entries
    .filter((e) => e.id !== cover?.id)
    .toSorted((a, b) => COVER_LINE_PRIORITY[a.kind] - COVER_LINE_PRIORITY[b.kind] || entryWords(b) - entryWords(a))
    .slice(0, max)
    .map(coverLineFor);
}

interface CompileContext {
  number: number;
  volume: number;
  override: IssueOverride | undefined;
  now: Date;
}

export function compileIssue(key: string, entries: readonly Entry[], ctx: CompileContext): Issue {
  const monday = weekKeyToDate(key);
  if (!monday) throw new Error(`Invalid issue key: ${key}`);
  const sorted = entries.toSorted(byCreatedAsc);
  const coverStory = pickCoverStory(sorted);
  const stats = computeStats(sorted);
  const weekEnd = endOfWeek(monday);
  const inks = stats.mood ? MOOD_INKS[stats.mood] : null;
  const ink = ctx.override?.ink ?? (inks ? inks[ctx.number % 2] : INKS[ctx.number % INKS.length]) ?? 'orange';
  return {
    key,
    number: ctx.number,
    volume: ctx.volume,
    weekStart: monday,
    weekEnd,
    status: ctx.now.getTime() > weekEnd.getTime() ? 'published' : 'in-production',
    entries: sorted,
    coverStory,
    headline: ctx.override?.headline?.trim() || headlineFor(coverStory),
    coverLines: coverLines(sorted, coverStory),
    ink,
    stats,
  };
}

/**
 * Compile every issue: one per week with entries, plus the current week's issue
 * (always present, possibly empty). Issues are numbered chronologically from 1.
 * Returned newest first.
 */
export function compileIssues(data: Pick<AppData, 'entries' | 'overrides'>, now: Date = new Date()): Issue[] {
  const groups = groupByWeek(data.entries);
  const currentKey = weekKey(now);
  if (!groups.has(currentKey)) groups.set(currentKey, []);
  const keys = [...groups.keys()].toSorted();
  // Future-dated weeks (e.g. imported data from another clock) are compiled too; they sort last.
  const firstYear = weekKeyToDate(keys[0] ?? currentKey)?.getFullYear() ?? now.getFullYear();
  let number = 0;
  const issues = keys.map((key) => {
    const entries = groups.get(key) ?? [];
    const monday = weekKeyToDate(key) ?? startOfWeek(now);
    if (entries.length > 0 || key === currentKey) number += 1;
    return compileIssue(key, entries, {
      number,
      volume: Math.max(1, monday.getFullYear() - firstYear + 1),
      override: data.overrides[key],
      now,
    });
  });
  return issues.toReversed();
}

export function pressCheck(issue: Issue): PressCheckItem[] {
  const hasCover = issue.entries.some(
    (e) => e.starred || (e.kind === 'story' && entryWords(e) >= COVER_STORY_MIN_WORDS),
  );
  return [
    { id: 'cover', label: 'A cover story', hint: `File a story of ${COVER_STORY_MIN_WORDS}+ words, or star a piece.`, done: hasCover },
    { id: 'volume', label: 'Five pieces filed', hint: `${Math.min(issue.stats.entries, 5)} of 5 so far.`, done: issue.stats.entries >= 5 },
    { id: 'voices', label: 'A voice besides yours', hint: 'Log something someone said.', done: issue.entries.some((e) => e.kind === 'quote') },
    { id: 'rhythm', label: 'Three days on the beat', hint: `Filed on ${issue.stats.daysWritten} of 3 days.`, done: issue.stats.daysWritten >= 3 },
  ];
}

/** Consecutive weeks with at least one entry, counting back from this week (or last week, if this week is still blank). */
export function weeklyStreak(entries: readonly Entry[], now: Date = new Date()): number {
  const weeks = new Set(entries.map((e) => weekKey(new Date(e.createdAt))));
  let cursor = startOfWeek(now);
  if (!weeks.has(weekKey(cursor))) cursor = addDays(cursor, -7);
  let streak = 0;
  while (weeks.has(weekKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -7);
  }
  return streak;
}

export function totalWords(entries: readonly Entry[]): number {
  return entries.reduce((sum, e) => sum + entryWords(e), 0);
}
