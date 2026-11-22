import { CoverArt } from '../../components/CoverArt';
import { Icon } from '../../components/Icon';
import { SECTION_INFO } from '../../domain/catalog';
import { coverLineFor } from '../../domain/issues';
import { flatplan, layoutIssue } from '../../domain/layout';
import type { FlatplanSlot, Page } from '../../domain/layout';
import type { Issue } from '../../domain/types';
import { Link, paths } from '../../router/router';
import styles from './Desk.module.css';

const PLANNED_COPY: Record<Extract<FlatplanSlot, { status: 'planned' }>['kind'], { label: string; prompt: string }> = {
  contents: { label: 'Contents', prompt: 'Sets itself once copy arrives' },
  feature: { label: 'Feature', prompt: 'A story goes here' },
  dispatches: { label: 'Dispatches', prompt: 'Notes & lists go here' },
  overheard: { label: 'Overheard', prompt: 'A quote goes here' },
  numbers: { label: 'By the numbers', prompt: 'Charts itself from your week' },
};

function describe(page: Page): { label: string; title: string } {
  switch (page.kind) {
    case 'cover':
      return { label: 'Cover', title: '' };
    case 'contents':
      return { label: 'Contents', title: 'Inside this issue' };
    case 'feature':
      return { label: SECTION_INFO[page.entry.section].department, title: page.entry.title };
    case 'dispatches': {
      const first = page.lists[0] ?? page.notes[0];
      return { label: 'Dispatches', title: first ? coverLineFor(first) : '' };
    }
    case 'overheard':
      return { label: 'Overheard', title: page.quotes[0] ? `“${page.quotes[0].body}”` : '' };
    case 'numbers':
      return { label: 'By the numbers', title: 'The week in data' };
    case 'back':
      return { label: 'Back page', title: '' };
  }
}

function SlotView({ slot, issue, masthead }: { slot: FlatplanSlot; issue: Issue; masthead: string }) {
  if (slot.status === 'planned') {
    const copy = PLANNED_COPY[slot.kind];
    const inner = (
      <>
        <span className={styles.pageNo}>—</span>
        <span className={styles.pageLabel}>{copy.label}</span>
        <span className={styles.pagePrompt}>
          {slot.write && <Icon name="plus" size={14} />}
          {copy.prompt}
        </span>
      </>
    );
    return slot.write ? (
      <Link to={paths.write(slot.write)} className={styles.page} data-status="planned" data-actionable="true">
        {inner}
      </Link>
    ) : (
      <div className={styles.page} data-status="planned">
        {inner}
      </div>
    );
  }

  const { label, title } = describe(slot.page);
  return (
    <Link to={paths.issue(issue.key, slot.number)} className={styles.page} data-status="set" data-kind={slot.page.kind}>
      {slot.page.kind === 'cover' ? (
        <>
          <CoverArt issue={issue} masthead={masthead} decorative className={styles.pageCover} />
          <span className="visually-hidden">Page 1: Cover</span>
        </>
      ) : (
        <>
          <span className={styles.pageNo}>
            <span className="visually-hidden">Page </span>
            <span aria-hidden="true">p.</span>
            {slot.number}
            <span className="visually-hidden">:</span>
          </span>
          <span className={styles.pageLabel}>{label}</span>
          {title && <span className={styles.pageTitle}>{title}</span>}
          <span className={styles.pageLines} aria-hidden="true" />
        </>
      )}
    </Link>
  );
}

/**
 * The issue as an editor's flatplan: every page as a thumbnail, bound in spreads.
 * The cover sits alone on a right-hand page, as in print; empty sections are dashed slots
 * that open the composer.
 */
export function Flatplan({ issue, masthead }: { issue: Issue; masthead: string }) {
  const slots = flatplan(layoutIssue(issue));
  const [cover, ...rest] = slots;
  const spreads: FlatplanSlot[][] = [];
  for (let i = 0; i < rest.length; i += 2) spreads.push(rest.slice(i, i + 2));

  return (
    <ol className={styles.spreads} aria-label={`Flatplan for issue No. ${issue.number}`}>
      {cover && (
        <li className={`${styles.spread} ${styles.spreadSingle} reveal`}>
          <span className={styles.pageBlank} aria-hidden="true" />
          <SlotView slot={cover} issue={issue} masthead={masthead} />
        </li>
      )}
      {spreads.map((pair, i) => (
        <li key={i} className={`${styles.spread} reveal`}>
          {pair.map((slot, j) => (
            <SlotView key={j} slot={slot} issue={issue} masthead={masthead} />
          ))}
          {pair.length === 1 && <span className={styles.pageBlank} aria-hidden="true" />}
        </li>
      ))}
    </ol>
  );
}
