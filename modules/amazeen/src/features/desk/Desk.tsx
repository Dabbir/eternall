import { CoverArt } from '../../components/CoverArt';
import { Icon } from '../../components/Icon';
import { useToast } from '../../components/Toast';
import { KIND_INFO } from '../../domain/catalog';
import { formatDayMonth, formatWeekRange, formatWeekday, startOfDay, timeUntil } from '../../domain/dates';
import { pressCheck, totalWords } from '../../domain/issues';
import type { Entry } from '../../domain/types';
import { Link, paths } from '../../router/router';
import { useDocumentTitle } from '../../state/hooks';
import { useNow } from '../../state/now';
import { useStore } from '../../state/store';
import { BackupReminder } from './BackupReminder';
import { EntryRow } from './EntryRow';
import { Flatplan } from './Flatplan';
import { QuickJot } from './QuickJot';
import styles from './Desk.module.css';
import { createElement, useContext } from 'react';
import { DeskExtrasContext } from '../../imprint/embedded';

function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 5) return 'Burning the midnight oil';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function groupByDay(entries: readonly Entry[]): { day: Date; entries: Entry[] }[] {
  const map = new Map<number, Entry[]>();
  for (const e of entries) {
    const key = startOfDay(new Date(e.createdAt)).getTime();
    map.set(key, [...(map.get(key) ?? []), e]);
  }
  return [...map.entries()]
    .toSorted(([a], [b]) => b - a)
    .map(([key, list]) => ({ day: new Date(key), entries: list.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt)) }));
}

export function Desk() {
  const Extras = useContext(DeskExtrasContext);
  const store = useStore();
  const { data, current, issues, streak } = store;
  const now = useNow();
  const toast = useToast();
  useDocumentTitle('Desk');

  const masthead = data.magazine?.title ?? 'Amazeen';
  const checks = pressCheck(current);
  const done = checks.filter((c) => c.done).length;
  const ready = done === checks.length;
  const empty = current.entries.length === 0;
  const latest = issues.find((i) => i.status === 'published' && i.entries.length > 0);
  const published = issues.filter((i) => i.status === 'published' && i.entries.length > 0).length;
  const editorFirst = data.magazine?.editor.split(' ')[0] ?? '';
  const days = groupByDay(current.entries);
  const coverHint = empty ? 'See the blank proof' : 'Preview the proof';

  const onDelete = (entry: Entry): void => {
    const removed = store.deleteEntry(entry.id);
    if (!removed) return;
    toast.push({
      message: `Pulled from No. ${current.number}.`,
      action: { label: 'Undo', onAction: () => store.addEntry(removed) },
      duration: 7000,
    });
  };

  return (
    <div className={styles.desk}>
      <BackupReminder />
      {Extras ? createElement(Extras) : null}

      {/* ── Front matter: the week's issue, set as an opening spread ── */}
      <section className={styles.front} aria-labelledby="desk-heading">
        <div className={styles.frontCopy}>
          <p className={styles.dateline}>
            <span>
              {formatWeekday(now)}, {formatDayMonth(now)}
            </span>
            <span aria-hidden="true">/</span>
            <span>{formatWeekRange(current.weekStart, current.weekEnd)}</span>
            <span aria-hidden="true">/</span>
            <span className={styles.deadline}>to press in {timeUntil(current.weekEnd, now)}</span>
          </p>

          <div className={styles.headlineWrap}>
            <span className={styles.bigNumber} aria-hidden="true">
              <span className={styles.bigNo}>Nº</span>
              {current.number}
            </span>
            <h1 id="desk-heading" className={styles.headline}>
              <span className={styles.greeting}>
                {greeting(now)}
                {editorFirst && editorFirst !== 'The' ? `, ${editorFirst}` : ''}.
              </span>{' '}
              Issue No.&nbsp;{current.number} is{' '}
              {empty ? (
                <>
                  <em>blank pages.</em> Let’s fix that.
                </>
              ) : ready ? (
                <em>ready for print.</em>
              ) : (
                <em>taking shape.</em>
              )}
            </h1>
          </div>

          <QuickJot />

          <nav className={styles.writeLinks} aria-label="File a longer piece">
            <span className={styles.writeLead}>or file a</span>
            {(['story', 'quote', 'list'] as const).map((kind, i) => (
              <Link key={kind} to={paths.write(kind)} className={styles.writeLink}>
                {KIND_INFO[kind].label.toLowerCase()}
                {i < 2 && <span aria-hidden="true">,</span>}
              </Link>
            ))}
            <span className={styles.shortcuts} aria-hidden="true">
              <kbd>W</kbd> <kbd>N</kbd> <kbd>/</kbd>
            </span>
          </nav>

          <div className={styles.notes}>
            <h2 id="press-check" className={styles.notesTitle}>
              Production notes <span className={styles.notesCount}>{done}/{checks.length}</span>
            </h2>
            <div
              className={styles.meter}
              role="progressbar"
              aria-label="Issue completeness"
              aria-valuemin={0}
              aria-valuemax={checks.length}
              aria-valuenow={done}
            >
              {checks.map((c) => (
                <span key={c.id} data-done={c.done} />
              ))}
            </div>
            <ul className={styles.noteList} aria-labelledby="press-check">
              {checks.map((c) => (
                <li key={c.id} data-done={c.done}>
                  <span className={styles.mark} aria-hidden="true">
                    {c.done ? '✓' : '○'}
                  </span>
                  <span>
                    <span className={styles.noteLabel}>
                      {c.label}
                      <span className="visually-hidden">{c.done ? ' (done)' : ' (to do)'}</span>
                    </span>
                    {!c.done && <span className={styles.noteHint}>{c.hint}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside className={styles.proof} aria-label="This week's proof">
          <Link to={paths.issue(current.key)} className={styles.proofCover}>
            <CoverArt issue={current} masthead={masthead} morph decorative />
            <span className={styles.proofHint}>
              {coverHint}
              <span className="visually-hidden">
                : Issue No. {current.number}, {current.headline}
              </span>{' '}
              <span aria-hidden="true">→</span>
            </span>
          </Link>

        </aside>
      </section>

      {/* ── Flatplan ── */}
      <section className={styles.flatplan} aria-labelledby="flatplan-heading">
        <header className={styles.sectionHead}>
          <h2 id="flatplan-heading" className={styles.sectionTitle}>
            The flatplan
          </h2>
          <p className="annot">Pages set themselves as you file. Dashed pages are still waiting for copy.</p>
        </header>
        <Flatplan issue={current} masthead={masthead} />
      </section>

      {/* ── Galley: this week's pieces ── */}
      <section className={styles.galley} aria-labelledby="filed-heading">
        <header className={styles.sectionHead}>
          <h2 id="filed-heading" className={styles.sectionTitle}>
            Galley
          </h2>
          <p className={styles.sectionMeta}>
            {current.stats.entries} {current.stats.entries === 1 ? 'piece' : 'pieces'} · {current.stats.words.toLocaleString()} words
          </p>
        </header>

        {days.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>Nothing filed yet.</p>
            <p className={styles.emptyText}>
              The galley is where this week’s pieces queue for the press. A note takes thirty seconds: type one into the jot line above.
            </p>
          </div>
        ) : (
          <ol className={styles.days}>
            {days.map(({ day, entries }) => (
              <li key={day.getTime()} className={`${styles.day} reveal-x`}>
                <div className={styles.dayLabel}>
                  <span className={styles.dayName}>{formatWeekday(day)}</span>
                  <span className={styles.dayDate}>{formatDayMonth(day)}</span>
                </div>
                <ul className={styles.dayEntries}>
                  {entries.map((entry) => (
                    <EntryRow
                      key={entry.id}
                      entry={entry}
                      isCover={entry.id === current.coverStory?.id}
                      onToggleStar={() => store.toggleStar(entry.id)}
                      onDelete={() => onDelete(entry)}
                    />
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* ── Circulation: the long view ── */}
      <section className={`${styles.circulation} reveal`} aria-label="Circulation">
        <dl className={styles.stats}>
          <div>
            <dt>Week streak</dt>
            <dd className="numeral">{streak}</dd>
          </div>
          <div>
            <dt>Issues printed</dt>
            <dd className="numeral">{published}</dd>
          </div>
          <div>
            <dt>Total words</dt>
            <dd className="numeral">{totalWords(data.entries).toLocaleString()}</dd>
          </div>
        </dl>
        {latest && (
          <Link to={paths.issue(latest.key)} className={styles.latest}>
            <span className={styles.latestCover} aria-hidden="true">
              <CoverArt issue={latest} masthead={masthead} decorative />
            </span>
            <span className={styles.latestText}>
              <span className="kicker">Fresh off the press · No. {latest.number}</span>
              <span className={styles.latestTitle}>{latest.headline}</span>
              <span className={styles.latestRead}>
                Read the issue <Icon name="right" size={16} />
              </span>
            </span>
          </Link>
        )}
      </section>
    </div>
  );
}
