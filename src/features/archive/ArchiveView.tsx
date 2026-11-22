import { useDeferredValue, useMemo, useState } from 'react';
import { chapterAt } from '../../domain/lifeline';
import { searchInscriptions } from '../../domain/stats';
import { locate, locateIndex } from '../../domain/time';
import { TONES, TONE_LABEL, type Inscription, type Tone } from '../../domain/types';
import { formatMedium, formatNumber, plural } from '../../lib/format';
import { navigate } from '../../lib/router';
import { useProfileStore } from '../../store/StoreProvider';
import { Button } from '../../components/ui/Button';
import { EmptyState, GridArt } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { useEditors } from '../editors/EditorsProvider';

interface Group {
  age: number;
  year: string;
  items: Inscription[];
}

export function ArchiveView() {
  const { profile, data, today } = useProfileStore();
  const editors = useEditors();
  const [query, setQuery] = useState('');
  const [tone, setTone] = useState<Tone | null>(null);
  const deferred = useDeferredValue(query);

  const results = useMemo(() => {
    const list = searchInscriptions(data.inscriptions, deferred).filter((i) => !tone || i.tone === tone);
    return list.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [data.inscriptions, deferred, tone]);

  const groups = useMemo(() => {
    const out: Group[] = [];
    for (const ins of results) {
      const age = locate(profile.birthDate, ins.date)?.age ?? 0;
      const last = out[out.length - 1];
      if (last && last.age === age) last.items.push(ins);
      else out.push({ age, year: ins.date.slice(0, 4), items: [ins] });
    }
    return out;
  }, [results, profile.birthDate]);

  const years = new Set(data.inscriptions.map((i) => locate(profile.birthDate, i.date)?.age)).size;
  const filtering = deferred.trim() !== '' || tone !== null;

  return (
    <div className="archive">
      <header className="page-head">
        <p className="eyebrow rise">The archive</p>
        <h1 className="display page-title rise" style={{ ['--i' as string]: 1 }}>
          {data.inscriptions.length ? (
            <>
              {plural(data.inscriptions.length, 'inscription')}, <em>across {plural(years, 'year')}</em> of a life.
            </>
          ) : (
            <>Everything you choose to keep.</>
          )}
        </h1>
      </header>

      {data.inscriptions.length === 0 ? (
        <EmptyState
          art={<GridArt filled={14} accent={14} />}
          title="Your archive is waiting."
          action={<Button variant="primary" icon="pen" onClick={() => editors.inscribe({ date: today })}>Inscribe today</Button>}
        >
          Every memory you inscribe lands on its week in your lifeline and is collected here, searchable, forever.
        </EmptyState>
      ) : (
        <>
          <div className="archive__tools rise" style={{ ['--i' as string]: 2 }}>
            <label className="search">
              <Icon name="search" size={18} />
              <span className="visually-hidden">Search inscriptions</span>
              <input
                type="search"
                placeholder="Search titles and words…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                data-search-input
              />
              {query && (
                <button type="button" className="search__clear" onClick={() => setQuery('')} aria-label="Clear search">
                  <Icon name="close" size={14} />
                </button>
              )}
            </label>
            <div className="filter-chips" role="group" aria-label="Filter by tone">
              {TONES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`chip tone--${t} ${tone === t ? 'is-on' : ''}`}
                  aria-pressed={tone === t}
                  onClick={() => setTone(tone === t ? null : t)}
                >
                  <span className="tone-dot" aria-hidden="true" /> {TONE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          <p className="archive__count mono faint" aria-live="polite">
            {filtering ? `${formatNumber(results.length)} of ${formatNumber(data.inscriptions.length)} shown` : ''}
          </p>

          {results.length === 0 ? (
            <EmptyState
              title="Nothing matches."
              action={<Button variant="ghost" onClick={() => { setQuery(''); setTone(null); }}>Clear filters</Button>}
            >
              No inscription contains “{deferred.trim() || TONE_LABEL[tone ?? 'joy']}”. Try fewer words.
            </EmptyState>
          ) : (
            <div className="archive__groups">
              {groups.map((g) => (
                <section key={`${g.age}`} className="archive-year" aria-labelledby={`age-${g.age}`}>
                  <h2 id={`age-${g.age}`} className="archive-year__label">
                    <span className="display">{g.age}</span>
                    <span className="eyebrow">age · {g.year}</span>
                  </h2>
                  <ol className="archive-year__list">
                    {g.items.map((ins) => {
                      const ch = chapterAt(data.chapters, profile, locateIndex(profile.birthDate, ins.date) ?? 0, today);
                      return (
                        <li key={ins.id}>
                          <article className={`entry tone--${ins.tone}`}>
                            <button type="button" className="entry__main" onClick={() => editors.inscribe({ existing: ins })}>
                              <span className="entry__date mono">{formatMedium(ins.date)}</span>
                              <span className="entry__title display">{ins.title}</span>
                              {ins.body && <span className="entry__body">{ins.body}</span>}
                              <span className="entry__meta">
                                <span className="tone-dot" aria-hidden="true" /> {TONE_LABEL[ins.tone]}
                                {ch && <span className={`entry__chapter ink--${ch.ink}`}>· {ch.title}</span>}
                              </span>
                            </button>
                            <button
                              type="button"
                              className="entry__locate"
                              onClick={() => navigate('lifeline', { week: locateIndex(profile.birthDate, ins.date) ?? 0 })}
                              aria-label={`Show “${ins.title}” on the lifeline`}
                              title="Show on lifeline"
                            >
                              <Icon name="grid" size={16} />
                            </button>
                          </article>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
