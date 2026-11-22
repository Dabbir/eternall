import type { CSSProperties } from 'react';
import { MOOD_INFO, SECTION_INFO } from '../domain/catalog';
import { formatWeekRange, toRoman } from '../domain/dates';
import type { Issue } from '../domain/types';
import { WeatherIcon } from './Icon';
import styles from './CoverArt.module.css';

interface CoverArtProps {
  issue: Issue;
  masthead: string;
  /** Applies a view-transition-name so the cover morphs between screens. Only one on-screen element per issue may set this. */
  morph?: boolean;
  /** Hide the content from assistive tech when a parent provides a label (e.g. thumbnails). */
  decorative?: boolean;
  className?: string | undefined;
}

/** Masthead sized so it spans the cover width regardless of title length. */
function mastheadSize(title: string): string {
  const len = Math.max(title.length, 4);
  return `${Math.min(24, 86 / (len * 0.66))}cqi`;
}

function headlineSize(headline: string): string {
  const len = headline.length;
  if (len <= 14) return '15.5cqi';
  if (len <= 24) return '12.5cqi';
  if (len <= 40) return '10cqi';
  if (len <= 60) return '8.2cqi';
  return '7cqi';
}

/**
 * A riso-printed magazine cover rendered entirely in CSS. Scales with its container
 * (all measurements are in container-query units), so it works from shelf thumbnail to full page.
 */
export function CoverArt({ issue, masthead, morph = false, decorative = false, className }: CoverArtProps) {
  const { stats, coverStory } = issue;
  const style = {
    '--masthead-size': mastheadSize(masthead),
    '--headline-size': headlineSize(issue.headline),
    viewTransitionName: morph ? `cover-${issue.key}` : undefined,
  } as CSSProperties;
  const empty = issue.entries.length === 0;
  const kicker = empty
    ? 'Awaiting copy'
    : coverStory
      ? `Cover story · ${SECTION_INFO[coverStory.section].department}`
      : 'This week';

  return (
    <div className={`${styles.frame} ${className ?? ''}`}>
      <article className={styles.cover} data-ink={issue.ink} style={style} aria-hidden={decorative || undefined} data-legible={decorative ? undefined : ''}>
        <div className={styles.halftone} aria-hidden="true" />
        <div className={styles.numeral} aria-hidden="true">
          {issue.number}
        </div>

        <header className={styles.masthead}>
          <div className={styles.title}>{masthead}</div>
          <div className={styles.meta}>
            <span>Vol. {toRoman(issue.volume)}</span>
            <span>No. {issue.number}</span>
            <span className={styles.metaRange}>{formatWeekRange(issue.weekStart, issue.weekEnd)}</span>
            {stats.mood && (
              <span className={styles.weather}>
                <WeatherIcon mood={stats.mood} size={14} className={styles.weatherIcon} />
                {MOOD_INFO[stats.mood].label}
              </span>
            )}
          </div>
        </header>

        {issue.coverLines.length > 0 && (
          <ul className={styles.lines}>
            {issue.coverLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}

        <div className={styles.lead}>
          <p className={styles.kicker}>{kicker}</p>
          <h2 className={styles.headline}>{issue.headline}</h2>
          {empty && <p className={styles.emptyNote}>Every issue starts like this.</p>}
        </div>

        <footer className={styles.foot}>
          <div className={styles.barcode} aria-hidden="true" />
          <div className={styles.footText}>
            <span>{stats.entries} {stats.entries === 1 ? 'piece' : 'pieces'}</span>
            <span>{stats.words.toLocaleString()} words</span>
          </div>
        </footer>

        {issue.status === 'in-production' && (
          <div className={styles.stamp} aria-hidden="true">
            Proof
          </div>
        )}
      </article>
    </div>
  );
}
