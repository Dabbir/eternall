import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { Dialog } from '../../components/Dialog';
import { Icon } from '../../components/Icon';
import { ThemeToggle, toggleTheme, visibleThemeSwitch } from '../../components/ThemeToggle';
import { useTheme } from '../../lib/theme';
import ui from '../../components/ui.module.css';
import { formatWeekRange } from '../../domain/dates';
import { contentsFor, layoutIssue } from '../../domain/layout';
import type { Page } from '../../domain/layout';
import { Link, paths, useRouter } from '../../router/router';
import { useDocumentTitle, useHotkeys } from '../../state/hooks';
import { useNow } from '../../state/now';
import { useStore } from '../../state/store';
import { NotFound } from '../NotFound';
import { CoverEditor } from './CoverEditor';
import { PageView } from './Pages';
import type { PageContext } from './Pages';
import styles from './Reader.module.css';
import { useEmbedded } from '../../imprint/embedded';

function pageLabel(page: Page): string {
  switch (page.kind) {
    case 'cover':
      return 'Cover';
    case 'contents':
      return 'Contents';
    case 'feature':
      return page.entry.title;
    case 'dispatches':
      return page.parts > 1 ? `Dispatches (${page.part}/${page.parts})` : 'Dispatches';
    case 'overheard':
      return page.parts > 1 ? `Overheard (${page.part}/${page.parts})` : 'Overheard';
    case 'numbers':
      return 'By the numbers';
    case 'back':
      return 'Back page';
  }
}

const SWIPE_MIN = 60;

export default function Reader({ issueKey, page }: { issueKey: string; page: number }) {
  const { findIssue, issues, data } = useStore();
  const now = useNow();
  const issue = findIssue(issueKey);
  if (!issue) {
    return (
      <div className={styles.missing}>
        <NotFound title="This issue never went to print." text="Nothing was filed that week, so there’s no issue to read." />
      </div>
    );
  }
  const idx = issues.indexOf(issue);
  return (
    <ReaderView
      issue={issue}
      page={page}
      masthead={data.magazine?.title ?? 'Amazeen'}
      editor={data.magazine?.editor || 'The Editor'}
      previous={issues.slice(idx + 1).find((i) => i.entries.length > 0)}
      next={issues
        .slice(0, idx)
        .toReversed()
        .find((i) => i.entries.length > 0 || i.status === 'in-production')}
      now={now}
    />
  );
}

interface ViewProps {
  issue: PageContext['issue'];
  page: number;
  masthead: string;
  editor: string;
  previous: PageContext['previous'];
  next: PageContext['next'];
  now: Date;
}

function ReaderView({ issue, page, masthead, editor, previous, next, now }: ViewProps) {
  const { navigate, back } = useRouter();
  const pages = useMemo(() => layoutIssue(issue), [issue]);
  const contents = useMemo(() => contentsFor(issue, pages), [issue, pages]);
  const index = Math.min(Math.max(page, 1), pages.length) - 1;
  const current = pages[index] ?? pages[0];
  // Remember the last page shown to pick the page-turn direction (state derived during render, not a ref).
  const [turn, setTurn] = useState({ index, direction: 'forward' as 'forward' | 'back' });
  if (turn.index !== index) setTurn({ index, direction: index > turn.index ? 'forward' : 'back' });
  const direction = turn.direction;
  const [editing, setEditing] = useState(false);
  const [jumping, setJumping] = useState(false);
  const { theme } = useTheme();
  const embedded = useEmbedded();
  const swipe = useRef<{ x: number; y: number } | null>(null);

  useDocumentTitle(`No. ${issue.number} · ${issue.headline}`);


  // Normalise out-of-range page numbers in the URL.
  useEffect(() => {
    if (page !== index + 1) navigate(paths.issue(issue.key, index + 1), { replace: true, transition: false });
  }, [page, index, issue.key, navigate]);

  const go = (n: number): void => {
    const target = Math.min(Math.max(n, 1), pages.length);
    if (target !== index + 1) navigate(paths.issue(issue.key, target), { replace: true, transition: false });
  };
  const close = (): void => back(paths.desk());

  useHotkeys({
    ArrowRight: () => go(index + 2),
    ArrowLeft: () => go(index),
    Home: () => go(1),
    End: () => go(pages.length),
    Escape: close,
    g: () => setJumping(true),
    // Inside ETERNALL the house owns the theme (docs/adr/0013), so there is no switch here.
    t: () => {
      if (!embedded) toggleTheme(theme, visibleThemeSwitch());
    },
  });

  const onPointerDown = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse') return;
    swipe.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: PointerEvent): void => {
    const start = swipe.current;
    swipe.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > SWIPE_MIN && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? index + 2 : index);
  };

  const ctx: PageContext = { issue, masthead, editor, contents, totalPages: pages.length, previous, next, now, go };

  return (
    <div className={styles.reader}>
      <header className={styles.chrome}>
        <Link to={paths.desk()} className={ui.iconBtn} aria-label="Close the issue" onClick={(e) => { e.preventDefault(); close(); }}>
          <Icon name="close" size={20} />
        </Link>
        <div className={styles.chromeTitle}>
          <span className={styles.chromeMast}>{masthead}</span>
          <span className={styles.chromeMeta}>
            No. {issue.number} · {formatWeekRange(issue.weekStart, issue.weekEnd)}
            {issue.status === 'in-production' && <span className={styles.proofTag}>Proof</span>}
          </span>
        </div>
        <div className={styles.chromeActions}>
          {!embedded && <ThemeToggle size="small" />}
          <button type="button" className={`${ui.btn} ${ui.quiet} ${ui.small}`} onClick={() => setJumping(true)} aria-label="All pages" aria-keyshortcuts="G">
            <Icon name="book" size={16} />
            <span className={styles.hideSm}>Pages</span>
          </button>
          <button type="button" className={`${ui.btn} ${ui.quiet} ${ui.small}`} onClick={() => setEditing(true)} aria-label="Edit cover">
            <Icon name="palette" size={16} />
            <span className={styles.hideSm}>Cover</span>
          </button>
          <button type="button" className={`${ui.btn} ${ui.quiet} ${ui.small}`} onClick={() => window.print()} disabled={issue.entries.length === 0} aria-label="Print this issue">
            <Icon name="print" size={16} />
            <span className={styles.hideSm}>Print</span>
          </button>
        </div>
      </header>

      <div className={styles.stage} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => (swipe.current = null)}>
        <button type="button" className={`${styles.turn} ${styles.turnPrev}`} onClick={() => go(index)} disabled={index === 0} aria-label="Previous page">
          <Icon name="left" size={26} />
        </button>

        <div
          key={index}
          className={styles.pageSlot}
          data-direction={direction}
          data-kind={current?.kind}
          // Scrollable regions must be focusable so keyboard users can scroll long pages (axe: scrollable-region-focusable).
          // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
          role="region"
          aria-label={`Page ${index + 1}${current ? `: ${pageLabel(current)}` : ''}`}
        >
          {current && <PageView page={current} n={index + 1} ctx={ctx} />}
        </div>

        <button
          type="button"
          className={`${styles.turn} ${styles.turnNext}`}
          onClick={() => go(index + 2)}
          disabled={index === pages.length - 1}
          aria-label="Next page"
        >
          <Icon name="right" size={26} />
        </button>
      </div>

      <nav className={styles.rail} aria-label="Pages">
        <ol className={styles.railList}>
          {pages.map((p, i) => (
            <li key={i}>
              <button
                type="button"
                className={styles.railDot}
                aria-current={i === index ? 'page' : undefined}
                aria-label={`Page ${i + 1}: ${pageLabel(p)}`}
                title={pageLabel(p)}
                data-kind={p.kind}
                onClick={() => go(i + 1)}
              />
            </li>
          ))}
        </ol>
        <span className={styles.railCount} aria-hidden="true">
          {index + 1} / {pages.length}
        </span>
      </nav>

      <p className="visually-hidden" aria-live="polite">
        Page {index + 1} of {pages.length}: {current ? pageLabel(current) : ''}
      </p>

      {/* Every page, stacked, for printing. Hidden on screen. */}
      <div className={styles.printStack} aria-hidden="true">
        {pages.map((p, i) => (
          <div key={i} className={styles.printPage} data-kind={p.kind}>
            <PageView page={p} n={i + 1} ctx={{ ...ctx, print: true }} />
          </div>
        ))}
      </div>

      {editing && <CoverEditor issue={issue} onClose={() => setEditing(false)} />}
      <Dialog open={jumping} onClose={() => setJumping(false)} title={`No. ${issue.number}, page by page`}>
        <ol className={styles.jumpGrid}>
          {pages.map((p, i) => (
            <li key={i}>
              <button
                type="button"
                className={styles.jumpPage}
                data-kind={p.kind}
                aria-current={i === index ? 'page' : undefined}
                onClick={() => {
                  setJumping(false);
                  go(i + 1);
                }}
              >
                <span className={styles.jumpNo}>p.{i + 1}</span>
                <span className={styles.jumpLabel}>{pageLabel(p)}</span>
              </button>
            </li>
          ))}
        </ol>
      </Dialog>
    </div>
  );
}
