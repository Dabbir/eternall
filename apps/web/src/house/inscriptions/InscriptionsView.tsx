import { useDeferredValue, useMemo, useState } from 'react';
import { TONES, TONE_LABEL, formatMedium, formatNumber, locate, locateIndex, plural, type Tone } from '@eternall/core';
import { useHouse, usePrimaryAction } from '@eternall/kit';
import { Button, EmptyState, GridArt, Icon } from '@eternall/ui';
import { useCollection } from '@eternall/vault';
import { INSCRIPTION_PATH, type Inscription } from '../domain/house';
import { navigate } from '../../shell/router';
import { InscriptionEditor } from './InscriptionEditor';

interface Group {
  key: string;
  big: string;
  small: string;
  items: Inscription[];
}

export function searchInscriptions(list: readonly Inscription[], query: string): Inscription[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [...list];
  return list.filter((ins) => terms.every((t) => `${ins.title}\n${ins.body}`.toLowerCase().includes(t)));
}

/** The house's own archive of quick inscriptions, grouped by year of life (or calendar year without a profile). */
export function InscriptionsView({ search }: { search: URLSearchParams }) {
  const house = useHouse();
  const { profile, today } = house;
  const { items } = useCollection<Inscription>(INSCRIPTION_PATH);
  const [query, setQuery] = useState('');
  const [tone, setTone] = useState<Tone | null>(null);
  const deferred = useDeferredValue(query);
  const chapters = house.capability('chapters.at');

  const openId = search.get('open');
  const isNew = search.get('new') === '1';
  const editing = openId ? items.find((i) => i.id === openId) : undefined;
  const close = () => navigate('/inscriptions', { replace: true });
  usePrimaryAction({ label: 'Inscribe today', run: () => navigate(`/inscriptions?new=1&date=${today}`) });

  const results = useMemo(
    () =>
      searchInscriptions(items, deferred)
        .filter((i) => !tone || i.tone === tone)
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [items, deferred, tone],
  );

  const groups = useMemo(() => {
    const out: Group[] = [];
    for (const ins of results) {
      const age = profile ? locate(profile.birthDate, ins.date)?.age : undefined;
      const key = age !== undefined ? `a${age}` : ins.date.slice(0, 4);
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(ins);
      else out.push({ key, big: age !== undefined ? String(age) : ins.date.slice(0, 4), small: age !== undefined ? `age · ${ins.date.slice(0, 4)}` : 'year', items: [ins] });
    }
    return out;
  }, [results, profile]);

  const spans = new Set(items.map((i) => (profile ? locate(profile.birthDate, i.date)?.age : i.date.slice(0, 4)))).size;
  const filtering = deferred.trim() !== '' || tone !== null;

  return (
    <div className="archive">
      <header className="page-head">
        <p className="eyebrow rise">Inscriptions</p>
        <h1 className="display page-title rise" style={{ ['--i' as string]: 1 }}>
          {items.length ? (
            <>
              {plural(items.length, 'inscription')}, <em>across {plural(spans, 'year')}</em> of a life.
            </>
          ) : (
            <>The weeks you chose to keep.</>
          )}
        </h1>
      </header>

      {items.length === 0 ? (
        <EmptyState
          art={<GridArt filled={14} accent={14} />}
          title="Nothing inscribed yet."
          action={
            <Button variant="primary" icon="pen" onClick={() => navigate(`/inscriptions?new=1&date=${today}`)}>
              Inscribe today
            </Button>
          }
        >
          An inscription is a line or two about a week worth keeping. Each one lands on its week in your lifeline.
        </EmptyState>
      ) : (
        <>
          <div className="archive__tools rise" style={{ ['--i' as string]: 2 }}>
            <label className="search">
              <Icon name="search" size={18} />
              <span className="visually-hidden">Search inscriptions</span>
              <input type="search" placeholder="Search titles and words…" value={query} onChange={(e) => setQuery(e.target.value)} />
              {query && (
                <button type="button" className="search__clear" onClick={() => setQuery('')} aria-label="Clear search">
                  <Icon name="close" size={14} />
                </button>
              )}
            </label>
            <div className="filter-chips" role="group" aria-label="Filter by tone">
              {TONES.map((t) => (
                <button key={t} type="button" className={`chip tone--${t} ${tone === t ? 'is-on' : ''}`} aria-pressed={tone === t} onClick={() => setTone(tone === t ? null : t)}>
                  <span className="tone-dot" aria-hidden="true" /> {TONE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>
          <p className="archive__count mono faint" aria-live="polite">
            {filtering ? `${formatNumber(results.length)} of ${formatNumber(items.length)} shown` : ''}
          </p>

          {results.length === 0 ? (
            <EmptyState
              title="Nothing matches."
              action={
                <Button
                  variant="ghost"
                  onClick={() => {
                    setQuery('');
                    setTone(null);
                  }}
                >
                  Clear filters
                </Button>
              }
            >
              No inscription contains “{deferred.trim() || (tone ? TONE_LABEL[tone] : '')}”. Try fewer words.
            </EmptyState>
          ) : (
            <div className="archive__groups">
              {groups.map((g) => (
                <section key={g.key} className="archive-year" aria-labelledby={`grp-${g.key}`}>
                  <h2 id={`grp-${g.key}`} className="archive-year__label">
                    <span className="display">{g.big}</span>
                    <span className="eyebrow">{g.small}</span>
                  </h2>
                  <ol className="archive-year__list">
                    {g.items.map((ins) => {
                      const ch = chapters?.at(ins.date) ?? null;
                      const week = profile ? locateIndex(profile.birthDate, ins.date) : null;
                      return (
                        <li key={ins.id}>
                          <article className={`entry tone--${ins.tone}`}>
                            <button type="button" className="entry__main" onClick={() => navigate(`/inscriptions?open=${ins.id}`)}>
                              <span className="entry__date mono">{formatMedium(ins.date)}</span>
                              <span className="entry__title display">{ins.title}</span>
                              {ins.body && <span className="entry__body">{ins.body}</span>}
                              <span className="entry__meta">
                                <span className="tone-dot" aria-hidden="true" /> {TONE_LABEL[ins.tone]}
                                {ch && <span className="entry__chapter">· {ch.title}</span>}
                              </span>
                            </button>
                            {week !== null && (
                              <button
                                type="button"
                                className="entry__locate"
                                onClick={() => navigate(`/?week=${week}`)}
                                aria-label={`Show “${ins.title}” on the lifeline`}
                                title="Show on lifeline"
                              >
                                <Icon name="grid" size={16} />
                              </button>
                            )}
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

      {(isNew || editing) && <InscriptionEditor key={editing?.id ?? 'new'} {...(editing ? { existing: editing } : {})} {...(search.get('date') ? { date: search.get('date')! } : {})} onClose={close} />}
    </div>
  );
}
