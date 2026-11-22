import { chapterSpan } from '../../domain/lifeline';
import { locateIndex, weekRange, coordOf } from '../../domain/time';
import { effectiveEnd } from '../../domain/validation';
import type { Chapter } from '../../domain/types';
import { formatDuration, formatMonthYear, plural } from '../../lib/format';
import { navigate } from '../../lib/router';
import { useProfileStore } from '../../store/StoreProvider';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { useEditors } from '../editors/EditorsProvider';

export function ChaptersView() {
  const { profile, data, today, lifeline } = useProfileStore();
  const editors = useEditors();
  const chapters = [...data.chapters].sort((a, b) => a.start.localeCompare(b.start));
  const total = lifeline.total;
  const pct = (i: number) => `${(i / total) * 100}%`;

  // Suggest starting the next chapter where the last one ended.
  const last = chapters[chapters.length - 1];
  const suggestedStart = last?.end ? weekRange(profile.birthDate, coordOf((locateIndex(profile.birthDate, last.end) ?? 0) + 1)).start : undefined;

  const memoriesIn = (ch: Chapter) => {
    const [from, to] = chapterSpan(ch, profile, today);
    let n = 0;
    for (const [idx, list] of lifeline.inscriptionsByWeek) if (idx >= from && idx <= to) n += list.length;
    return n;
  };

  return (
    <div className="chapters">
      <header className="page-head page-head--split">
        <div>
          <p className="eyebrow rise">Chapters</p>
          <h1 className="display page-title rise" style={{ ['--i' as string]: 1 }}>
            Every life is <em>a book</em> with unmarked chapters.
          </h1>
        </div>
        <Button variant="primary" icon="plus" className="rise" style={{ ['--i' as string]: 2 }} onClick={() => editors.editChapter({ start: suggestedStart })}>
          Name a chapter
        </Button>
      </header>

      <figure className="lifebar rise" style={{ ['--i' as string]: 2 }} aria-label="Chapters across your whole lifeline">
        <div className="lifebar__track">
          <span className="lifebar__lived" style={{ width: pct(lifeline.now) }} />
          {chapters.map((ch) => {
            const [from, to] = chapterSpan(ch, profile, today);
            return (
              <button
                key={ch.id}
                type="button"
                className={`lifebar__seg ink--${ch.ink}`}
                style={{ left: pct(from), width: `max(3px, ${pct(to - from + 1)})` }}
                onClick={() => editors.editChapter({ existing: ch })}
                aria-label={`${ch.title}: ${formatMonthYear(ch.start)} to ${ch.end ? formatMonthYear(ch.end) : 'now'}`}
                title={ch.title}
              />
            );
          })}
          <span className="lifebar__now" style={{ left: pct(lifeline.now) }} aria-hidden="true" />
        </div>
        <div className="lifebar__ticks" aria-hidden="true">
          {Array.from({ length: Math.floor(profile.horizonYears / 10) + 1 }, (_, d) => (
            <span key={d} style={{ left: `${((d * 10) / profile.horizonYears) * 100}%` }}>{d * 10}</span>
          ))}
        </div>
      </figure>

      {chapters.length === 0 ? (
        <EmptyState
          title="No chapters yet."
          action={<Button variant="primary" onClick={() => editors.editChapter()}>Name your first chapter</Button>}
        >
          Childhood. The first apartment. The years in another city. Name the eras of your life and watch them colour your lifeline.
        </EmptyState>
      ) : (
        <ol className="chapter-list">
          {chapters.map((ch, i) => {
            const n = memoriesIn(ch);
            const [from, to] = chapterSpan(ch, profile, today);
            return (
              <li key={ch.id} className={`chapter rise ink--${ch.ink}`} style={{ ['--i' as string]: i }}>
                <span className="chapter__num mono">{String(i + 1).padStart(2, '0')}</span>
                <div className="chapter__body">
                  <button type="button" className="chapter__title display" onClick={() => editors.editChapter({ existing: ch })}>
                    {ch.title}
                  </button>
                  <p className="chapter__dates mono">
                    {formatMonthYear(ch.start)} — {ch.end ? formatMonthYear(ch.end) : <span className="chapter__ongoing">now</span>}
                  </p>
                  {ch.note && <p className="chapter__note muted">{ch.note}</p>}
                  <p className="chapter__facts faint">
                    {formatDuration(ch.start, effectiveEnd(ch, today))} · {plural(to - from + 1, 'week')} · {plural(n, 'memory', 'memories')}
                  </p>
                </div>
                <div className="chapter__actions">
                  <button type="button" className="icon-btn" onClick={() => navigate('lifeline', { week: from })} aria-label={`Show ${ch.title} on lifeline`} title="Show on lifeline">
                    <Icon name="grid" size={18} />
                  </button>
                  <button type="button" className="icon-btn" onClick={() => editors.editChapter({ existing: ch })} aria-label={`Edit ${ch.title}`} title="Edit">
                    <Icon name="pen" size={18} />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
