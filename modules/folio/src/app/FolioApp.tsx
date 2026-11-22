import '@fontsource/cinzel/latin-400.css';
import '@fontsource/cinzel/latin-600.css';
import '@fontsource/crimson-pro/latin-400.css';
import '@fontsource/crimson-pro/latin-400-italic.css';
import '@fontsource/crimson-pro/latin-600.css';
import '../theme/folio.css';
import { useMemo, useState } from 'react';
import {
  addDays,
  birthdayAt,
  diffDays,
  formatDuration,
  formatMedium,
  formatMonthYear,
  plural,
  toISO,
  type HouseProfile,
  type ISODate,
  type ImprintAppProps,
  type Memory,
} from '@eternall/core';
import { useHouse, usePrimaryAction } from '@eternall/kit';
import { Button, Icon } from '@eternall/ui';
import { useCollection } from '@eternall/vault';
import { CHAPTER_PATH, clothColor, effectiveEnd, sortChapters, type Chapter } from '../chapters';
import { ChapterEditor } from './ChapterEditor';

export default function FolioApp({ path, search }: ImprintAppProps) {
  const house = useHouse();
  const { items } = useCollection<Chapter>(CHAPTER_PATH);
  const [editing, setEditing] = useState<null | { existing?: Chapter; start?: ISODate }>(search.get('new') ? {} : null);
  const m = /^\/chapter\/([A-Za-z0-9_-]+)$/.exec(path);
  const open = m ? items.find((c) => c.id === m[1]) : undefined;
  usePrimaryAction({ label: 'New chapter', run: () => setEditing({}) });

  return (
    <div className="folio">
      {open ? <Spread chapter={open} onEdit={() => setEditing({ existing: open })} /> : <Shelf onNew={(start) => setEditing(start ? { start } : {})} onOpen={(c) => house.navigate(house.href(`/chapter/${c.id}`))} />}
      {editing && <ChapterEditor key={editing.existing?.id ?? 'new'} {...editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

interface Volume {
  kind: 'chapter' | 'unnamed';
  chapter?: Chapter;
  start: ISODate;
  end: ISODate;
  days: number;
}

/** Group a life into decade shelves; gaps between chapters become pale "unnamed" volumes. */
function useShelves(chapters: readonly Chapter[], profile: HouseProfile | null, today: ISODate) {
  return useMemo(() => {
    const sorted = sortChapters(chapters);
    const vols: Volume[] = [];
    let cursor: ISODate | null = profile?.birthDate ?? sorted[0]?.start ?? null;
    for (const ch of sorted) {
      const end = effectiveEnd(ch, today);
      if (profile && cursor && diffDays(cursor, ch.start) > 180) vols.push({ kind: 'unnamed', start: cursor, end: addDays(ch.start, -1), days: diffDays(cursor, ch.start) });
      vols.push({ kind: 'chapter', chapter: ch, start: ch.start, end, days: Math.max(1, diffDays(ch.start, end)) });
      if (!cursor || end > cursor) cursor = addDays(end, 1);
    }
    if (profile && cursor && diffDays(cursor, today) > 180) vols.push({ kind: 'unnamed', start: cursor, end: today, days: diffDays(cursor, today) });

    const decadeOf = (d: ISODate) => (profile ? Math.floor(Math.max(0, diffDays(profile.birthDate, d)) / 365.2425 / 10) : Math.floor(Number(d.slice(0, 4)) / 10));
    const shelves = new Map<number, Volume[]>();
    for (const v of vols) {
      const k = decadeOf(v.start);
      shelves.set(k, [...(shelves.get(k) ?? []), v]);
    }
    return [...shelves.entries()].sort((a, b) => a[0] - b[0]);
  }, [chapters, profile, today]);
}

function Shelf({ onNew, onOpen }: { onNew(start?: ISODate): void; onOpen(c: Chapter): void }) {
  const { profile, today } = useHouse();
  const { items } = useCollection<Chapter>(CHAPTER_PATH);
  const shelves = useShelves(items, profile, today);
  const birthYear = profile ? Number(profile.birthDate.slice(0, 4)) : 0;

  return (
    <>
      <header className="folio-head">
        <p className="folio-eyebrow">FOLIO · Chapters of your life</p>
        <h1 className="folio-title">
          Every life is a book. <em>Name its chapters.</em>
        </h1>
        {profile && items.length > 0 && <LifeBar chapters={items} profile={profile} today={today} />}
      </header>

      {items.length === 0 ? (
        <div className="folio-empty">
          <div className="folio-plank">
            <button type="button" className="folio-spine folio-spine--blank" onClick={() => onNew()} style={{ ['--w' as string]: '64px' }}>
              <span className="folio-spine__title">Untitled</span>
            </button>
          </div>
          <p className="folio-empty__text">Childhood. The first apartment. The years in another city. Name a chapter and it joins the shelf.</p>
          <Button variant="primary" icon="plus" onClick={() => onNew()}>
            New chapter
          </Button>
        </div>
      ) : (
        <div className="folio-shelves">
          {shelves.map(([decade, vols]) => {
            const label = profile ? `${decade * 10}–${decade * 10 + 9}` : `${decade * 10}s`;
            const sub = profile ? `${birthYear + decade * 10}–${birthYear + decade * 10 + 9}` : '';
            return (
              <section key={decade} className="folio-shelf" aria-label={profile ? `Ages ${label}` : `The ${label}`}>
                <h2 className="folio-shelf__label">
                  <span>{label}</span>
                  {sub && <span className="folio-shelf__sub">{sub}</span>}
                </h2>
                <ul className="folio-plank">
                  {vols.map((v, i) => {
                    const width = `${Math.round(Math.min(150, Math.max(30, Math.sqrt(v.days) * 2.2)))}px`;
                    if (v.kind === 'unnamed') {
                      return (
                        <li key={`u-${v.start}`}>
                          <button type="button" className="folio-spine folio-spine--blank" style={{ ['--w' as string]: width }} onClick={() => onNew(v.start)} aria-label={`Unnamed years, ${formatMonthYear(v.start)} to ${formatMonthYear(v.end)}. Name them.`}>
                            <span className="folio-spine__title">Unnamed</span>
                          </button>
                        </li>
                      );
                    }
                    const ch = v.chapter!;
                    return (
                      <li key={ch.id} style={{ ['--i' as string]: i }}>
                        <button
                          type="button"
                          className={`folio-spine ${ch.end === null ? 'is-ongoing' : ''}`}
                          style={{ ['--w' as string]: width, ['--c' as string]: clothColor(ch.cloth) }}
                          onClick={() => onOpen(ch)}
                          aria-label={`${ch.title}, ${formatMonthYear(ch.start)} to ${ch.end ? formatMonthYear(ch.end) : 'now'}`}
                        >
                          <span className="folio-spine__band" aria-hidden="true" />
                          <span className="folio-spine__title">{ch.title}</span>
                          <span className="folio-spine__band folio-spine__band--low" aria-hidden="true" />
                          <span className="folio-spine__tip" aria-hidden="true">
                            {formatMonthYear(ch.start)} — {ch.end ? formatMonthYear(ch.end) : 'now'} · {formatDuration(ch.start, v.end)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

function LifeBar({ chapters, profile, today }: { chapters: readonly Chapter[]; profile: HouseProfile; today: ISODate }) {
  const total = diffDays(profile.birthDate, toISO(birthdayAt(profile.birthDate, profile.horizonYears)));
  const pct = (d: ISODate) => `${(Math.max(0, diffDays(profile.birthDate, d)) / total) * 100}%`;
  return (
    <figure className="folio-lifebar" aria-label="Chapters across your whole horizon">
      <div className="folio-lifebar__track">
        <span className="folio-lifebar__lived" style={{ width: pct(today) }} />
        {chapters.map((ch) => (
          <span key={ch.id} className="folio-lifebar__seg" title={ch.title} style={{ left: pct(ch.start), width: `max(3px, calc(${pct(effectiveEnd(ch, today))} - ${pct(ch.start)}))`, ['--c' as string]: clothColor(ch.cloth) }} />
        ))}
        <span className="folio-lifebar__now" style={{ left: pct(today) }} />
      </div>
      <div className="folio-lifebar__ticks" aria-hidden="true">
        {Array.from({ length: Math.floor(profile.horizonYears / 10) + 1 }, (_, d) => (
          <span key={d} style={{ left: `${((d * 10) / profile.horizonYears) * 100}%` }}>
            {d * 10}
          </span>
        ))}
      </div>
    </figure>
  );
}

function Spread({ chapter, onEdit }: { chapter: Chapter; onEdit(): void }) {
  const house = useHouse();
  const end = effectiveEnd(chapter, house.today);
  const bound: Memory[] = house
    .gather.memories()
    .filter((m) => m.date >= chapter.start && m.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date));
  const weeks = Math.max(1, Math.round(diffDays(chapter.start, end) / 7));

  return (
    <article className="folio-spread" style={{ ['--c' as string]: clothColor(chapter.cloth) }}>
      <button type="button" className="folio-back" onClick={() => house.navigate(house.href('/'))}>
        <Icon name="left" size={16} /> Back to the shelf
      </button>
      <div className="folio-book">
        <section className="folio-page folio-page--verso" aria-labelledby="folio-ch-title">
          <p className="folio-running">FOLIO</p>
          <div className="folio-titlepage">
            <span className="folio-titlepage__rule" aria-hidden="true" />
            <h1 id="folio-ch-title" className="folio-titlepage__title">
              {chapter.title}
            </h1>
            <p className="folio-titlepage__dates">
              {formatMonthYear(chapter.start)} — {chapter.end ? formatMonthYear(chapter.end) : <span className="folio-ongoing">still being written</span>}
            </p>
            {chapter.note && <p className="folio-titlepage__note">{chapter.note}</p>}
            <p className="folio-titlepage__facts">
              {formatDuration(chapter.start, end)} · {plural(weeks, 'week')}
            </p>
            <span className="folio-titlepage__rule" aria-hidden="true" />
          </div>
          <div className="folio-page__actions">
            <Button variant="ghost" icon="pen" onClick={onEdit}>
              Edit chapter
            </Button>
            {house.profile && (
              <Button variant="quiet" icon="grid" onClick={() => house.navigate(`/?week=${Math.max(0, Math.floor(diffDays(house.profile!.birthDate, chapter.start) / 7))}`)}>
                Show on lifeline
              </Button>
            )}
          </div>
        </section>
        <section className="folio-page folio-page--recto" aria-labelledby="folio-bound">
          <p className="folio-running folio-running--right">
            {formatMedium(chapter.start)} – {chapter.end ? formatMedium(chapter.end) : 'now'}
          </p>
          <h2 id="folio-bound" className="folio-contents__title">
            Bound in this chapter
          </h2>
          {bound.length === 0 ? (
            <p className="folio-contents__empty">Nothing from your other imprints falls within these dates yet. Inscriptions, journal issues and letters will appear here.</p>
          ) : (
            <ol className="folio-contents">
              {bound.slice(0, 40).map((m) => (
                <li key={`${m.imprint}-${m.id}`}>
                  <button type="button" className="folio-contents__row" onClick={() => house.navigate(m.href)}>
                    <span className="folio-contents__name">{m.title}</span>
                    <span className="folio-contents__leader" aria-hidden="true" />
                    <span className="folio-contents__date">{formatMedium(m.date)}</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
          <p className="folio-folio" aria-hidden="true">
            {weeks}
          </p>
        </section>
      </div>
    </article>
  );
}
