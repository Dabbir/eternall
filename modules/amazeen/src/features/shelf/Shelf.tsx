import { useContext, useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import { CoverArt } from '../../components/CoverArt';
import { ShelfExtrasContext, useImmersive } from '../../imprint/embedded';
import { Icon } from '../../components/Icon';
import ui from '../../components/ui.module.css';
import { KIND_INFO, SECTION_INFO } from '../../domain/catalog';
import { formatDayMonth, formatMonthYear, formatWeekRange } from '../../domain/dates';
import { totalWords } from '../../domain/issues';
import { layoutIssue, pageOf } from '../../domain/layout';
import { searchEntries } from '../../domain/search';
import { highlight } from '../../domain/text';
import { SECTIONS } from '../../domain/types';
import type { Issue, Section } from '../../domain/types';
import { Link, paths, useRouter } from '../../router/router';
import { useDocumentTitle } from '../../state/hooks';
import { useStore } from '../../state/store';
import { entryHeadline } from '../desk/EntryRow';
import styles from './Shelf.module.css';

const RESULT_LIMIT = 50;

function Highlighted({ text, query }: { text: string; query: string }) {
  return (
    <>
      {highlight(text, query).map((part, i) => (part.match ? <mark key={i}>{part.text}</mark> : <span key={i}>{part.text}</span>))}
    </>
  );
}

/** Spine thickness follows the issue's size: thin weeks make thin spines. */
function spineWidth(issue: Issue): number {
  return Math.round(Math.min(96, 46 + issue.stats.entries * 6));
}

/** Immersive mode: the pulled-out cover tilts toward the pointer like a sheet of coated paper. */
function tilt(e: PointerEvent<HTMLAnchorElement>): void {
  const r = e.currentTarget.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width;
  const y = (e.clientY - r.top) / r.height;
  e.currentTarget.style.setProperty('--ry', String((x - 0.5) * 22));
  e.currentTarget.style.setProperty('--rx', String((0.5 - y) * 14));
  e.currentTarget.style.setProperty('--mx', `${x * 100}%`);
  e.currentTarget.style.setProperty('--my', `${y * 100}%`);
}
function untilt(e: PointerEvent<HTMLAnchorElement>): void {
  for (const k of ['--ry', '--rx', '--mx', '--my']) e.currentTarget.style.removeProperty(k);
}

function Spine({ issue, masthead, open }: { issue: Issue; masthead: string; open: boolean }) {
  const style = { '--spine-thickness': `${spineWidth(issue)}px` } as CSSProperties;
  const immersive = useImmersive();
  return (
    <li className={styles.slot} style={style}>
      <Link
        to={paths.issue(issue.key)}
        className={styles.spine}
        data-ink={issue.ink}
        data-open={open || undefined}
        data-tilt={immersive || undefined}
        {...(immersive ? { onPointerMove: tilt, onPointerLeave: untilt } : {})}
      >
        <span className="visually-hidden">
          No. {issue.number}, {formatWeekRange(issue.weekStart, issue.weekEnd)}
          {issue.status === 'in-production' ? ' (proof)' : ''}: {issue.headline}
        </span>
        <span className={styles.face} aria-hidden="true">
          <span className={styles.faceNo}>
            Nº
            <br />
            {issue.number}
          </span>
          <span className={styles.faceTitle}>{issue.headline}</span>
          <span className={styles.faceMast}>{masthead}</span>
        </span>
        <span className={styles.cover} aria-hidden="true">
          <CoverArt issue={issue} masthead={masthead} decorative morph />
        </span>
      </Link>
    </li>
  );
}

export default function Shelf({ initialQuery }: { initialQuery: string }) {
  const { data, issues, findIssue } = useStore();
  const { navigate } = useRouter();
  // Inside ETERNALL, a strip of the People wall hangs above the shelf (docs/adr/0014).
  const ShelfExtras = useContext(ShelfExtrasContext);
  const [query, setQuery] = useState(initialQuery);
  const [section, setSection] = useState<Section | null>(null);
  const deferredQuery = useDeferredValue(query);
  useDocumentTitle('The Shelf');

  // Keep the URL shareable/back-button friendly without spamming history.
  useEffect(() => {
    const id = window.setTimeout(() => {
      // Only sync while the shelf still owns the URL; never drag the user back from a page they opened.
      if (window.location.pathname !== paths.shelf()) return;
      navigate(paths.shelf(query.trim()), { replace: true, transition: false });
    }, 300);
    return () => window.clearTimeout(id);
  }, [query, navigate]);

  const masthead = data.magazine?.title ?? '';
  const shelved = issues.filter((i) => i.entries.length > 0 || i.status === 'in-production');
  const latestPrinted = shelved.find((i) => i.status === 'published');
  const searching = deferredQuery.trim() !== '' || section !== null;
  // Ask for one extra result so we know whether to say "50+".
  const found = useMemo(
    () => (searching ? searchEntries(data.entries, deferredQuery, section, RESULT_LIMIT + 1) : []),
    [searching, data.entries, deferredQuery, section],
  );
  const hits = found.slice(0, RESULT_LIMIT);
  const truncated = found.length > RESULT_LIMIT;
  // Where each hit is printed: issue and page. Each issue is laid out at most once.
  const locations = useMemo(() => {
    const pagesByIssue = new Map<string, ReturnType<typeof layoutIssue>>();
    const out = new Map<string, { href: string; page: number | null }>();
    for (const hit of found) {
      const issue = findIssue(hit.issueKey);
      if (!issue) {
        out.set(hit.entry.id, { href: paths.edit(hit.entry.id), page: null });
        continue;
      }
      const pages = pagesByIssue.get(issue.key) ?? layoutIssue(issue);
      pagesByIssue.set(issue.key, pages);
      const page = pageOf(pages, hit.entry.id);
      out.set(hit.entry.id, { href: paths.issue(issue.key, page), page });
    }
    return out;
  }, [found, findIssue]);

  const first = data.entries.reduce<string | null>((min, e) => (min === null || e.createdAt < min ? e.createdAt : min), null);
  const printed = issues.filter((i) => i.status === 'published' && i.entries.length > 0).length;

  return (
    <div className={styles.shelf}>
      {ShelfExtras && <ShelfExtras />}
      <header className={styles.head}>
        <h1 className={styles.title}>
          The <em>Shelf</em>
        </h1>
        <dl className={styles.facts}>
          <div>
            <dt>Issues printed</dt>
            <dd>{printed}</dd>
          </div>
          <div>
            <dt>Words</dt>
            <dd>{totalWords(data.entries).toLocaleString()}</dd>
          </div>
          {first && (
            <div>
              <dt>Since</dt>
              <dd>{formatMonthYear(new Date(first))}</dd>
            </div>
          )}
        </dl>
      </header>

      <div className={styles.tools} role="search">
        <label className={styles.search}>
          <span className={styles.searchLabel}>Index</span>
          <input
            id="shelf-search"
            type="search"
            value={query}
            placeholder="look something up…"
            autoComplete="off"
            spellCheck={false}
            maxLength={120}
            aria-label="Search every issue"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && query) {
                e.stopPropagation();
                setQuery('');
              }
            }}
          />
          {query && (
            <button type="button" className={ui.iconBtn} aria-label="Clear search" onClick={() => setQuery('')}>
              <Icon name="close" size={18} />
            </button>
          )}
        </label>
        <div className={styles.filters} role="group" aria-label="Filter by section">
          <button type="button" className={styles.filter} aria-pressed={section === null} onClick={() => setSection(null)}>
            All
          </button>
          {SECTIONS.map((s) => (
            <button key={s} type="button" className={styles.filter} aria-pressed={section === s} onClick={() => setSection(section === s ? null : s)}>
              {SECTION_INFO[s].label}
            </button>
          ))}
        </div>
      </div>

      {searching ? (
        <section className={styles.index} aria-live="polite" aria-label="Search results">
          <p className={styles.resultCount}>
            {hits.length === 0 ? 'No matches' : `${hits.length}${truncated ? '+' : ''} ${hits.length === 1 ? 'entry' : 'entries'}`}
            {deferredQuery.trim() && <> for “{deferredQuery.trim()}”</>}
            {section && <> in {SECTION_INFO[section].label}</>}
          </p>
          {hits.length === 0 ? (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>Nothing on file.</p>
              <p className={styles.emptyText}>Try a different word, or clear the section filter. The index covers every headline, note, quote and list.</p>
            </div>
          ) : (
            <ol className={styles.entries}>
              {hits.map((hit) => {
                const issue = findIssue(hit.issueKey);
                const loc = locations.get(hit.entry.id);
                return (
                  <li key={hit.entry.id}>
                    <Link to={loc?.href ?? paths.edit(hit.entry.id)} className={styles.entry}>
                      <span className={styles.entryLine}>
                        <span className={styles.entryTitle}>
                          <Highlighted text={entryHeadline(hit.entry)} query={deferredQuery} />
                        </span>
                        <span className={styles.leader} aria-hidden="true" />
                        <span className={styles.entryRef}>
                          No.&nbsp;{issue?.number ?? '—'}
                          {loc?.page ? `, p. ${loc.page}` : ''}
                        </span>
                      </span>
                      <span className={styles.entryMeta}>
                        {KIND_INFO[hit.entry.kind].label} · {SECTION_INFO[hit.entry.section].label} · {formatDayMonth(new Date(hit.entry.createdAt))}
                      </span>
                      {(hit.entry.kind === 'story' || hit.entry.kind === 'list') && (
                        <span className={styles.entrySnippet}>
                          <Highlighted text={hit.snippet} query={deferredQuery} />
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      ) : data.entries.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>An empty shelf, for now.</p>
          <p className={styles.emptyText}>Every Sunday at midnight, the week’s issue lands here, spine out. File your first piece and watch it take shape on the desk.</p>
          <Link to={paths.write('note')} className={`${ui.btn} ${ui.dark}`}>
            File your first piece
          </Link>
        </div>
      ) : (
        <section aria-label="Issues">
          <p className={styles.hint} aria-hidden="true">
            Spines are as thick as the week was full. Hover or focus to pull an issue out.
          </p>
          <ul className={styles.stack}>
            {shelved.map((issue) => (
              <Spine key={issue.key} issue={issue} masthead={masthead} open={issue === latestPrinted} />
            ))}
          </ul>
          <div className={styles.plank} aria-hidden="true" />
        </section>
      )}
    </div>
  );
}
