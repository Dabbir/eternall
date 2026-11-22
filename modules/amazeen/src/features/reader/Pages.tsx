import { CoverArt } from '../../components/CoverArt';
import { WeatherIcon } from '../../components/Icon';
import ui from '../../components/ui.module.css';
import { MOOD_INFO, SECTION_INFO } from '../../domain/catalog';
import { addDays, formatTime, formatWeekRange, formatWeekday, formatWeekdayShort, timeUntil } from '../../domain/dates';
import type { ContentsItem, Page } from '../../domain/layout';
import { entryWords, paragraphs, pullQuote, readingMinutes, sentences, smartQuotes } from '../../domain/text';
import type { Issue, ListEntry, NoteEntry, QuoteEntry, StoryEntry } from '../../domain/types';
import { Link, paths } from '../../router/router';
import styles from './Reader.module.css';

export interface PageContext {
  issue: Issue;
  masthead: string;
  editor: string;
  contents: ContentsItem[];
  totalPages: number;
  previous: Issue | undefined;
  next: Issue | undefined;
  now: Date;
  go: (page: number) => void;
  /** True for the copy rendered in the print stack (no interactive affordances, no view-transition names). */
  print?: boolean;
}

function Folio({ ctx, n, label }: { ctx: PageContext; n: number; label: string }) {
  return (
    <footer className={styles.folio}>
      <span>{ctx.masthead}</span>
      <span>{label}</span>
      <span>
        No. {ctx.issue.number} · p. {n}
      </span>
    </footer>
  );
}

export function PageView({ page, n, ctx }: { page: Page; n: number; ctx: PageContext }) {
  switch (page.kind) {
    case 'cover':
      return <CoverPage ctx={ctx} />;
    case 'contents':
      return <ContentsPage ctx={ctx} n={n} />;
    case 'feature':
      return <FeaturePage ctx={ctx} n={n} entry={page.entry} isCover={page.isCoverStory} />;
    case 'dispatches':
      return <DispatchesPage ctx={ctx} n={n} notes={page.notes} lists={page.lists} part={page.part} parts={page.parts} />;
    case 'overheard':
      return <OverheardPage ctx={ctx} n={n} quotes={page.quotes} />;
    case 'numbers':
      return <NumbersPage ctx={ctx} n={n} />;
    case 'back':
      return <BackPage ctx={ctx} />;
  }
}

function CoverPage({ ctx }: { ctx: PageContext }) {
  return (
    <div className={styles.coverPage}>
      <h1 className="visually-hidden">
        {ctx.masthead}, issue {ctx.issue.number}: {ctx.issue.headline}
      </h1>
      <CoverArt issue={ctx.issue} masthead={ctx.masthead} morph={!ctx.print} />
    </div>
  );
}

function ContentsPage({ ctx, n }: { ctx: PageContext; n: number }) {
  const { issue } = ctx;
  return (
    <div className={styles.sheet}>
      <div className={styles.contents}>
        <header className={styles.contentsHead}>
          <p className="kicker">Inside this issue</p>
          <h2 className={styles.contentsTitle}>Contents</h2>
          <p className={styles.contentsMeta}>
            Vol. {issue.volume}, No. {issue.number}
            <br />
            {formatWeekRange(issue.weekStart, issue.weekEnd)}
          </p>
          <p className={styles.editorsNote}>
            {issue.stats.entries} pieces, {issue.stats.words.toLocaleString()} words, filed across {issue.stats.daysWritten}{' '}
            {issue.stats.daysWritten === 1 ? 'day' : 'days'}
            {issue.stats.mood ? `. Prevailing weather: ${MOOD_INFO[issue.stats.mood].label.toLowerCase()}.` : '.'}
          </p>
        </header>
        <ol className={styles.toc}>
          {ctx.contents.map((item) => (
            <li key={item.page}>
              <button type="button" className={styles.tocItem} onClick={() => ctx.go(item.page)} tabIndex={ctx.print ? -1 : undefined}>
                <span className={styles.tocPage}>{String(item.page).padStart(2, '0')}</span>
                <span className={styles.tocBody}>
                  <span className={styles.tocDept}>
                    {item.department}
                    {item.isCoverStory && <span className={styles.tocCover}>Cover</span>}
                  </span>
                  <span className={styles.tocTitle}>{item.title}</span>
                  <span className={styles.tocMeta}>{item.meta}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>
      <Folio ctx={ctx} n={n} label="Contents" />
    </div>
  );
}

function FeaturePage({ ctx, n, entry, isCover }: { ctx: PageContext; n: number; entry: StoryEntry; isCover: boolean }) {
  const paras = paragraphs(entry.body);
  const quote = pullQuote(entry.body);
  const filed = new Date(entry.createdAt);
  const mins = readingMinutes(entryWords(entry));
  // A single-sentence opening paragraph is promoted to the standfirst rather than repeated.
  const opener = paras[0] ?? '';
  const standfirst = paras.length > 2 && sentences(opener).length === 1 && opener.length <= 220 ? opener : null;
  const bodyParas = standfirst ? paras.slice(1) : paras;

  return (
    <article className={styles.sheet}>
      <div className={styles.feature}>
        <header className={styles.featureHead}>
          <p className={styles.featureKicker}>
            {isCover && <span className={styles.coverBadge}>Cover story</span>}
            <span>{SECTION_INFO[entry.section].department}</span>
            <span aria-hidden="true">/</span>
            <span>{mins} min read</span>
          </p>
          <h2 className={styles.featureTitle}>{entry.title}</h2>
          {standfirst && <p className={styles.standfirst}>{smartQuotes(standfirst)}</p>}
          <p className={styles.byline}>
            <span>
              By <strong>{ctx.editor}</strong>
            </span>
            <span>
              {formatWeekday(filed)}, {formatTime(filed)}
            </span>
            <span className={styles.bylineWeather}>
              <WeatherIcon mood={entry.mood} size={16} /> {MOOD_INFO[entry.mood].label}
            </span>
          </p>
        </header>
        <div className={styles.featureBody}>
          {bodyParas.map((p, i) => (
            <FeatureParagraph key={i} text={p} index={i} quote={i === 1 ? quote : null} last={i === bodyParas.length - 1} />
          ))}
        </div>
      </div>
      <Folio ctx={ctx} n={n} label={SECTION_INFO[entry.section].label} />
    </article>
  );
}

function FeatureParagraph({ text, index, quote, last }: { text: string; index: number; quote: string | null; last: boolean }) {
  return (
    <>
      <p className={index === 0 ? styles.dropCap : undefined}>
        {smartQuotes(text).split('\n').map((line, i, all) => (
          <span key={i}>
            {line}
            {i < all.length - 1 && <br />}
          </span>
        ))}
        {last && <span className={styles.endMark} aria-hidden="true" />}
      </p>
      {quote && (
        <blockquote className={styles.pullQuote}>
          <p>{smartQuotes(quote)}</p>
        </blockquote>
      )}
    </>
  );
}

function DispatchesPage({ ctx, n, notes, lists, part, parts }: { ctx: PageContext; n: number; notes: NoteEntry[]; lists: ListEntry[]; part: number; parts: number }) {
  return (
    <div className={styles.sheet}>
      <div className={styles.dispatches}>
        <header className={styles.deptHead}>
          <h2 className={styles.deptTitle}>Dispatches</h2>
          <p className={styles.deptSub}>Notes and lists from the week{parts > 1 ? `, part ${part} of ${parts}` : ''}</p>
        </header>
        <div className={styles.dispatchGrid}>
          {lists.map((list) => (
            <section key={list.id} className={styles.listBox}>
              <p className={styles.dispatchMeta}>
                {SECTION_INFO[list.section].label} · {formatWeekdayShort(new Date(list.createdAt))}
              </p>
              <h3 className={styles.listTitle}>{list.title}</h3>
              <ol className={styles.listItems}>
                {list.items.map((item, i) => (
                  <li key={i}>
                    <span className={styles.listNum}>{i + 1}</span>
                    <span>{smartQuotes(item)}</span>
                  </li>
                ))}
              </ol>
            </section>
          ))}
          {notes.map((note) => {
            const at = new Date(note.createdAt);
            return (
              <section key={note.id} className={styles.note}>
                <p className={styles.dispatchMeta}>
                  <WeatherIcon mood={note.mood} size={15} />
                  {formatWeekday(at)} · {formatTime(at)}
                </p>
                <p className={styles.noteText}>{smartQuotes(note.body)}</p>
              </section>
            );
          })}
        </div>
      </div>
      <Folio ctx={ctx} n={n} label="Dispatches" />
    </div>
  );
}

function OverheardPage({ ctx, n, quotes }: { ctx: PageContext; n: number; quotes: QuoteEntry[] }) {
  return (
    <div className={`${styles.sheet} ${styles.overheardSheet}`} data-ink={ctx.issue.ink}>
      <div className={styles.overheard}>
        <header className={styles.deptHead}>
          <h2 className={styles.deptTitle}>Overheard</h2>
          <p className={styles.deptSub}>Things people said this week</p>
        </header>
        <div className={styles.quotes}>
          {quotes.map((q) => (
            <figure key={q.id} className={styles.quote}>
              <blockquote>
                <p>{smartQuotes(q.body)}</p>
              </blockquote>
              <figcaption>— {q.attribution || 'Anonymous'}</figcaption>
            </figure>
          ))}
        </div>
      </div>
      <Folio ctx={ctx} n={n} label="Overheard" />
    </div>
  );
}

function NumbersPage({ ctx, n }: { ctx: PageContext; n: number }) {
  const { stats } = ctx.issue;
  const prev = ctx.previous?.stats;
  const delta = prev ? stats.words - prev.words : null;
  const maxSection = Math.max(1, ...stats.sections.map((s) => s.count));
  const figures = [
    { value: stats.words.toLocaleString(), label: 'words written', note: delta === null ? 'First issue on record' : `${delta >= 0 ? '+' : '−'}${Math.abs(delta).toLocaleString()} vs. last issue` },
    { value: String(stats.entries), label: stats.entries === 1 ? 'piece filed' : 'pieces filed', note: `${stats.sections.length} ${stats.sections.length === 1 ? 'section' : 'sections'} covered` },
    { value: `${stats.daysWritten}/7`, label: 'days on the beat', note: stats.daysWritten >= 5 ? 'A proper daily' : stats.daysWritten >= 3 ? 'Steady rhythm' : 'Room to grow' },
    { value: String(stats.readingMinutes), label: stats.readingMinutes === 1 ? 'minute to read' : 'minutes to read', note: 'At an easy pace' },
  ];

  return (
    <div className={styles.sheet}>
      <div className={styles.numbers}>
        <header className={styles.deptHead}>
          <h2 className={styles.deptTitle}>By the numbers</h2>
          <p className={styles.deptSub}>The week in data</p>
        </header>

        <dl className={styles.figures}>
          {figures.map((f) => (
            <div key={f.label} className={styles.figure}>
              <dd className={styles.figureValue}>{f.value}</dd>
              <dt className={styles.figureLabel}>{f.label}</dt>
              <dd className={styles.figureNote}>{f.note}</dd>
            </div>
          ))}
        </dl>

        <div className={styles.dataRow}>
          <section className={styles.weather} aria-labelledby={`wx-${ctx.issue.key}`}>
            <h3 id={`wx-${ctx.issue.key}`} className={styles.dataTitle}>
              Weather report
            </h3>
            {stats.mood && <p className={styles.forecast}>{MOOD_INFO[stats.mood].forecast}</p>}
            <ol className={styles.days}>
              {stats.moodByDay.map((mood, i) => {
                const day = addDays(ctx.issue.weekStart, i);
                const rounded = mood === null ? null : (Math.round(mood) as 1 | 2 | 3 | 4 | 5);
                return (
                  <li key={i} className={styles.dayCol} data-empty={rounded === null || undefined}>
                    <span className={styles.dayBarTrack} aria-hidden="true">
                      <span className={styles.dayBar} style={{ height: `${rounded ? rounded * 20 : 4}%` }} />
                    </span>
                    <span className={styles.dayIcon}>{rounded ? <WeatherIcon mood={rounded} size={22} /> : <span className={styles.dayDash}>—</span>}</span>
                    <span className={styles.dayName}>{formatWeekdayShort(day)}</span>
                    <span className="visually-hidden">: {rounded ? MOOD_INFO[rounded].label : 'nothing filed'}</span>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className={styles.sections} aria-labelledby={`sx-${ctx.issue.key}`}>
            <h3 id={`sx-${ctx.issue.key}`} className={styles.dataTitle}>
              Pieces by section
            </h3>
            <ul className={styles.sectionBars}>
              {stats.sections.map((s) => (
                <li key={s.section}>
                  <span className={styles.sectionName}>{SECTION_INFO[s.section].label}</span>
                  <span className={styles.sectionTrack} aria-hidden="true">
                    <span style={{ width: `${(s.count / maxSection) * 100}%` }} />
                  </span>
                  <span className={styles.sectionCount}>{s.count}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
      <Folio ctx={ctx} n={n} label="Data" />
    </div>
  );
}

function BackPage({ ctx }: { ctx: PageContext }) {
  const { issue, previous, next } = ctx;
  const inProduction = issue.status === 'in-production';
  return (
    <div className={`${styles.sheet} ${styles.backSheet}`} data-ink={issue.ink}>
      <div className={styles.back}>
        <p className="kicker">{inProduction ? 'Still on the press' : 'That’s the issue'}</p>
        <h2 className={styles.backTitle}>
          {inProduction ? (
            <>
              Goes to press in <em>{timeUntil(issue.weekEnd, ctx.now)}.</em>
            </>
          ) : issue.entries.length === 0 ? (
            <>
              No copy, <em>no issue.</em>
            </>
          ) : (
            <>
              Thanks for <em>reading.</em>
            </>
          )}
        </h2>
        <p className={styles.backText}>
          {inProduction
            ? 'Everything you file before Sunday at midnight makes it into this issue. The layout updates as you write.'
            : 'Every week you write, AMAZEEN prints another issue. Small weeks make good issues too.'}
        </p>
        {!ctx.print && (
          <div className={styles.backActions}>
            {inProduction ? (
              <Link to={paths.write('story')} className={`${ui.btn} ${ui.primary}`}>
                File another piece
              </Link>
            ) : next ? (
              <Link to={paths.issue(next.key)} className={`${ui.btn} ${ui.dark}`}>
                Next: No. {next.number} →
              </Link>
            ) : null}
            {previous && (
              <Link to={paths.issue(previous.key)} className={ui.btn}>
                ← Previous: No. {previous.number}
              </Link>
            )}
            <Link to={paths.shelf()} className={`${ui.btn} ${ui.quiet}`}>
              Back to the shelf
            </Link>
          </div>
        )}
        <p className={styles.colophon}>
          {ctx.masthead} is written by {ctx.editor} and printed in a web browser. Set in Fraunces &amp; Newsreader. Circulation: one.
        </p>
      </div>
    </div>
  );
}
